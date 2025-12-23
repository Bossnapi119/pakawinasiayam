import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import sqlite3 from "sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import os from "os";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========== MULTER SETUP ==========
const uploadDir = path.join(__dirname, "public", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const sanitizedName = `${Date.now()}${ext}`.toLowerCase();
    cb(null, sanitizedName);
  },
});

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// ========== HELPER: DELETE FILE ==========
function deleteFile(filePath) {
  if (!filePath) return;
  const fullPath = path.join(__dirname, "public", filePath.replace(/^\//, ""));
  if (fs.existsSync(fullPath)) {
    try { fs.unlinkSync(fullPath); } 
    catch (err) { console.error("Failed to delete file:", err); }
  }
}

const PORT = process.env.PORT || 4000;
const DB_PATH = path.join(__dirname, "data.sqlite");

// ========== APP SETUP ==========
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // ✅ Required for ToyyibPay Webhook
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));

// ========== SECURITY: RATE LIMITER ==========
// Factory function to create custom rate limiters
const createRateLimiter = (windowMs, max, message) => {
  const requests = new Map();
  
  // Cleanup every hour to prevent memory leaks
  setInterval(() => requests.clear(), 60 * 60 * 1000);

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const record = requests.get(ip) || { count: 0, startTime: now };

    if (now - record.startTime > windowMs) {
      record.count = 1;
      record.startTime = now;
    } else {
      record.count++;
    }
    requests.set(ip, record);
    
    if (record.count > max) {
      return res.status(429).json({ error: message });
    }
    next();
  };
};

// 1. Global Limiter: 300 requests per 15 minutes (General API use)
app.use(createRateLimiter(15 * 60 * 1000, 300, "Too many requests, please try again later."));

// 2. Strict Limiter for Logins: 5 requests per 1 minute (Prevent Brute Force)
const loginLimiter = createRateLimiter(60 * 1000, 5, "Too many login attempts. Please wait 1 minute.");
app.use("/api/admin/login", loginLimiter);
app.use("/api/kitchen/login", loginLimiter);
app.use("/api/developer/login", loginLimiter);

// ========== DATABASE SETUP ==========
sqlite3.verbose();
const db = new sqlite3.Database(DB_PATH);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });

const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

// ========== INIT DATABASE ==========
async function initDb() {
  // ✅ PERFORMANCE: Enable WAL mode for higher concurrency (Read + Write at same time)
  await run("PRAGMA journal_mode = WAL;");
  // ✅ STABILITY: Wait up to 5000ms if DB is busy instead of crashing immediately
  await run("PRAGMA busy_timeout = 5000;");

  await run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customerName TEXT,
      customerPhone TEXT,
      customerEmail TEXT,
      tableNumber TEXT,
      specialRequest TEXT,
      orderType TEXT,
      total INTEGER, -- Changed from REAL to INTEGER for cents
      status TEXT CHECK(status IN ('NEW','PREPARING','READY','COMPLETED')) DEFAULT 'NEW',
      paymentStatus TEXT NOT NULL DEFAULT 'UNPAID',
      createdAt INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      orderId INTEGER NOT NULL,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price INTEGER NOT NULL, -- Price per item in cents
      FOREIGN KEY(orderId) REFERENCES orders(id) ON DELETE CASCADE
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS menu (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      price INTEGER,
      isActive INTEGER DEFAULT 1,
      image TEXT,
      createdAt INTEGER
    )
  `);

  await run(`
    CREATE TABLE IF NOT EXISTS site_config (
      id INTEGER PRIMARY KEY,
      brandName TEXT,
      dailySpecial TEXT,
      logoPath TEXT,
      landingPosterPath TEXT,
      address TEXT,
      phone TEXT,
      operatingHours TEXT
    )
  `);
  
  await run(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )
  `);

  const defaultAdminUser = process.env.ADMIN_USER || "admin";
  const defaultAdminPass = process.env.ADMIN_PASS || "admin123";
  const adminUser = await get(`SELECT * FROM admin_users WHERE username = ?`, [defaultAdminUser]);
  if (!adminUser) {
    const hashedPassword = await bcrypt.hash(
      defaultAdminPass,
      10
    );
    await run(`INSERT INTO admin_users (username, password) VALUES (?, ?)`, [defaultAdminUser, hashedPassword]);
  }

  // ✅ MIGRATION: Add columns if they are missing in an existing database
  try { await run("ALTER TABLE site_config ADD COLUMN address TEXT"); } catch (e) {}
  try { await run("ALTER TABLE site_config ADD COLUMN phone TEXT"); } catch (e) {}
  try { await run("ALTER TABLE site_config ADD COLUMN operatingHours TEXT"); } catch (e) {}
  try { await run("ALTER TABLE orders ADD COLUMN tableNumber TEXT"); } catch (e) {}
  try { await run("ALTER TABLE orders ADD COLUMN specialRequest TEXT"); } catch (e) {}

  // Insert default config if not exists
  const exists = await get("SELECT id FROM site_config LIMIT 1");
  if (!exists) {
    await run(
      "INSERT INTO site_config (id, brandName) VALUES (1, 'Pak Awi Nasi Ayam')"
    );
  }
}

