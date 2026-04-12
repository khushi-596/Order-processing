const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase, dijkstra, computePriority } = require('./database');

const app = express();
const PORT = 3000;

// Initialize database
const db = initDatabase();
console.log('✅ Database initialized');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── API ROUTES ────────────────────────────────────────────

// GET /api/stats — Dashboard statistics
app.get('/api/stats', (req, res) => {
  const total     = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
  const pending   = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Pending'").get().cnt;
  const processed = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Processed'").get().cnt;
  const canceled  = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Canceled'").get().cnt;
  const totalValue = db.prepare('SELECT COALESCE(SUM(value), 0) as total FROM orders').get().total;
  const avgPriority = db.prepare("SELECT COALESCE(AVG(priority), 0) as avg FROM orders WHERE status = 'Pending'").get().avg;

  const recentOrders = db.prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT 5').all();
  const locationStats = db.prepare(`
    SELECT locationName, COUNT(*) as count 
    FROM orders 
    GROUP BY locationName 
    ORDER BY count DESC
  `).all();

  res.json({
    total, pending, processed, canceled,
    totalValue: Math.round(totalValue * 100) / 100,
    avgPriority: Math.round(avgPriority * 100) / 100,
    recentOrders,
    locationStats
  });
});

// GET /api/orders — List all orders
app.get('/api/orders', (req, res) => {
  const { status, search } = req.query;
  let query = 'SELECT * FROM orders';
  const params = [];
  const conditions = [];

  if (status && status !== 'all') {
    conditions.push('status = ?');
    params.push(status);
  }
  if (search) {
    conditions.push('(orderID LIKE ? OR locationName LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY created_at DESC';

  const orders = db.prepare(query).all(...params);
  res.json(orders);
});

// GET /api/orders/:id — Search order by ID
app.get('/api/orders/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE orderID = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: `Order ${req.params.id} not found` });
  }
  // Get route info
  const { dist } = dijkstra(db, 0);
  const routeTime = dist[order.location];
  res.json({ ...order, routeTime });
});

// POST /api/orders — Add new order
app.post('/api/orders', (req, res) => {
  const { location, urgency, value, deadline } = req.body;

  // Validation (mirrors C++ validation)
  if (!location || location < 1 || location > 11) {
    return res.status(400).json({ error: 'Invalid location! Must be between 1 and 11.' });
  }
  if (!urgency || urgency < 1 || urgency > 10) {
    return res.status(400).json({ error: 'Invalid urgency! Must be between 1 and 10.' });
  }
  if (!value || value <= 0) {
    return res.status(400).json({ error: 'Invalid order value! Must be greater than 0.' });
  }
  if (!deadline || deadline <= 0) {
    return res.status(400).json({ error: 'Invalid deadline! Must be greater than 0 minutes.' });
  }

  // Get location name
  const loc = db.prepare('SELECT name FROM locations WHERE id = ?').get(location);
  if (!loc) {
    return res.status(400).json({ error: 'Location not found.' });
  }

  // Compute priority
  const priority = computePriority(db, { location, urgency, value, deadline });

  // Insert order
  const result = db.prepare(
    'INSERT INTO orders (location, locationName, urgency, value, deadline, priority, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(location, loc.name, urgency, value, deadline, priority, 'Pending');

  const newOrder = db.prepare('SELECT * FROM orders WHERE orderID = ?').get(result.lastInsertRowid);
  res.status(201).json(newOrder);
});

// PATCH /api/orders/:id/cancel — Cancel an order
app.patch('/api/orders/:id/cancel', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE orderID = ?').get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: `Order ${req.params.id} not found!` });
  }
  if (order.status === 'Canceled') {
    return res.status(400).json({ error: `Order ${req.params.id} is already canceled.` });
  }
  if (order.status === 'Processed') {
    return res.status(400).json({ error: `Order ${req.params.id} has already been processed and cannot be canceled.` });
  }

  db.prepare("UPDATE orders SET status = 'Canceled' WHERE orderID = ?").run(req.params.id);
  const updated = db.prepare('SELECT * FROM orders WHERE orderID = ?').get(req.params.id);
  res.json(updated);
});

// POST /api/orders/process — Process highest-priority pending order
app.post('/api/orders/process', (req, res) => {
  const topOrder = db.prepare(
    "SELECT * FROM orders WHERE status = 'Pending' ORDER BY priority DESC LIMIT 1"
  ).get();

  if (!topOrder) {
    return res.status(404).json({ error: 'No pending orders to process.' });
  }

  // Mark as processed
  db.prepare("UPDATE orders SET status = 'Processed' WHERE orderID = ?").run(topOrder.orderID);

  // Get route info
  const { dist, prev } = dijkstra(db, 0);
  const shortestTime = dist[topOrder.location];

  // Build path
  const pathNodes = [];
  let current = topOrder.location;
  while (current !== -1) {
    const locName = db.prepare('SELECT name FROM locations WHERE id = ?').get(current);
    pathNodes.unshift({ id: current, name: locName ? locName.name : `Zone ${current}` });
    current = prev[current];
  }

  const updatedOrder = db.prepare('SELECT * FROM orders WHERE orderID = ?').get(topOrder.orderID);

  res.json({
    order: updatedOrder,
    route: {
      time: shortestTime,
      path: pathNodes
    }
  });
});

// GET /api/graph — Get delivery network
app.get('/api/graph', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY id').all();
  const edges = db.prepare('SELECT * FROM edges').all();
  res.json({ locations, edges });
});

// GET /api/graph/route/:location — Get shortest route to a zone
app.get('/api/graph/route/:location', (req, res) => {
  const location = parseInt(req.params.location);
  if (isNaN(location) || location < 0 || location > 11) {
    return res.status(400).json({ error: 'Invalid location' });
  }

  const { dist, prev } = dijkstra(db, 0);

  // Build path
  const pathNodes = [];
  let current = location;
  while (current !== -1) {
    const locName = db.prepare('SELECT name FROM locations WHERE id = ?').get(current);
    pathNodes.unshift({ id: current, name: locName ? locName.name : `Zone ${current}` });
    current = prev[current];
  }

  res.json({
    destination: location,
    time: dist[location],
    path: pathNodes
  });
});

// GET /api/locations — Get all locations
app.get('/api/locations', (req, res) => {
  const locations = db.prepare('SELECT * FROM locations WHERE id > 0 ORDER BY id').all();
  res.json(locations);
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📦 Order Processing & Delivery Routing System`);
});
