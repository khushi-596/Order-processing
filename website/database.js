const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'orders.db');

function initDatabase() {
  const db = new Database(DB_PATH);

  // Enable WAL mode for better performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS locations (
      id        INTEGER PRIMARY KEY,
      name      TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS edges (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      source    INTEGER NOT NULL,
      dest      INTEGER NOT NULL,
      weight    INTEGER NOT NULL,
      FOREIGN KEY (source) REFERENCES locations(id),
      FOREIGN KEY (dest)   REFERENCES locations(id)
    );

    CREATE TABLE IF NOT EXISTS orders (
      orderID       INTEGER PRIMARY KEY AUTOINCREMENT,
      location      INTEGER NOT NULL,
      locationName  TEXT NOT NULL,
      urgency       INTEGER NOT NULL,
      value         REAL NOT NULL,
      deadline      INTEGER NOT NULL,
      priority      REAL NOT NULL DEFAULT 0,
      status        TEXT NOT NULL DEFAULT 'Pending',
      created_at    TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (location) REFERENCES locations(id)
    );
  `);

  // Seed locations if empty
  const locationCount = db.prepare('SELECT COUNT(*) as cnt FROM locations').get().cnt;
  if (locationCount === 0) {
    const insertLoc = db.prepare('INSERT INTO locations (id, name) VALUES (?, ?)');
    const locations = [
      [0,  'Central Warehouse'],
      [1,  'MG Road'],
      [2,  'Koramangala'],
      [3,  'Whitefield'],
      [4,  'Indiranagar'],
      [5,  'Jayanagar'],
      [6,  'Electronic City'],
      [7,  'HSR Layout'],
      [8,  'Marathahalli'],
      [9,  'Rajajinagar'],
      [10, 'Hebbal'],
      [11, 'Banashankari']
    ];
    const seedLocations = db.transaction(() => {
      for (const [id, name] of locations) {
        insertLoc.run(id, name);
      }
    });
    seedLocations();
  }

  // Seed edges if empty
  const edgeCount = db.prepare('SELECT COUNT(*) as cnt FROM edges').get().cnt;
  if (edgeCount === 0) {
    const insertEdge = db.prepare('INSERT INTO edges (source, dest, weight) VALUES (?, ?, ?)');
    const edges = [
      [0, 1,  10],  // Warehouse ↔ MG Road
      [0, 9,  12],  // Warehouse ↔ Rajajinagar
      [0, 10,  8],  // Warehouse ↔ Hebbal
      [1, 4,   7],  // MG Road ↔ Indiranagar
      [1, 2,  12],  // MG Road ↔ Koramangala
      [1, 9,  14],  // MG Road ↔ Rajajinagar
      [2, 5,   9],  // Koramangala ↔ Jayanagar
      [2, 7,   6],  // Koramangala ↔ HSR Layout
      [3, 8,   8],  // Whitefield ↔ Marathahalli
      [3, 10, 18],  // Whitefield ↔ Hebbal
      [4, 8,  10],  // Indiranagar ↔ Marathahalli
      [4, 2,  11],  // Indiranagar ↔ Koramangala
      [5, 11,  7],  // Jayanagar ↔ Banashankari
      [5, 7,  10],  // Jayanagar ↔ HSR Layout
      [6, 7,   9],  // Electronic City ↔ HSR Layout
      [6, 11, 15],  // Electronic City ↔ Banashankari
      [8, 10, 14],  // Marathahalli ↔ Hebbal
      [9, 11, 11]   // Rajajinagar ↔ Banashankari
    ];
    const seedEdges = db.transaction(() => {
      for (const [s, d, w] of edges) {
        insertEdge.run(s, d, w);
      }
    });
    seedEdges();
  }

  // Set autoincrement starting at 1001 if no orders exist
  const orderCount = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
  if (orderCount === 0) {
    // Insert and delete a dummy to create sqlite_sequence, then update it
    db.exec(`INSERT INTO orders (location, locationName, urgency, value, deadline, priority, status) VALUES (1, 'init', 1, 1, 1, 0, 'init')`);
    db.exec(`DELETE FROM orders`);
    db.exec(`UPDATE sqlite_sequence SET seq = 1000 WHERE name = 'orders'`);
  }

  return db;
}

// Dijkstra implementation (mirrors C++ version)
function dijkstra(db, source) {
  const locations = db.prepare('SELECT id FROM locations').all();
  const V = locations.length;
  const edges = db.prepare('SELECT source, dest, weight FROM edges').all();

  // Build adjacency list
  const adj = {};
  for (let i = 0; i < V; i++) adj[i] = [];
  for (const e of edges) {
    adj[e.source].push({ dest: e.dest, weight: e.weight });
    adj[e.dest].push({ dest: e.source, weight: e.weight });
  }

  const INF = Number.MAX_SAFE_INTEGER;
  const dist = new Array(V).fill(INF);
  const visited = new Array(V).fill(false);
  const prev = new Array(V).fill(-1);
  dist[source] = 0;

  // Simple priority queue using array (small graph)
  const pq = [{ dist: 0, vertex: source }];

  while (pq.length > 0) {
    // Extract min
    pq.sort((a, b) => a.dist - b.dist);
    const { vertex: u } = pq.shift();

    if (visited[u]) continue;
    visited[u] = true;

    for (const neighbor of adj[u]) {
      const v = neighbor.dest;
      const w = neighbor.weight;
      if (!visited[v] && dist[u] + w < dist[v]) {
        dist[v] = dist[u] + w;
        prev[v] = u;
        pq.push({ dist: dist[v], vertex: v });
      }
    }
  }

  return { dist, prev };
}

// Compute priority (mirrors C++ formula)
function computePriority(db, order) {
  const { dist } = dijkstra(db, 0);
  const graphDistance = dist[order.location] || 0;

  const urgencyScore    = order.urgency  * 5.0;
  const valueScore      = order.value    * 2.0;
  const deadlineScore   = order.deadline * 3.0;
  const distancePenalty = graphDistance   * 1.0;

  return urgencyScore + valueScore + deadlineScore - distancePenalty;
}

module.exports = { initDatabase, dijkstra, computePriority };