// ========== AUTH MIDDLEWARE ==========
const JWT_SECRET = process.env.JWT_SECRET || "default_insecure_secret_for_dev";
const KITCHEN_PIN = process.env.KITCHEN_PIN || "1234";
const DEVELOPER_USER = process.env.DEVELOPER_USER || "dev";
const DEVELOPER_PASS = process.env.DEVELOPER_PASS || "dev123";

function requireAdmin(req, res, next) {
   const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token provided" });
  
  const token = auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "admin") return res.status(403).json({ error: "Forbidden: Not an admin" });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

function requireKitchen(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "No token provided" });

  const token = auth.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Invalid token format" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "kitchen" && decoded.role !== "admin") return res.status(403).json({ error: "Forbidden: Not authorized" });
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}

// ========== PUBLIC MENU ==========
app.get("/api/menu", async (req, res) => {
  try {
    const items = await all("SELECT * FROM menu WHERE isActive = 1");
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to load menu" });
  }
});

// ========== CREATE ORDER (CUSTOMER) ==========
app.post("/api/orders", async (req, res) => {
  try {
    const { customerName, customerPhone, customerEmail, tableNumber, specialRequest, orderType, items, total } =
      req.body;

    const orderResult = await run(
      `INSERT INTO orders (customerName, customerPhone, customerEmail, tableNumber, specialRequest, orderType, total, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [customerName, customerPhone, customerEmail, tableNumber, specialRequest, orderType, total, Date.now()]
    );

    const orderId = orderResult.lastID;

    for (const item of items) {
      await run(
        `INSERT INTO order_items (orderId, name, quantity, price)
           VALUES (?, ?, ?, ?)`,
        [orderId, item.name, item.quantity, item.price]
      );
    }

    res.json({ success: true, orderId });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ error: "Failed to create order" });
  }
});

// ========== GET ALL ORDERS ==========
app.get("/api/orders", requireAdmin, async (req, res) => {
  try {
    const { start, end } = req.query;
    let sql = "SELECT * FROM orders";
    const params = [];

    if (start && end) {
      sql += " WHERE createdAt >= ? AND createdAt <= ?";
      params.push(Number(start), Number(end));
    }

    sql += " ORDER BY createdAt DESC";

    const orders = await all(sql, params);
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await all(
          "SELECT name, quantity, price FROM order_items WHERE orderId = ?",
          [order.id]
        );
        return { 
          ...order, 
          items,
          totalCents: order.total, // ✅ Fix: Map DB 'total' to Frontend 'totalCents'
          orderNumber: order.id,   // ✅ Fix: Map ID to orderNumber
          id: String(order.id),    // ✅ Fix: Ensure ID is string
          createdAt: new Date(order.createdAt).toISOString() // ✅ Fix: Ensure date is ISO string
        };
      })
    );
    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// ========== ADMIN: CLEAR ALL ORDERS ==========
app.delete("/api/admin/orders", requireAdmin, async (req, res) => {
  try {
    await run("DELETE FROM order_items");
    await run("DELETE FROM orders");
    // Reset auto-increment counters (optional)
    await run("DELETE FROM sqlite_sequence WHERE name='orders'");
    await run("DELETE FROM sqlite_sequence WHERE name='order_items'");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to clear orders" });
  }
});

// ========== KITCHEN: GET ACTIVE ORDERS ==========
app.get("/api/kitchen/orders", requireKitchen, async (req, res) => {
  try {
    const orders = await all(
      "SELECT * FROM orders WHERE status IN ('NEW', 'PREPARING', 'READY', 'COMPLETED') ORDER BY createdAt ASC"
    );
    const ordersWithItems = await Promise.all(
      orders.map(async (order) => {
        const items = await all(
          "SELECT name, quantity FROM order_items WHERE orderId = ?",
          [order.id]
        );
        return { 
          ...order, 
          items,
          id: String(order.id) // ✅ Fix: Ensure ID is string for Kitchen Page
        };
      })
    );
    res.json(ordersWithItems);
  } catch (err) {
    res.status(500).json({ error: "Failed to load orders" });
  }
});

// ========== UPDATE ORDER STATUS ==========
app.patch("/api/orders/:id/status", requireKitchen, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await run("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update order" });
  }
});

// ========== ADMIN LOGIN ==========
app.post("/api/admin/login", async (req, res) => {
  const { username, password } = req.body;
  const admin = await get(`SELECT * FROM admin_users WHERE username = ?`, [username]);

  if (admin && (await bcrypt.compare(password, admin.password))) {
    const token = jwt.sign({ id: admin.id, role: "admin" }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: "Invalid credentials" });
  }
});

// ========== ADMIN: CHANGE PASSWORD ==========
app.post("/api/admin/change-password", requireAdmin, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const adminId = req.user.id;

    const admin = await get("SELECT * FROM admin_users WHERE id = ?", [adminId]);
    if (!admin) return res.status(404).json({ error: "Admin not found" });

    const match = await bcrypt.compare(currentPassword, admin.password);
    if (!match) return res.status(400).json({ error: "Incorrect current password" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await run("UPDATE admin_users SET password = ? WHERE id = ?", [hashedPassword, adminId]);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to change password" });
  }
});

// ========== KITCHEN LOGIN ==========
app.post("/api/kitchen/login", async (req, res) => {
  const { password } = req.body;
  if (password === KITCHEN_PIN) {
    const token = jwt.sign({ role: "kitchen" }, JWT_SECRET, { expiresIn: "8h" });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ error: "Invalid PIN" });
  }
});

// ========== DEVELOPER LOGIN ==========
app.post("/api/developer/login", (req, res) => {
  const { username, password } = req.body;

  if (username === DEVELOPER_USER && password === DEVELOPER_PASS) {
    const token = jwt.sign({ role: "developer" }, JWT_SECRET, { expiresIn: "2h" });
    res.json({ success: true, token });
  } else {
    res.status(401).json({ success: false, error: "Invalid developer credentials" });
  }
});

// ========== ADMIN: GET MENU ==========
app.get("/api/admin/menu", requireAdmin, async (req, res) => {
  try {
    const items = await all("SELECT * FROM menu ORDER BY category");
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: "Failed to load menu" });
  }
});

// ========== ADMIN: CREATE MENU ITEM ==========
app.post("/api/admin/menu", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const { name, description, category, price, isActive } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    await run(
      `INSERT INTO menu (name, description, category, price, isActive, image, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, category, parseInt(price), (isActive === "true" || isActive === "1") ? 1 : 0, image, Date.now()]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to create menu item" });
  }
});

// ========== ADMIN: UPDATE MENU ITEM ==========
app.put("/api/admin/menu/:id", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, price, isActive } = req.body;
    const image = req.file ? `/uploads/${req.file.filename}` : undefined;

    // ✅ Delete old image if new one is uploaded
    if (image) {
      const oldItem = await get("SELECT image FROM menu WHERE id = ?", [id]);
      if (oldItem && oldItem.image) deleteFile(oldItem.image);
    }

    let query =
      "UPDATE menu SET name=?, description=?, category=?, price=?, isActive=?";
    let params = [name, description, category, parseInt(price), (isActive === "true" || isActive === "1") ? 1 : 0];

    if (image) {
      query += ", image=?";
      params.push(image);
    }

    query += " WHERE id=?";
    params.push(id);

    await run(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update menu item" });
  }
});

