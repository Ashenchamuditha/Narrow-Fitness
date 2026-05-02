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

// 1. DETERMINE ENVIRONMENT
const dbUrl = process.env.DATABASE_URL || "";
// Expanded local detection to include Docker host gateway
const isLocal = dbUrl.includes('localhost') || 
                dbUrl.includes('127.0.0.1') || 
                dbUrl.includes('@db:') || 
                dbUrl.includes('host.docker.internal');

// 2. CREATE CONFIG DYNAMICALLY
const poolConfig: any = {
  connectionString: dbUrl,
};

// Explicit SSL toggle from .env (optional) or auto-detect
const useSSL = process.env.DB_SSL === 'true' || (!isLocal && process.env.DB_SSL !== 'false');

if (useSSL) {
  poolConfig.ssl = {
    rejectUnauthorized: false
  };
  console.log("🚀 DATABASE: Cloud Mode (SSL Enabled)");
} else {
  console.log("🏠 DATABASE: Local Mode (SSL Disabled)");
}

const pool = new Pool(poolConfig);

// 3. EXPORT QUERY FOR ALL ROUTERS
export const query = (text: string, params?: any[]) => pool.query(text, params);

// Test the connection immediately on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ DATABASE CONNECTION FAILED:', err.message);
  } else {
    console.log('✅ DATABASE CONNECTED SUCCESSFULLY');
  }
});



// Router Imports
import adminRouter from "./routes/adminRoutes.js";
import memberRouter from "./routes/memberRoutes.js";
import aiRouter from "./routes/aiAssistantRoutes.js";
import attendanceRouter from "./routes/attendanceRoutes.js";
import paymentRouter from "./routes/paymentRoutes.js";
import { sendWhatsAppMessage } from './services/notificationService.js';

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

// --- MEMBERSHIP LIFECYCLE TASK ---
setInterval(async () => {
  try {
    // 1. Move to Grace Period (Days 1 to 10 after expiry)
    const graceRes = await query(`
      UPDATE memberships 
      SET status = 'grace_period' 
      WHERE expiry_date < CURRENT_DATE 
      AND expiry_date >= CURRENT_DATE - INTERVAL '10 days'
      AND status = 'active'
      RETURNING userid
    `);

    // 2. Move to Blocked (Day 11+)
    const blockRes = await query(`
      UPDATE memberships 
      SET status = 'blocked' 
      WHERE expiry_date < CURRENT_DATE - INTERVAL '10 days' 
      AND status != 'blocked'
      RETURNING userid
    `);

    // 3. FETCH CURRENT SUMMARY FOR CONSOLE
    const stats = await query(`
      SELECT status, COUNT(*) as count 
      FROM memberships 
      GROUP BY status
    `);
    
    const summary = stats.rows.reduce((acc: any, row: any) => {
      acc[row.status] = row.count;
      return acc;
    }, { active: 0, grace_period: 0, blocked: 0 });

    console.log(`\n[${new Date().toLocaleTimeString()}] 📊 MEMBERSHIP HEARTBEAT:`);
    console.log(`   ✅ Active: ${summary.active}`);
    console.log(`   ⚠️  Grace:  ${summary.grace_period}`);
    console.log(`   🚫 Blocked: ${summary.blocked}`);
    
    if (graceRes.rowCount && graceRes.rowCount > 0) console.log(`   ✨ New Transitions: ${graceRes.rowCount} moved to Grace`);
    if (blockRes.rowCount && blockRes.rowCount > 0) console.log(`   🚨 New Transitions: ${blockRes.rowCount} moved to Blocked`);

  } catch (err: any) {
    console.error("❌ [LIFECYCLE ERROR]:", err.message);
  }
}, 60000); // Check every minute

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

const JWT_SECRET = process.env.JWT_SECRET || "narrow_fitness_secret_key_123";
const DATABASE_URL = process.env.DATABASE_URL;

export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";

