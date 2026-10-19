
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: "http://localhost:5173"
}));

app.use(express.json());

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing from .env");
}

// Temporary test account
const users = [
  {
    id: 1,
    username: "admin",
    passwordHash: bcrypt.hashSync("Admin123!", 10),
    role: "admin"
  }
];

// Test backend
app.get("/", (req, res) => {
  res.send("Backend is working!");
});

// Login API
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body || {};



  if (typeof username !== "string" ||
      typeof password !== "string") {
    return res.status(400).json({
      message: "Username and password are required"
    });
  }

  const user = users.find(
    (u) => u.username === username
  );

  if (!user) {
    return res.status(401).json({
      message: "Invalid username or password"
    });
  }

  const isValid = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isValid) {
    return res.status(401).json({
      message: "Invalid username or password"
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({
    message: "Login successful",
    token,
    role: user.role
  });
});
// Verify JWT Token
function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Login required"
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (error) {
    return res.status(403).json({
      message: "Invalid or expired token"
    });
  }
}

// Change Password
app.put("/api/change-password", authenticateToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword || newPassword.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters"
    });
  }

  const user = users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({
      message: "User not found"
    });
  }

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);

  if (!valid) {
    return res.status(400).json({
      message: "Old password is incorrect"
    });
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);

  res.json({
    message: "Password changed successfully"
  });
});

// Admin authorization
function requireAdmin(req, res, next) {
  const user = users.find((u) => u.id === req.user.id);

  if (!user || user.role !== "admin") {
    return res.status(403).json({
      message: "Admin access required"
    });
  }

  next();
}

// Admin: view users
app.get("/api/users", authenticateToken, requireAdmin, (req, res) => {
  res.json(
    users.map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role
    }))
  );
});

// Admin: change a user's password
app.put(
  "/api/users/:id/password",
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    const { newPassword } = req.body || {};
    const userId = Number(req.params.id);

    if (
      typeof newPassword !== "string" ||
      newPassword.length < 8
    ) {
      return res.status(400).json({
        message: "Password must be at least 8 characters"
      });
    }

    const user = users.find((u) => u.id === userId);

    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);

    res.json({
      message: `Password updated for ${user.username}`
    });
  }
);

// Demo items and audit logs
const items = [];
const auditLogs = [];
let nextItemId = 1;

function recordAudit(action, item, user) {
  auditLogs.push({
    id: auditLogs.length + 1,
    action,
    itemId: item.id,
    itemName: item.name,
    performedBy: user.id,
    timestamp: new Date().toISOString()
  });
}

// Get all items - authorized users only
app.get("/api/item", authenticateToken, (req, res) => {
  res.json(items.filter((item) => item.status !== "DELETED"));
});

// Add item
app.post("/api/item", authenticateToken, (req, res) => {
  const { name } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      message: "Item name is required"
    });
  }

  const item = {
    id: nextItemId++,
    name: name.trim(),
    status: "ACTIVE"
  };

  items.push(item);
  recordAudit("CREATE", item, req.user);

  res.status(201).json(item);
});

// Update item
app.put("/api/item/:id", authenticateToken, (req, res) => {
  const item = items.find(
    (i) => i.id === Number(req.params.id) && i.status !== "DELETED"
  );

  if (!item) {
    return res.status(404).json({
      message: "Item not found"
    });
  }

  const { name } = req.body || {};

  if (typeof name !== "string" || !name.trim()) {
    return res.status(400).json({
      message: "Item name is required"
    });
  }

  item.name = name.trim();
  recordAudit("UPDATE", item, req.user);

  res.json(item);
});

// Soft delete item
app.delete("/api/item/:id", authenticateToken, (req, res) => {
  const item = items.find(
    (i) => i.id === Number(req.params.id) && i.status !== "DELETED"
  );

  if (!item) {
    return res.status(404).json({
      message: "Item not found"
    });
  }

  item.status = "DELETED";
  recordAudit("DELETE", item, req.user);

  res.json({
    message: "Item deleted successfully"
  });
});

// View audit logs - admin only
app.get(
  "/api/audit-log",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    res.json([...auditLogs].reverse());
  }
);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
  });
}

module.exports = app;