// ========== ADMIN: DELETE MENU ITEM ==========
app.delete("/api/admin/menu/:id", requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // ✅ Delete image file before removing from DB
    const item = await get("SELECT image FROM menu WHERE id = ?", [id]);
    if (item && item.image) deleteFile(item.image);

    await run("DELETE FROM menu WHERE id=?", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});

// ========== PUBLIC: GET SITE CONFIG (NO AUTH REQUIRED) ==========
app.get("/api/public/site", async (req, res) => {
  try {
    const config = await get("SELECT * FROM site_config WHERE id=1");
    res.json(config || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load config" });
  }
});

// ========== ADMIN: GET SITE CONFIG ==========
app.get("/api/site", requireAdmin, async (req, res) => {
  try {
    res.set("Cache-Control", "no-store"); // Prevent browser caching
    const config = await get("SELECT * FROM site_config WHERE id=1");
    res.json(config || {});
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load config" });
  }
});

// ========== ADMIN: UPDATE SITE CONFIG ==========
app.put("/api/admin/site", requireAdmin, async (req, res) => {
  try {
    console.log("Updating site config:", req.body); // Debug log
    const { brandName, dailySpecial, address, phone, operatingHours } = req.body;
    await run(
      "UPDATE site_config SET brandName=?, dailySpecial=?, address=?, phone=?, operatingHours=? WHERE id=1",
      [brandName, dailySpecial, address, phone, operatingHours]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update config" });
  }
});

// ========== ADMIN: UPLOAD LOGO ==========
app.post("/api/admin/site/logo", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    // ✅ Delete old logo
    const config = await get("SELECT logoPath FROM site_config WHERE id=1");
    if (config && config.logoPath) deleteFile(config.logoPath);

    const logoPath = `/uploads/${req.file.filename}`;
    await run("UPDATE site_config SET logoPath=? WHERE id=1", [logoPath]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload logo" });
  }
});

// ========== ADMIN: UPLOAD POSTER ==========
app.post("/api/admin/site/poster", requireAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    
    // ✅ Delete old poster
    const config = await get("SELECT landingPosterPath FROM site_config WHERE id=1");
    if (config && config.landingPosterPath) deleteFile(config.landingPosterPath);

    const posterPath = `/uploads/${req.file.filename}`;
    await run("UPDATE site_config SET landingPosterPath=? WHERE id=1", [posterPath]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to upload poster" });
  }
});

