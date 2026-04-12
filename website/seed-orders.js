/**
 * Seed script — Populates the database with realistic sample orders
 * Run: node seed-orders.js
 */

const { initDatabase, computePriority } = require('./database');

const db = initDatabase();
console.log('✅ Database connected');

// Check existing orders
const existing = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
if (existing > 0) {
  console.log(`⚠️  Database already has ${existing} orders. Clearing them first...`);
  db.exec('DELETE FROM orders');
  db.exec("UPDATE sqlite_sequence SET seq = 1000 WHERE name = 'orders'");
}

// Realistic sample orders — spread across locations, statuses, and time
const sampleOrders = [
  // ── Pending orders (active, waiting for processing) ──
  { itemName: '2x Macbook Pro M3', location: 2,  urgency: 9,  value: 2499.00, deadline: 30,  status: 'Pending',   minutesAgo: 5   },
  { itemName: 'Monthly Groceries', location: 4,  urgency: 7,  value: 899.50,  deadline: 45,  status: 'Pending',   minutesAgo: 12  },
  { itemName: 'Sony A7IV Camera', location: 7,  urgency: 10, value: 4599.00, deadline: 20,  status: 'Pending',   minutesAgo: 3   },
  { itemName: 'Nike Running Shoes', location: 1,  urgency: 5,  value: 349.99,  deadline: 60,  status: 'Pending',   minutesAgo: 25  },
  { itemName: 'Office Chair', location: 6,  urgency: 8,  value: 1799.00, deadline: 35,  status: 'Pending',   minutesAgo: 8   },
  { itemName: 'Birthday Cake', location: 3,  urgency: 6,  value: 649.00,  deadline: 50,  status: 'Pending',   minutesAgo: 18  },
  { itemName: '2x Pizza Large', location: 11, urgency: 4,  value: 199.99,  deadline: 90,  status: 'Pending',   minutesAgo: 40  },
  { itemName: 'Smart TV 55"', location: 9,  urgency: 8,  value: 3200.00, deadline: 25,  status: 'Pending',   minutesAgo: 7   },
  { itemName: 'Protein Powder', location: 5,  urgency: 3,  value: 450.00,  deadline: 120, status: 'Pending',   minutesAgo: 55  },
  { itemName: 'Mechanical Keyboard', location: 10, urgency: 7,  value: 1250.00, deadline: 40,  status: 'Pending',   minutesAgo: 15  },

  // ── Processed orders (already dispatched) ──
  { itemName: 'Medical Supplies', location: 1,  urgency: 9,  value: 5999.00, deadline: 15,  status: 'Processed', minutesAgo: 120 },
  { itemName: 'Gaming Monitor', location: 8,  urgency: 7,  value: 1499.00, deadline: 30,  status: 'Processed', minutesAgo: 95  },
  { itemName: 'Books Bundle', location: 2,  urgency: 6,  value: 799.00,  deadline: 45,  status: 'Processed', minutesAgo: 180 },
  { itemName: 'Apple Watch', location: 10, urgency: 8,  value: 2350.00, deadline: 20,  status: 'Processed', minutesAgo: 150 },
  { itemName: 'Skincare Kit', location: 5,  urgency: 5,  value: 550.00,  deadline: 60,  status: 'Processed', minutesAgo: 200 },
  { itemName: 'Engagement Ring', location: 4,  urgency: 10, value: 8999.00, deadline: 10,  status: 'Processed', minutesAgo: 60  },
  { itemName: 'Home Decor', location: 7,  urgency: 6,  value: 725.00,  deadline: 50,  status: 'Processed', minutesAgo: 240 },
  { itemName: 'Coffee Machine', location: 3,  urgency: 8,  value: 3100.00, deadline: 25,  status: 'Processed', minutesAgo: 300 },

  // ── Canceled orders ──
  { itemName: 'Airpods Pro', location: 6,  urgency: 4,  value: 299.00,  deadline: 90,  status: 'Canceled',  minutesAgo: 160 },
  { itemName: 'Stationery Items', location: 11, urgency: 3,  value: 150.00,  deadline: 120, status: 'Canceled',  minutesAgo: 220 },
  { itemName: 'Water Purifier Filter', location: 9,  urgency: 5,  value: 480.00,  deadline: 75,  status: 'Canceled',  minutesAgo: 190 },

  // ── More pending (high priority / urgent) ──
  { itemName: 'Emergency Generator parts', location: 8,  urgency: 10, value: 7500.00, deadline: 15,  status: 'Pending',   minutesAgo: 2   },
  { itemName: 'Legal Documents', location: 5,  urgency: 9,  value: 3800.00, deadline: 20,  status: 'Pending',   minutesAgo: 4   },
  { itemName: 'Printer Ink Cartridges', location: 10, urgency: 6,  value: 999.00,  deadline: 55,  status: 'Pending',   minutesAgo: 30  },
  { itemName: 'Air Purifier', location: 3,  urgency: 7,  value: 1650.00, deadline: 40,  status: 'Pending',   minutesAgo: 10  },
];

// Insert orders
const insertStmt = db.prepare(
  `INSERT INTO orders (location, locationName, itemName, urgency, value, deadline, priority, status, created_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
);

const insertAll = db.transaction(() => {
  for (const order of sampleOrders) {
    const loc = db.prepare('SELECT name FROM locations WHERE id = ?').get(order.location);
    const locationName = loc ? loc.name : `Zone ${order.location}`;
    const priority = computePriority(db, order);
    const timeOffset = `-${order.minutesAgo} minutes`;

    insertStmt.run(
      order.location,
      locationName,
      order.itemName,
      order.urgency,
      order.value,
      order.deadline,
      priority,
      order.status,
      timeOffset
    );
  }
});

insertAll();

// Print summary
const total     = db.prepare('SELECT COUNT(*) as cnt FROM orders').get().cnt;
const pending   = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Pending'").get().cnt;
const processed = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Processed'").get().cnt;
const canceled  = db.prepare("SELECT COUNT(*) as cnt FROM orders WHERE status = 'Canceled'").get().cnt;

console.log('\n📦 Sample orders seeded successfully!');
console.log(`   Total:     ${total}`);
console.log(`   Pending:   ${pending}`);
console.log(`   Processed: ${processed}`);
console.log(`   Canceled:  ${canceled}`);
console.log('\n🔄 Restart your server to see the changes.\n');
