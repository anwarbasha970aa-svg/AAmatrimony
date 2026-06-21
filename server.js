require("dotenv").config();


const cloudinary = require("cloudinary").v2;
const cors = require("cors");
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const pool = require("./config/db");
const adminRoutes = require("./routes/adminRoutes");
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});
//const storage = multer.diskStorage({
//  destination: function (req, file, cb) {
  //  cb(null, "uploads/");
  //},
  //filename: function (req, file, cb) {
    //cb(null, Date.now() + "-" + file.originalname);
  //}
//});

//const upload = multer({ storage });
const upload = multer({ dest: "temp/" });
const app = express();

app.use(cors({
  origin: "*"
}));
//const helmet = require("helmet");
//app.use(helmet());
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend")));
//router.get("/users", verifyAdmin, async (req, res) => {
 // const result = await pool.query(
   // "SELECT id, fullname, email, phone FROM users"
  //);

 // res.json(result.rows);
//});

app.use("/api/admin", adminRoutes);

function verifyAdmin(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ message: "No Token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({ message: "Admin Only" });
    }

    req.admin = decoded;
    next();

  } catch (error) {
    res.status(400).json({ message: "Invalid Token" });
  }
}
//app.use("/uploads", express.static(path.join(__dirname, "uploads")));
function verifyToken(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "Access Denied"
    });
  }

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(400).json({
      message: "Invalid Token"
    });
  }
}



app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "index.html"));
});
app.get("/testdb", async (req, res) => {
  try {
    const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    res.json(result.rows);
  } catch (err) {
    res.json(err.message);
  }
});