// ========== PAYMENT GATEWAY INTEGRATION ==========
app.post("/api/payment/initiate", async (req, res) => {
  try {
    const { orderId, amount, customerName, customerEmail, customerPhone } = req.body;
    
    console.log(`Initiating payment for Order #${orderId} - RM ${(amount / 100).toFixed(2)}`);

    // 1. Check if TOYYIBPAY_SECRET is set (Mock mode if missing)
    if (!process.env.TOYYIBPAY_SECRET) {
       console.warn("ToyyibPay secret not set. Returning mock success.");
       
       // Auto-update DB to PAID for mock mode
       await run("UPDATE orders SET paymentStatus = 'PAID' WHERE id = ?", [orderId]);

       // Use request origin to ensure mobile testing works (redirects to correct IP)
       const frontendUrl = req.get('origin') || process.env.FRONTEND_URL || "http://localhost:5173";
       const mockUrl = `${frontendUrl}/payment/status?status_id=1&order_id=${orderId}&transaction_id=MOCK-${Date.now()}`;
       return res.json({ success: true, paymentUrl: mockUrl, message: "Payment initiated (Mock)" });
    }

    // 2. Prepare data for ToyyibPay
    const payload = new URLSearchParams({
      userSecretKey: process.env.TOYYIBPAY_SECRET,
      categoryCode: process.env.TOYYIBPAY_CATEGORY,
      billName: `Order #${orderId}`,
      billDescription: `Payment for order ${orderId}`,
      billPriceSetting: 1,
      billPayorInfo: 1,
      billAmount: amount, // Amount in cents
      billReturnUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment/status`,
      billCallbackUrl: `${process.env.BACKEND_URL || "http://localhost:4000"}/api/payment/webhook`,
      billExternalReferenceNo: orderId,
      billTo: customerName,
      billEmail: customerEmail || "noreply@example.com",
      billPhone: customerPhone || "0123456789"
    });

    // 3. Call ToyyibPay API
    const response = await fetch("https://dev.toyyibpay.com/index.php/api/createBill", {
      method: "POST",
      body: payload,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    const data = await response.json();

    if (data && data[0] && data[0].BillCode) {
      res.json({ 
        success: true, 
        paymentUrl: `https://dev.toyyibpay.com/${data[0].BillCode}` 
      });
    } else {
      console.error("ToyyibPay Error:", data);
      res.status(500).json({ error: "Failed to create bill with payment gateway" });
    }

  } catch (err) {
    console.error("Payment initiation failed:", err);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// ========== PAYMENT WEBHOOK (Optional) ==========
app.post("/api/payment/webhook", async (req, res) => {
  console.log("Webhook received:", req.body);
  
  // ToyyibPay sends data as x-www-form-urlencoded
  const { refno, status, reason } = req.body;

  // status '1' means success
  if (status === '1') {
    try {
      // refno corresponds to our orderId (billExternalReferenceNo)
      await run(
        "UPDATE orders SET paymentStatus = 'PAID' WHERE id = ?",
        [refno]
      );
      console.log(`✅ Order #${refno} marked as PAID via Webhook`);
    } catch (err) {
      console.error("Database update failed in webhook:", err);
    }
  } else {
    console.log(`❌ Payment failed/pending for Order #${refno}: ${reason}`);
  }

  // Always return success to ToyyibPay to stop retries
  res.send("OK");
});

// ========== SERVE FRONTEND (PRODUCTION) ==========
const frontendPath = path.join(__dirname, "dist");
app.use(express.static(frontendPath));
app.get("*", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// ========== START SERVER ==========
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ Backend running on http://localhost:${PORT}`);

    // Get LAN IP to help with mobile testing
    const interfaces = os.networkInterfaces();
    let lanIp = "localhost";
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === "IPv4" && !iface.internal) {
          lanIp = iface.address;
          break;
        }
      }
    }
    console.log(`📡 Network Access: http://${lanIp}:${PORT}`);

    console.log(`\n🔑 Initial Credentials (if not set in .env):`);
    console.log(`   Admin:     admin / admin123`);
    console.log(`   Developer: ${DEVELOPER_USER} / ${DEVELOPER_PASS}`);
    console.log(`   Kitchen:   ${KITCHEN_PIN}`);
  });
});