// --- 3. APP & HTTP SERVER SETUP ---
// --- ATTENDANCE AUTO-CHECKOUT TASK (Every 15 Minutes) ---
setInterval(async () => {
  try {
    const FIVE_HOURS_AGO = new Date(Date.now() - 5 * 60 * 60 * 1000);
    
    // Find sessions older than 5 hours that are still 'in-gym'
    const staleSessions = await query(
      "SELECT id, check_in FROM attendance WHERE status = 'in-gym' AND check_in < $1",
      [FIVE_HOURS_AGO]
    );

    if (staleSessions.rows.length > 0) {
      console.log(`🧹 System: Auto-checking out ${staleSessions.rows.length} stale sessions...`);
      
      for (const session of staleSessions.rows) {
        const checkIn = new Date(session.check_in);
        const checkOut = new Date(checkIn.getTime() + 2 * 60 * 60 * 1000); // Set checkout to 2 hours after checkin as a sensible default
        const duration = 120; // 2 hours

        await query(
          `UPDATE attendance 
           SET check_out = $1, 
               duration_minutes = $2, 
               status = 'completed'
           WHERE id = $3`,
          [checkOut, duration, session.id]
        );
      }
      
      // Notify admin dashboard if socket is available
      // Note: In a real app, you'd use the 'io' instance defined later
    }
  } catch (err: any) {
    console.error("❌ Auto-Checkout Task Error:", err.message);
  }
}, 15 * 60 * 1000);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { 
    origin: FRONTEND_URL, 
    methods: ["GET", "POST", "PUT", "DELETE"] 
  }
});

// Provide socket instance to all routes via req.app.get("socketio")
app.set("socketio", io);

// --- 4. MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.get("/api/health", (req, res) => {
  res.json({ status: "Backend is alive!", time: new Date() });
});

// Request Logging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});
// --- 2. ROUTE DEFINITIONS ---
const PORT = Number(process.env.PORT) || 5000;

// Inside api/index.ts


