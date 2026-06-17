const express = require("express");
const router = express.Router();
const pool = require("../config/db");
const jwt = require("jsonwebtoken");

// Middleware: Admin check
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin only" });
    }

    req.admin = decoded;
    next();
  } catch (err) {
    return res.status(400).json({ message: "Invalid token" });
  }
}

---

# 📊 ADMIN APIs

// Get all users
router.get("/users", verifyAdmin, async (req, res) => {
  const result = await pool.query("SELECT * FROM users");
  res.json(result.rows);
});

// Get all profiles
router.get("/profiles", verifyAdmin, async (req, res) => {
  const result = await pool.query("SELECT * FROM profiles");
  res.json(result.rows);
});

// Delete user
router.delete("/user/:id", verifyAdmin, async (req, res) => {
  const { id } = req.params;

  await pool.query("DELETE FROM users WHERE id=$1", [id]);

  res.json({ message: "User deleted" });
});

module.exports = router;