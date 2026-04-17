import fs from 'fs';
import path from 'path';
import 'dotenv/config'; 
import express from "express";
import cors from "cors";
import nodemailer from 'nodemailer';
import http from "http";
import { Server } from "socket.io";
import pkg from "pg";
const { Pool } = pkg;
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
// --- DATABASE CONNECTION (Defined here to stop the import error) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// This creates the 'query' function that your routes need
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Router Imports
import adminRouter from "./src/lib/adminRoutes.js";
import memberRouter from "./src/lib/memberRoutes.js";
import aiRouter from "./src/lib/aiAssistantRoutes.js";
//verify nodemailer configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
});
// Verify connection
transporter.verify((error) => {
  if (error) console.log("❌ Mail Server Error:", error);
  else console.log("📧 Mail Server Ready: Class Notification");
});

// --- 🔎 0. PRE-FLIGHT ENVIRONMENT DEBUGGER ---
const verifyEnvironment = () => {
  console.log("\n" + "=".repeat(50));
  console.log("🛠️  NARROW HUB: SYSTEM ENVIRONMENT CHECK");
  console.log("=".repeat(50));

  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    console.log(`✅ .env file detected at: ${envPath}`);
  } else {
    console.log(`❌ CRITICAL: .env file NOT FOUND in ${process.cwd()}`);
  }

  const status = [
    { Variable: "DATABASE_URL", Status: process.env.DATABASE_URL ? "✅ Loaded" : "❌ MISSING" },
    { Variable: "GROQ_API_KEY", Status: process.env.GROQ_API_KEY ? `✅ Loaded (${process.env.GROQ_API_KEY.substring(0, 8)}...)` : "❌ MISSING" },
    { Variable: "JWT_SECRET", Status: process.env.JWT_SECRET ? "✅ Loaded" : "⚠️  Using Default" },
  ];

  console.table(status);
  console.log("=".repeat(50) + "\n");
};

verifyEnvironment();

// --- 1. CONFIGURATION ---
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "narrow_fitness_secret_key_123";
const DATABASE_URL = process.env.DATABASE_URL;

// --- 3. APP & HTTP SERVER SETUP ---
const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: "http://localhost:3000", 
    methods: ["GET", "POST", "PUT", "DELETE"] 
  }
});

// Provide socket instance to all routes via req.app.get("socketio")
app.set("socketio", io);

// --- 4. MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is alive!", time: new Date() });
});
// Request Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// --- 5. AUTHENTICATION ---
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await query(`
      SELECT u.*, p.name as package_name 
      FROM users u 
      LEFT JOIN pricing p ON u.package_id = p.id 
      WHERE u.email = $1`, [email]);

    if (result.rows.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    delete user.password; 

    res.json({ user, token });
  } catch (err: any) {
    res.status(500).json({ message: "Internal server error during login" });
  }
});

// --- 6. PUBLIC DATA ROUTES ---
app.get("/api/public/stats", async (req, res) => {
  try {
    const memberResult = await query("SELECT COUNT(*) FROM users WHERE role = 'user'");
    const trainerResult = await query("SELECT COUNT(*) FROM trainers");
    res.json({ 
      totalMembers: parseInt(memberResult.rows[0].count), 
      totalTrainers: parseInt(trainerResult.rows[0].count) 
    });
  } catch (err) {
    res.json({ totalMembers: 0, totalTrainers: 0 });
  }
});

// --- 7. ROUTER REGISTRATION ---
app.use("/api/admin", adminRouter);
app.use("/api/member", memberRouter);
app.use("/api", memberRouter);
app.use("/api/member/ai", aiRouter);

// --- 8. INITIALIZATION LOGIC ---

