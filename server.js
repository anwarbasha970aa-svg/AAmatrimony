const cors = require("cors");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const pool = require("./config/db");
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

const app = express();
app.use(cors({
  origin: "*"
}));
const helmet = require("helmet");
app.use(helmet());
app.use(express.json());

const path = require("path");
function verifyAdmin(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No Token" });
  }

  try {
    const decoded = jwt.verify(token, "mysecretkey");

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin Only" });
    }

    req.admin = decoded;
    next();

  } catch (error) {
    res.status(400).json({ message: "Invalid Token" });
  }
}
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "Access Denied"
    });
  }

  try {
    const verified = jwt.verify(token, "mysecretkey");
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({
      message: "Invalid Token"
    });
  }
}

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Matrimony API Running");
});

app.post("/register", async (req, res) => {
  try {
    const { fullname, email, password } = req.body;

   const hashedPassword = await bcrypt.hash(password, 10);

await pool.query(
  "INSERT INTO users(fullname,email,password) VALUES($1,$2,$3)",
  [fullname, email, hashedPassword]
);

    res.json({
      message: "User Registered Successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});

app.post("/profile", async (req, res) => {

  try {

    // 1. GET TOKEN FROM FRONTEND
    const token = req.headers.authorization;

    if (!token) {
      return res.status(401).json({ message: "No token" });
    }

    // 2. DECODE TOKEN
    const decoded = jwt.verify(token, "mysecretkey");

    // 3. AUTO USER ID FROM TOKEN
    const user_id = decoded.id;

    // 4. GET FORM DATA (NO user_id FROM FRONTEND)
    const { age, gender, religion, city } = req.body;

    // 5. INSERT INTO DB
    await pool.query(
      `INSERT INTO profiles(user_id, age, gender, religion, city)
       VALUES ($1,$2,$3,$4,$5)`,
      [user_id, age, gender, religion, city]
    );

    res.json({ message: "Profile Created Successfully" });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }

});

app.get("/profiles/city/:city", async (req, res) => {
  try {
    const { city } = req.params;

    const result = await pool.query(
      "SELECT * FROM profiles WHERE city=$1",
      [city]
    );

    res.json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.get("/profiles/religion/:religion", async (req, res) => {
  try {
    const { religion } = req.params;

    const result = await pool.query(
      "SELECT * FROM profiles WHERE religion=$1",
      [religion]
    );

    res.json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.get("/profiles/age/:age", async (req, res) => {
  try {
    const { age } = req.params;

    const result = await pool.query(
      "SELECT * FROM profiles WHERE age=$1",
      [age]
    );

    res.json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.get("/profiles", async (req, res) => {
  try {

    const result = await pool.query(
      "SELECT * FROM profiles"
    );

    res.json(result.rows);

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error"
    });

  }
});
app.post("/upload-photo", verifyToken, upload.single("photo"), (req, res) => {
  try {
    res.json({
      message: "Photo Uploaded Successfully",
      file: req.file.filename
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.put("/profile/photo/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { photo } = req.body;

    await pool.query(
      "UPDATE profiles SET photo=$1 WHERE id=$2",
      [photo, id]
    );

    res.json({
      message: "Photo Saved Successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.get("/profile/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM profiles WHERE id=$1",
      [id]
    );

    const profile = result.rows[0];
    if (profile.photo) {
  profile.photo = "http://localhost:5000/uploads/" + profile.photo;
}

res.json(profile);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.delete("/profile/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM profiles WHERE id=$1",
      [id]
    );

    res.json({
      message: "Profile Deleted Successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.post("/interest", async (req, res) => {
  try {
    const { from_user, to_user } = req.body;

    await pool.query(
      "INSERT INTO interests(from_user, to_user) VALUES($1,$2)",
      [from_user, to_user]
    );

    res.json({
      message: "Interest Sent Successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.get("/interests/received/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      "SELECT * FROM interests WHERE to_user=$1",
      [userId]
    );

    res.json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.put("/interest/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["accepted", "rejected", "onhold"];

    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: "Invalid status"
      });
    }

    await pool.query(
      "UPDATE interests SET status=$1 WHERE id=$2",
      [status, id]
    );

    res.json({
      message: "Interest Status Updated Successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.get("/matches/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const result = await pool.query(
      `
      SELECT p.*, i.from_user, i.to_user
      FROM interests i
      JOIN profiles p
        ON (
          (i.from_user = p.user_id AND i.to_user = $1)
          OR
          (i.to_user = p.user_id AND i.from_user = $1)
        )
      WHERE i.status = 'accepted'
      `,
      [userId]
    );

    res.json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error"
    });
  }
});
app.get("/profiles/search", async (req, res) => {
  try {
    const { minAge, maxAge, city, religion } = req.query;

    let query = "SELECT * FROM profiles WHERE 1=1";
    let values = [];
    let i = 1;

    if (minAge && maxAge) {
      query += ` AND age BETWEEN $${i} AND $${i + 1}`;
      values.push(minAge, maxAge);
      i += 2;
    }

    if (city) {
      query += ` AND city = $${i}`;
      values.push(city);
      i++;
    }

    if (religion) {
      query += ` AND religion = $${i}`;
      values.push(religion);
      i++;
    }

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
});
app.post("/admin/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM admin WHERE username=$1 AND password=$2",
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid Login" });
    }

    const token = jwt.sign(
      { id: result.rows[0].id, role: "admin" },
      "mysecretkey"
    );

    res.json({
      message: "Login Success",
      token: token
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
});
app.get("/admin/users", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users");
    res.json(result.rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
});
app.get("/admin/profiles", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM profiles");
    res.json(result.rows);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
});
app.delete("/admin/user/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query("DELETE FROM users WHERE id=$1", [id]);

    res.json({ message: "User Deleted" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
});
app.get("/suggest/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await pool.query(
      "SELECT * FROM profiles WHERE user_id=$1",
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    const me = user.rows[0];

    const result = await pool.query(
      `
      SELECT * FROM profiles
      WHERE user_id != $1
      AND city = $2
      AND age BETWEEN $3 AND $4
      `,
      [userId, me.city, me.age - 5, me.age + 5]
    );

    res.json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Invalid Login" });
    }

    const user = result.rows[0];

    // 🔥 COMPARE PASSWORD (FIX)
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid Password" });
    }

    const token = jwt.sign(
      { id: user.id },
      "mysecretkey",
      { expiresIn: "1d" } // 🔥 ADDED SECURITY
    );

    res.json({
      message: "Login Success",
      token: token
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
});
app.get("/profile", async (req, res) => {
  try {
    const token = req.headers.authorization;

    const decoded = jwt.verify(token, "mysecretkey");

    const result = await pool.query(
      "SELECT id, fullname, email FROM users WHERE id=$1",
      [decoded.id]
    );

    res.json(result.rows[0]);

  } catch (error) {
    res.status(401).json({ message: "Invalid Token" });
  }
});
app.get("/search", async (req, res) => {
  const city = req.query.city;

  const result = await pool.query(
    "SELECT * FROM users WHERE city=$1",
    [city]
  );

  res.json(result.rows);
});
app.listen(5000, () => {
  console.log("Server Running");
});