app.listen(PORT, '0.0.0.0', () => {
  console.log(`===========================================`);
  console.log(`🚀 NARROW FITNESS BACKEND IS LIVE`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🛠️ Mode: Docker/Development`);
  console.log(`🕒 Started At: ${new Date().toLocaleString()}`);
  console.log(`===========================================`);
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
    const programResult = await query("SELECT COUNT(*) FROM pricing");
    res.json({
      totalMembers: parseInt(memberResult.rows[0].count),
      totalTrainers: parseInt(trainerResult.rows[0].count),
      totalPrograms: parseInt(programResult.rows[0].count)
    });
  } catch (err) {
    res.json({ totalMembers: 0, totalTrainers: 0, totalPrograms: 0 });
  }
});
// --- 7. ROUTER REGISTRATION ---
app.use("/api/admin", adminRouter);
app.use("/api/member/ai", aiRouter);
app.use("/api/member", memberRouter);
app.use("/api/attendance", attendanceRouter);
app.use("/api/payments", paymentRouter);
app.use("/api", memberRouter);


// --- 8. INITIALIZATION LOGIC ---

const initDB = async () => {
  try {
    // Basic User & Profile Tables
    await query(`CREATE TABLE IF NOT EXISTS users (id SERIAL PRIMARY KEY, name VARCHAR(255), email VARCHAR(255) UNIQUE, password VARCHAR(255), role VARCHAR(50) DEFAULT 'user', is_profile_complete BOOLEAN DEFAULT FALSE, profile_image TEXT, package_id INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    await query(`CREATE TABLE IF NOT EXISTS memberprofiles (userid INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, primary_goal VARCHAR(50), current_weight DECIMAL, height DECIMAL, package VARCHAR(100), updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    
    // Ensure column exists for existing tables
    try {
      await query("ALTER TABLE memberprofiles ADD COLUMN IF NOT EXISTS package VARCHAR(100)");
    } catch (e) { /* ignore */ }
    await query(`CREATE TABLE IF NOT EXISTS trainers (id SERIAL PRIMARY KEY, name VARCHAR(255), description TEXT, image_url TEXT, created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
    
    // AI Persistence Tables
    await query(`CREATE TABLE IF NOT EXISTS ai_usage (userid INT PRIMARY KEY, daily_count INT DEFAULT 0, last_reset DATE DEFAULT CURRENT_DATE, last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP);`);
    try {
      await query("ALTER TABLE ai_usage ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP");
    } catch (e) { /* ignore */ }
    await query(`CREATE TABLE IF NOT EXISTS chat_history (id SERIAL PRIMARY KEY, userid INT, role VARCHAR(20), message TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);`);
    
    // Attendance Tables
    await query(`
      CREATE TABLE IF NOT EXISTS attendance_configs (
        id SERIAL PRIMARY KEY,
        qr_key VARCHAR(255) UNIQUE NOT NULL,
        location_name VARCHAR(100) DEFAULT 'Main Entrance',
        is_active BOOLEAN DEFAULT TRUE,
        last_rotated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure at least one default config exists
    const configCheck = await query("SELECT id FROM attendance_configs LIMIT 1");
    if (configCheck.rows.length === 0) {
      await query("INSERT INTO attendance_configs (qr_key) VALUES ('narrow-fitness-checkin-key-2026')");
    }

    await query(`
      CREATE TABLE IF NOT EXISTS attendance (
        id SERIAL PRIMARY KEY,
        userid INTEGER NOT NULL,
        attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
        check_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        check_out TIMESTAMP WITH TIME ZONE,
        duration_minutes INTEGER,
        status VARCHAR(20) DEFAULT 'in-gym',
        CONSTRAINT fk_user FOREIGN KEY(userid) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // Pricing & Memberships
    await query(`
      CREATE TABLE IF NOT EXISTS pricing (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        price DECIMAL(10, 2) NOT NULL,
        duration VARCHAR(50) DEFAULT 'Month',
        features TEXT[] DEFAULT '{}',
        is_popular BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure default pricing plans exist
    const pricingCheck = await query("SELECT id FROM pricing LIMIT 1");
    if (pricingCheck.rows.length === 0) {
      await query(`
        INSERT INTO pricing (name, price, duration, features, is_popular) VALUES 
        ('Standard', 2500, 'Month', '{"Basic Gym Access", "Locker Room Access", "Daily 1 Hour Training"}', FALSE),
        ('Premium', 5000, 'Month', '{"Full Gym Access", "AI Coach Access", "Personalized Workout Plans", "Yoga & Cardio Classes"}', TRUE),
        ('Elite', 12000, '3 Months', '{"All Premium Features", "Nutrition Coaching", "Priority Support", "Narrow Fitness Merchandise"}', FALSE)
      `);
      console.log("📦 DATABASE: Default Pricing Plans Inserted.");
    }

    await query(`
      CREATE TABLE IF NOT EXISTS activation_codes (
        id SERIAL PRIMARY KEY,
        code VARCHAR(255) UNIQUE NOT NULL,
        package_id INTEGER REFERENCES pricing(id) ON DELETE CASCADE,
        is_used BOOLEAN DEFAULT FALSE,
        used_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES pricing(id),
        amount_paid DECIMAL(10, 2) NOT NULL,
        balance_due DECIMAL(10, 2) DEFAULT 0.00,
        payment_method VARCHAR(20) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        source VARCHAR(50) DEFAULT 'app',
        payhere_payment_id VARCHAR(100),
        card_holder_name VARCHAR(255),
        card_no VARCHAR(50),
        receipt_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure columns exist for existing tables
    try {
      await query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_holder_name VARCHAR(255)");
      await query("ALTER TABLE payments ADD COLUMN IF NOT EXISTS card_no VARCHAR(50)");
    } catch (e) { /* ignore */ }

    await query(`
      CREATE TABLE IF NOT EXISTS memberships (
        id SERIAL PRIMARY KEY,
        userid INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        package_id INTEGER REFERENCES pricing(id),
        last_payment_id INTEGER REFERENCES payments(id),
        start_date DATE NOT NULL,
        expiry_date DATE NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Notifications Table
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        userid INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'info',
        redirect_url TEXT,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    try {
      await query("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS redirect_url TEXT");
    } catch (e) { /* ignore */ }

    // Inquiries and OTPs for inquiries
    await query(`
      CREATE TABLE IF NOT EXISTS inquiries (
        id SERIAL PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        subject VARCHAR(255),
        message TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS inquiry_otps (
        email VARCHAR(255) PRIMARY KEY,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL
      );
    `);

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