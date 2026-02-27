import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("milk_tracker.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT UNIQUE,
    quantity REAL,
    rate REAL
  );
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    amount REAL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Set default settings if not exists
const stmt = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
stmt.run("default_rate", "60");
stmt.run("theme", "dark");
stmt.run("pin", "2580"); // Default PIN
db.prepare("UPDATE settings SET value = '2580' WHERE key = 'pin' AND value = '1234'").run();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/entries", (req, res) => {
    const { month } = req.query; // YYYY-MM
    const entries = db.prepare("SELECT * FROM entries WHERE date LIKE ? ORDER BY date ASC").all(`${month}%`);
    res.json(entries);
  });

  app.post("/api/entries", (req, res) => {
    const { date, quantity, rate } = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO entries (date, quantity, rate) VALUES (?, ?, ?)");
    stmt.run(date, quantity, rate);
    res.json({ success: true });
  });

  app.get("/api/payments", (req, res) => {
    const { month } = req.query;
    const payments = db.prepare("SELECT * FROM payments WHERE date LIKE ? ORDER BY date ASC").all(`${month}%`);
    res.json(payments);
  });

  app.post("/api/payments", (req, res) => {
    const { date, amount } = req.body;
    const stmt = db.prepare("INSERT INTO payments (date, amount) VALUES (?, ?)");
    stmt.run(date, amount);
    res.json({ success: true });
  });

  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const config = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(config);
  });

  app.post("/api/settings", (req, res) => {
    const settings = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    
    db.transaction(() => {
      for (const [key, value] of Object.entries(settings)) {
        stmt.run(key, value?.toString());
      }
    })();
    
    res.json({ success: true });
  });

  app.delete("/api/entries/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM entries WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.delete("/api/payments/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM payments WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.put("/api/entries/:id", (req, res) => {
    const { id } = req.params;
    const { date, quantity, rate } = req.body;
    db.prepare("UPDATE entries SET date = ?, quantity = ?, rate = ? WHERE id = ?").run(date, quantity, rate, id);
    res.json({ success: true });
  });

  app.put("/api/payments/:id", (req, res) => {
    const { id } = req.params;
    const { date, amount } = req.body;
    db.prepare("UPDATE payments SET date = ?, amount = ? WHERE id = ?").run(date, amount, id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