app.post("/register", async (req, res) => {
  try {
    const { fullname, email, phone, password } = req.body;

   const hashedPassword = await bcrypt.hash(password, 10);

await pool.query(
  "INSERT INTO users(fullname,email, phone, password) VALUES($1,$2,$3)",
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3. AUTO USER ID FROM TOKEN
    const user_id = decoded.id;

      // CHECK IF PROFILE ALREADY EXISTS
    const existing = await pool.query(
      "SELECT * FROM profiles WHERE user_id=$1",
      [user_id]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        message: "Profile already exists"
      });
    }


    // 4. GET FORM DATA (NO user_id FROM FRONTEND)
    const { fullname, age, gender, religion, caste, education, occupation, city, about_me, bio, height, color } = req.body;

    // 5. INSERT INTO DB
    await pool.query(
      `INSERT INTO profiles(user_id, fullname, age, gender, religion, caste, education, occupation, city, about_me, bio, height, color)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,12,13)`,
      [user_id, fullname, age, gender, religion, caste, education, occupation, city, about_me, bio, height, color]
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
app.get("/dbcheck", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users LIMIT 1");
    res.json({
      success: true,
      rows: result.rows
    });
  } catch (err) {
    res.json({
      success: false,
      error: err.message
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
app.post("/upload-photo", verifyToken, upload.single("photo"), async (req, res) => {
  try {

    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "No file selected" });
    }

    const result = await cloudinary.uploader.upload(file.path);

    res.json({
      message: "Photo Uploaded Successfully",
      file: result.secure_url
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Upload Error"
    });
  }
});
app.put("/profile/photo", verifyToken, async (req, res) => {
  try {

    const user_id = req.user.id;
    const { photo } = req.body;

    if (!photo) {
      return res.status(400).json({
        message: "Photo is required"
      });
    }

    await pool.query(
      "UPDATE profiles SET photo=$1 WHERE user_id=$2",
      [photo, user_id]
    );

    res.json({
      message: "Photo Updated Successfully"
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: "Error updating photo"
    });
  }
});
app.get("/profile/photo", verifyToken, async (req, res) => {
  try {

    // 1. Get user id from token
    const user_id = req.user.id;

    // 2. Fetch photo from database
    const result = await pool.query(
      "SELECT photo FROM profiles WHERE user_id=$1",
      [user_id]
    );

    // 3. If profile not found
    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Profile not found"
      });
    }

    // 4. Get photo value
    const photo = result.rows[0].photo;

    // 5. Return response
    res.json({
      photo: photo || "https://via.placeholder.com/200"
    });

  } catch (error) {
    console.log("GET PHOTO ERROR:", error);
    res.status(500).json({
      message: "Server Error"
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

    if (!from_user || !to_user) {
      return res.status(400).json({
        message: "Invalid data"
      });
    }

    // OPTIONAL: prevent duplicate interest
    const check = await pool.query(
      "SELECT * FROM interests WHERE from_user=$1 AND to_user=$2",
      [from_user, to_user]
    );

    if (check.rows.length > 0) {
      return res.status(400).json({
        message: "Interest already sent"
      });
    }

    // 1. Insert interest
    await pool.query(
      "INSERT INTO interests(from_user, to_user, status) VALUES($1,$2,$3)",
      [from_user, to_user, "pending"]
    );

    // 2. Admin alert
    await pool.query(
      `
      INSERT INTO admin_alerts(user1_id, user2_id, message, type)
      VALUES ($1,$2,$3,$4)
      `,
      [
        from_user,
        to_user,
        "Interest sent",
        "interest"
      ]
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
app.put("/interests/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending","accepted","onhold"];

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
      process.env.JWT_SECRET
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
app.get("/admin/interests", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM interests ORDER BY id DESC"
    );

    res.json(result.rows);

  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error" });
  }
});
app.get("/admin/notifications", verifyAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM admin_notifications ORDER BY id DESC LIMIT 10"
    );

    res.json(result.rows);

  } catch (error) {
    res.status(500).json({ message: "Error" });
  }
});
app.get("/suggest/:userId", verifyToken, async (req, res) => {
  try {
    const  userId = req.user.id;

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
      process.env.JWT_SECRET,
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.user_id,
        p.fullname,
        u.email,
        p.age,
        p.gender,
        p.religion,
        p.city,
        p.education,
        p.occupation,
        p.about_me,
        p.bio,
        p.photo,
        p.height,
        p.color
      FROM profiles p
      LEFT JOIN users u
      on p.user_id = u.id
      WHERE p.user_id = $1
      `,
      [decoded.id]
    );
const profile = result.rows[0];

// NO modification needed for Cloudinary URL
res.json(profile);

   

  } catch (error) {
    console.log("PROFILE ERROR:", error);
    res.status(401).json({
      message: error.message
    });
  }
});
app.put("/profile/:id", async (req, res) => {
  try {

    const { id } = req.params;

    const {
      fullname,
      age,
      gender,
      
      
    religion,
      caste,
      education,
      occupation,
      city,
      about_me,
      bio,
      height,
      color
    } = req.body;

    await pool.query(
      `
      UPDATE profiles
      SET
        fullname=$1,
        age=$2,
        gender=$3,
        religion=$4,
        caste=$5,
        education=$6,
        occupation=$7,
        city=$8,
        about_me=$9,
        bio=$10,
        height=$11,
        color=$12
      WHERE user_id=$13
      `,
      [
        fullname,
        age,
        gender,
        religion,
        caste,
        education,
        occupation,
        city,
        about_me,
        bio,
        height,
        color,
        id
      ]
    );

    res.json({
      message: "Profile Updated Successfully"
    });

  } catch (error) {

    console.log(error);

    res.status(500).json({
      message: "Error Updating Profile"
    });

  }
});
app.get("/search", async (req, res) => {
  const { city, gender, religion } = req.query;

  let query = "SELECT * FROM profiles WHERE 1=1";
  let values = [];

  if (city) {
    values.push(city);
    query += ` AND city = $${values.length}`;
  }

  if (gender) {
    values.push(gender);
    query += ` AND gender = $${values.length}`;
  }

  if (religion) {
    values.push(religion);
    query += ` AND religion = $${values.length}`;
  }

  const result = await pool.query(query, values);

  res.json(result.rows);
});
const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});