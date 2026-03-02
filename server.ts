import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("wifi_manager.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS packages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    package_id INTEGER,
    join_date TEXT NOT NULL,
    FOREIGN KEY (package_id) REFERENCES packages(id)
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Default Settings if not exists
const defaultSettings = [
  { key: "sesi_1_start", value: "1" }, { key: "sesi_1_end", value: "5" },
  { key: "sesi_2_start", value: "6" }, { key: "sesi_2_end", value: "10" },
  { key: "sesi_3_start", value: "11" }, { key: "sesi_3_end", value: "15" },
  { key: "sesi_4_start", value: "16" }, { key: "sesi_4_end", value: "20" },
  { key: "sesi_5_start", value: "21" }, { key: "sesi_5_end", value: "25" },
  { key: "sesi_6_start", value: "26" }, { key: "sesi_6_end", value: "31" }
];

const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
defaultSettings.forEach(s => insertSetting.run(s.key, s.value));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Packages
  app.get("/api/packages", (req, res) => {
    const packages = db.prepare("SELECT * FROM packages").all();
    res.json(packages);
  });

  app.post("/api/packages", (req, res) => {
    const { name, price } = req.body;
    const info = db.prepare("INSERT INTO packages (name, price) VALUES (?, ?)").run(name, price);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/packages/:id", (req, res) => {
    const { name, price } = req.body;
    db.prepare("UPDATE packages SET name = ?, price = ? WHERE id = ?").run(name, price, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/packages/:id", (req, res) => {
    db.prepare("DELETE FROM packages WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Clients
  app.get("/api/clients", (req, res) => {
    const clients = db.prepare(`
      SELECT clients.*, packages.name as package_name, packages.price as package_price
      FROM clients 
      LEFT JOIN packages ON clients.package_id = packages.id
    `).all();
    res.json(clients);
  });

  app.post("/api/clients", (req, res) => {
    const { name, package_id, join_date } = req.body;
    const info = db.prepare("INSERT INTO clients (name, package_id, join_date) VALUES (?, ?, ?)").run(name, package_id, join_date);
    res.json({ id: info.lastInsertRowid });
  });

  app.put("/api/clients/:id", (req, res) => {
    const { name, package_id, join_date } = req.body;
    db.prepare("UPDATE clients SET name = ?, package_id = ?, join_date = ? WHERE id = ?").run(name, package_id, join_date, req.params.id);
    res.json({ success: true });
  });

  app.delete("/api/clients/:id", (req, res) => {
    db.prepare("DELETE FROM clients WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Settings
  app.get("/api/settings", (req, res) => {
    const settings = db.prepare("SELECT * FROM settings").all();
    const settingsObj = settings.reduce((acc: any, curr: any) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
    res.json(settingsObj);
  });

  app.post("/api/settings", (req, res) => {
    const updates = req.body;
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    const transaction = db.transaction((data) => {
      for (const [key, value] of Object.entries(data)) {
        stmt.run(key, value);
      }
    });
    transaction(updates);
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
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