const initDB = async () => {
  try {
    // Basic User & Profile Tables
    await query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), role VARCHAR(50) DEFAULT 'user', is_profile_complete BOOLEAN DEFAULT FALSE, profile_image TEXT, package_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await query(`CREATE TABLE IF NOT EXISTS memberprofiles (userid INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, primary_goal VARCHAR(50), current_weight DECIMAL, height DECIMAL, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await query(`CREATE TABLE IF NOT EXISTS trainers (id SERIAL PRIMARY KEY, name VARCHAR(255), description TEXT, image_url TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
    
    // AI Persistence Tables
    await query(`CREATE TABLE IF NOT EXISTS ai_usage (userid INT PRIMARY KEY, daily_count INT DEFAULT 0, last_reset DATE DEFAULT CURRENT_DATE);`);
    await query(`CREATE TABLE IF NOT EXISTS chat_history (id SERIAL PRIMARY KEY, userid INT, role VARCHAR(20), message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    
    console.log("📦 DATABASE: All Tables Verified & Initialized.");
  } catch (err) {
    console.error("❌ DATABASE: Startup Error:", err);
  }
};

const runSystemHealthCheck = async () => {
  console.log("🔍 NARROW HUB: SYSTEM INTEGRITY SCAN");

  // A. Database Connection Check
  try {
    await query("SELECT 1");
    console.log("✅ DATABASE: Connection established & stable.");
  } catch (e) {
    console.log("❌ DATABASE: Connection failed!");
  }

  // B. Groq AI Health Check
  const groqKey = process.env.GROQ_API_KEY?.trim() || "";
  if (groqKey.startsWith("gsk_")) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${groqKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5
        }),
      });

      if (response.ok) {
        console.log("✅ NARROW AI: Groq (Llama 3.3) is ACTIVE & VERIFIED.");
      } else {
        console.log("⚠️  NARROW AI: Groq Key found but API rejected the request.");
      }
    } catch (err) {
      console.log("❌ NARROW AI: Network error connecting to Groq.");
    }
  } else {
    console.log("❌ NARROW AI: Groq API Key is missing or invalid in .env");
  }

  if (io) console.log("✅ WEBSOCKET: Real-time sync engine is ONLINE.");
  console.log("=".repeat(50) + "\n");
};

// --- 9. START SERVER ---
server.listen(PORT, async () => {
  await initDB();
  await runSystemHealthCheck();
  console.log(`🚀 Narrow Fitness API Live: http://localhost:${PORT}`);
});
// inquiries
// --- PUBLIC CONTACT SUBMISSION ---
app.post("/api/public/contact", async (req, res) => {
  const { full_name, email, subject, message } = req.body;

  // 1. Basic Validation
  if (!full_name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // 2. Email Format Validation (Regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please provide a valid email address." });
  }

  try {
    // 3. Save to Database
    const result = await query(
      `INSERT INTO inquiries (full_name, email, subject, message) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [full_name, email, subject, message]
    );

    console.log(`📩 New Inquiry received from ${email}`);
    
    res.status(201).json({ 
      success: true, 
      message: "Message sent successfully! Our team will contact you soon." 
    });
  } catch (err: any) {
    console.error("Contact Error:", err.message);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// email validation at inquiry submission, and also add a new table for inquiries
// --- 1. SEND OTP FOR PUBLIC INQUIRY ---
app.post("/api/public/contact/send-otp", async (req, res) => {
  const { email } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  try {
    // Save to the NEW dedicated inquiry_otps table
    await query(
      `INSERT INTO inquiry_otps (email, code, expires_at) 
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes') 
       ON CONFLICT (email) DO UPDATE SET code = $2, expires_at = NOW() + INTERVAL '10 minutes'`,
      [email, otp]
    );

    // Send the email
    await transporter.sendMail({
      from: `"Narrow Fitness Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Verify your email for Narrow Fitness",
      html: `
        <div style="font-family: sans-serif; max-width: 400px; border: 1px solid #eee; padding: 20px;">
          <h2 style="color: #ea580c;">Verification Code</h2>
          <p>Please enter the code below to verify your email and send your message.</p>
          <h1 style="letter-spacing: 5px; color: #000; text-align: center;">${otp}</h1>
          <p style="font-size: 12px; color: #999;">This code expires in 10 minutes.</p>
        </div>`
    });

    res.status(200).json({ message: "OTP sent to your email." });
  } catch (err: any) {
    console.error("❌ INQUIRY OTP ERROR:", err.message);
    res.status(500).json({ message: "Failed to send verification code." });
  }
});

// --- 2. VERIFY OTP & SAVE FINAL INQUIRY ---
app.post("/api/public/contact/verify-submit", async (req, res) => {
  const { full_name, email, subject, message, otp } = req.body;

  try {
    // Check against the NEW inquiry_otps table
    const otpCheck = await query(
      "SELECT * FROM inquiry_otps WHERE email = $1 AND code = $2 AND expires_at > NOW()",
      [email, otp]
    );

    if (otpCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    // Success! Now save the actual message to the inquiries table
    await query(
      "INSERT INTO inquiries (full_name, email, subject, message) VALUES ($1, $2, $3, $4)",
      [full_name, email, subject, message]
    );

    // Clean up: delete the used OTP from inquiry_otps
    await query("DELETE FROM inquiry_otps WHERE email = $1", [email]);

    res.status(201).json({ success: true, message: "Email verified! Your message has been sent." });
  } catch (err: any) {
    console.error("❌ VERIFY ERROR:", err.message);
    res.status(500).json({ message: "Database error. Could not save message." });
  }
});
// Socket Monitor
io.on("connection", (socket) => {
  console.log(`📡 New Client Connected: ${socket.id}`);
  socket.on("disconnect", () => console.log(`🔌 Client Disconnected`));
});
// server.ts
app.get("/api/public/gallery", async (req, res) => {
  try {
    const result = await query("SELECT * FROM gallery ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json([]);
  }
});

export default app;