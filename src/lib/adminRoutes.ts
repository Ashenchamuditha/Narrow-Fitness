// route.ts
import express from 'express';
import { query } from '../../api/index.js'; 
import { Router } from "express";
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer'; 

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection
transporter.verify((error) => {
  if (error) console.log("❌ Mail Server Error:", error);
  else console.log("📧 Mail Server Ready: Class Notification");
});


const adminRouter = Router();

const router = express.Router();

// Fetch all members for admin dashboard
adminRouter.get("/users", async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC"
    );
    res.status(200).json(result.rows);
  } catch (err: any) {
    console.error("❌ /api/admin/users failed:", err);
    res.status(500).json({ message: "Error fetching members" });
  }
});


// --- ADMIN: UPDATE MEMBER ---
router.put("/users/:id", async (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  try {
    const result = await query(
      "UPDATE users SET name = $1, email = $2 WHERE id = $3 RETURNING id, name, email, role, created_at",
      [name, email, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json(result.rows[0]); // Returns updated user object
  } catch (err: any) {
    console.error("Edit Error:", err.message);
    res.status(500).json({ message: "Database error during update", error: err.message });
  }
});

// --- ADMIN: DELETE MEMBER (Fixes the ID failure) ---
router.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Delete from memberprofiles first (To prevent Foreign Key error)
    await query("DELETE FROM memberprofiles WHERE userid = $1", [id]);

    // 2. Now delete from users
    const result = await query("DELETE FROM users WHERE id = $1 RETURNING id", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Member not found" });
    }

    res.json({ success: true, message: "Member and profile deleted successfully" });
  } catch (err: any) {
    console.error("Delete Error:", err.message);
    res.status(500).json({ message: "Could not delete member. They may have active class bookings.", error: err.message });
  }
});

adminRouter.get("/users/recent", async (req, res) => {
  try {
    const result = await query(
      "SELECT name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5"
    );
    res.status(200).json(result.rows);
  } catch (err: any) {
    console.error("❌ /api/admin/users/recent failed:", err);
    res.status(500).json({ message: "Error fetching data" });
  }
});

adminRouter.get("/stats/users-count", async (req, res) => {
  try {
    const result = await query("SELECT COUNT(*) FROM users");
    res.status(200).json({ count: Number(result.rows[0].count) || 0 });
  } catch (err: any) {
    console.error("❌ /api/admin/stats/users-count failed:", err);
    res.status(500).json({ count: 0 });
  }
});
//card stats for admin dashboard
// --- UPDATED ADMIN STATS ROUTE ---
adminRouter.get("/stats", async (req, res) => {
  try {
    // We use [0].count and convert to Number
    const usersCount = await query("SELECT COUNT(*) AS count FROM users");
    const trainersCount = await query("SELECT COUNT(*) AS count FROM trainers");
    const classesCount = await query("SELECT COUNT(*) AS count FROM classes");
    const pricingCount = await query("SELECT COUNT(*) AS count FROM pricing");

    const data = {
      totalMembers: parseInt(usersCount.rows[0].count) || 0,
      totalTrainers: parseInt(trainersCount.rows[0].count) || 0,
      totalClasses: parseInt(classesCount.rows[0].count) || 0,
      totalPackages: parseInt(pricingCount.rows[0].count) || 0 
    };

    console.log("📊 Backend Stats Sent:", data); // Check your terminal for this!
    res.status(200).json(data);
  } catch (err: any) {
    console.error("❌ Stats Error:", err.message);
    res.status(500).json({ totalMembers: 0, totalTrainers: 0, totalClasses: 0, totalPackages: 0 });
  }
});
// 1. Fetch ALL users for Manage Members page
router.get("/users", async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at ASC"
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: "Database error fetching all users" });
  }
});


// This combined with "/api/admin" makes "/api/admin/users"

// 2. Fetch 5 most recent for Dashboard
router.get("/users/recent", async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT 5"
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching recent users" });
  }
});

// 3. Stats for Dashboard Cards
router.get("/stats", async (req, res) => {
  try {
    const userCount = await query("SELECT COUNT(*) FROM users");
    
    // Safety check for tables that might not exist yet
    let totalTrainers = 0;
    let totalClasses = 0;
    let totalPackages = 0; // Initialize new variable

    try {
        const tr = await query("SELECT COUNT(*) FROM trainers");
        totalTrainers = parseInt(tr.rows[0].count);
    } catch (e) { console.log("Trainers table not ready"); }
    
    try {
        const cl = await query("SELECT COUNT(*) FROM classes");
        totalClasses = parseInt(cl.rows[0].count);
    } catch (e) { console.log("Classes table not ready"); }

    // --- NEW: FETCH TOTAL PRICING PACKAGES ---
    try {
        const pr = await query("SELECT COUNT(*) FROM pricing");
        totalPackages = parseInt(pr.rows[0].count);
    } catch (e) { console.log("Pricing table not ready"); }

    res.json({
      totalMembers: parseInt(userCount.rows[0].count) || 0,
      totalTrainers: totalTrainers,
      totalClasses: totalClasses,
      totalPackages: totalPackages 
    });
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// 4. Add new member (user)
router.post("/members", async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    // Check if email already exists
    const emailCheck = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("📝 POST /members received:", { name, email, role: role || 'user' });

    const result = await query(
      "INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at",
      [name, email, hashedPassword, role || 'user']
    );
    console.log("✅ Member created with ID:", result.rows[0].id);
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ POST /members failed:", err);
    res.status(500).json({ message: "Error creating member", details: err.message });
  }
});

// Trainer CRUD Endpoints
router.get("/trainers", async (req, res) => {
  try {
    const result = await query(
      "SELECT id, name, description, image_url, contact, created_at FROM trainers ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ /api/admin/trainers GET failed:", err);
    res.status(500).json({ message: "Error fetching trainers" });
  }
});

// 2. Updated POST: Improved logging
router.post("/trainers", async (req, res) => {
  const { name, description, image_url, contact } = req.body;
  try {
    if (!name || !description) {
      return res.status(400).json({ message: "Name and description are required" });
    }

    const result = await query(
      "INSERT INTO trainers (name, description, image_url, contact) VALUES ($1, $2, $3, $4) RETURNING *",
      [name, description, image_url || null, contact || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Trainer POST failed:", err.message);
    res.status(500).json({ message: "Database error: " + err.message });
  }
});

// 3. Updated PUT: Fixed logic to preserve image if not changed
router.put("/trainers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, image_url, contact } = req.body;
  
  try {
    let result;
    if (image_url) {
      // Update everything including new image
      result = await query(
        "UPDATE trainers SET name = $1, description = $2, image_url = $3, contact = $4 WHERE id = $5 RETURNING *",
        [name, description, image_url, contact || null, id]
      );
    } else {
      // Update only text fields, leave existing image alone
      result = await query(
        "UPDATE trainers SET name = $1, description = $2, contact = $3 WHERE id = $4 RETURNING *",
        [name, description, contact || null, id]
      );
    }
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Trainer not found" });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Update failed: " + err.message });
  }
});
// 4. DELETE Trainer: Permanently remove from elite roster
router.delete("/trainers/:id", async (req, res) => {
  const { id } = req.params;

  try {
    console.log(`🗑️ [Backend] Request to delete trainer ID: ${id}`);

    // We use RETURNING name so we can log exactly who was deleted
    const result = await query(
      "DELETE FROM trainers WHERE id = $1 RETURNING name",
      [id]
    );

    if (result.rows.length === 0) {
      console.log(`⚠️ [Backend] Delete failed: Trainer ID ${id} not found.`);
      return res.status(404).json({ message: "Trainer not found in database." });
    }

    const trainerName = result.rows[0].name;
    console.log(`✅ [Backend] SUCCESS: Trainer "${trainerName}" has been removed.`);

    res.json({ 
      success: true, 
      message: `Trainer ${trainerName} removed from elite roster successfully.` 
    });

  } catch (err: any) {
    console.error("❌ [Backend] CRITICAL DELETE ERROR:", err.message);
    res.status(500).json({ message: "System error while deleting trainer profile." });
  }
});
// --- CLASSES MANAGEMENT ---

// 1. GET all classes (Joining with Trainers and counting pending bookings)
router.get("/classes", async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        c.id, 
        c.name, 
        c.trainer_id,
        t.name AS trainer_name, 
        c.class_time, 
        c.class_day, 
        c.capacity,
        c.is_cancelled,
        (SELECT COUNT(*) FROM class_bookings cb WHERE cb.class_id = c.id AND cb.status = 'pending') AS pending_count
      FROM classes c
      LEFT JOIN trainers t ON c.trainer_id = t.id
      ORDER BY c.created_at DESC
    `);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: "Database error fetching classes", error: err.message });
  }
});

// 2. POST create a new class
router.post("/classes", async (req, res) => {
  const { name, trainer_id, class_time, class_day, capacity } = req.body;
  try {
    const result = await query(
      "INSERT INTO classes (name, trainer_id, class_time, class_day, capacity, is_cancelled) VALUES ($1, $2, $3, $4, $5, false) RETURNING *",
      [name, trainer_id, class_time, class_day, capacity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Database error creating class", error: err.message });
  }
});

// 3. PUT update a class (FIXED: Now handles is_cancelled toggle)
router.put("/classes/:id", async (req, res) => {
  const { id } = req.params;
  const { name, trainer_id, class_time, class_day, capacity, is_cancelled } = req.body;
  
  try {
    console.log(`📡 [Backend] Updating Class ID: ${id} | Cancel Status: ${is_cancelled}`);

    const result = await query(
      `UPDATE classes 
       SET name = $1, 
           trainer_id = $2, 
           class_time = $3, 
           class_day = $4, 
           capacity = $5, 
           is_cancelled = $6 
       WHERE id = $7 
       RETURNING *`,
      [name, trainer_id, class_time, class_day, capacity, is_cancelled, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Class not found" });
    }

    console.log(`✅ [Backend] Class ${id} updated successfully.`);
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('❌ [Backend] PUT /classes failed:', err.message);
    res.status(500).json({ message: "Database error updating class", error: err.message });
  }
});

// 4. DELETE a class
router.delete("/classes/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query("DELETE FROM classes WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Class not found" });
    res.json({ message: "Class deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ message: "Database error deleting class", error: err.message });
  }
});
// --- PRICING MANAGEMENT ---

// GET all pricing plans
router.get("/pricing", async (req, res) => {
  try {
    console.log('Backend: [GET /api/admin/pricing] Fetching all pricing plans...');
    const result = await query("SELECT * FROM pricing ORDER BY price ASC");
    res.json(result.rows);
  } catch (err: any) {
    console.error('Backend: [GET /api/admin/pricing] Error:', err);
    res.status(500).json({ message: "Database error fetching pricing", error: err.message });
  }
});

// POST create a new pricing plan
router.post("/pricing", async (req, res) => {
  const { name, price, duration, features, is_popular } = req.body;
  try {
    console.log('Backend: [POST /api/admin/pricing] Creating new pricing plan:', req.body);
    const result = await query(
      "INSERT INTO pricing (name, price, duration, features, is_popular) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [name, price, duration || 'Month', features || [], is_popular || false]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error('Backend: [POST /api/admin/pricing] Error:', err);
    res.status(500).json({ message: "Database error creating pricing plan", error: err.message });
  }
});

// PUT update a pricing plan
router.put("/pricing/:id", async (req, res) => {
  const { id } = req.params;
  const { name, price, duration, features, is_popular } = req.body;
  try {
    console.log(`Backend: [PUT /api/admin/pricing/${id}] Updating pricing plan:`, req.body);
    const result = await query(
      "UPDATE pricing SET name = $1, price = $2, duration = $3, features = $4, is_popular = $5 WHERE id = $6 RETURNING *",
      [name, price, duration, features, is_popular, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Pricing plan not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Backend: [PUT /api/admin/pricing] Error:', err);
    res.status(500).json({ message: "Database error updating pricing plan", error: err.message });
  }
});

// DELETE a pricing plan
router.delete("/pricing/:id", async (req, res) => {
  const { id } = req.params;
  try {
    console.log(`Backend: [DELETE /api/admin/pricing/${id}] Deleting pricing plan...`);
    const result = await query("DELETE FROM pricing WHERE id = $1 RETURNING *", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Pricing plan not found" });
    res.json({ message: "Pricing plan deleted successfully" });
  } catch (err: any) {
    console.error('Backend: [DELETE /api/admin/pricing] Error:', err);
    res.status(500).json({ message: "Database error deleting pricing plan", error: err.message });
  }
});

// --- ADMIN: ACTIVATION CODE GENERATION ---

// This handles fetching the keys for the sidebar
router.get("/codes", async (req, res) => {
  try {
    const result = await query(`
      SELECT ac.*, p.name as plan_name 
      FROM activation_codes ac 
      LEFT JOIN pricing p ON ac.package_id = p.id 
      ORDER BY ac.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching keys" });
  }
});

// This handles generating the actual NF-XXXX key
router.post("/codes/generate", async (req, res) => {
  const { packageId } = req.body;
  console.log(`[Backend] Generating key for Package ID: ${packageId}`);

  if (!packageId) return res.status(400).json({ message: "Package ID is required" });

  try {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const gen = () => Array.from({length: 4}, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
    const newCode = `NF-${gen()}-${gen()}`;

    const result = await query(
      "INSERT INTO activation_codes (code, package_id, is_used) VALUES ($1, $2, FALSE) RETURNING code",
      [newCode, packageId]
    );

    res.status(201).json({ success: true, code: result.rows[0].code });
  } catch (err: any) {
    console.error("Code generation error:", err.message);
    res.status(500).json({ message: "Database error during generation" });
  }
});

// --- MEMBER PROFILE MANAGEMENT ---

// GET profile by User ID
router.get("/member/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query("SELECT * FROM member_profiles WHERE user_id = $1", [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Profile not found" });
    }
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching profile", error: err.message });
  }
});
// class bookings for a member

// --- ADMIN: FETCH BOOKINGS FOR A SPECIFIC CLASS ---
router.get("/classes/:id/bookings", async (req, res) => {
  const { id } = req.params;
  console.log(`[Backend] Fetching registration requests for Class ID: ${id}`);

  try {
    // We join 'class_bookings' with 'users' to get the member's Name and Email
    // CRITICAL: Ensure column names 'userid' and 'id' match your tables
    const result = await query(`
      SELECT 
        b.id AS booking_id, 
        b.status, 
        u.id AS user_id, 
        u.name, 
        u.email 
      FROM class_bookings b
      JOIN users u ON b.userid = u.id
      WHERE b.class_id = $1
      ORDER BY b.created_at DESC
    `, [id]);

    console.log(`[Backend] Found ${result.rows.length} requests for this class.`);
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Error fetching class bookings:", err.message);
    res.status(500).json({ message: "Failed to load member list" });
  }
});

// --- 2. ADMIN: CONFIRM/APPROVE BOOKING WITH EMAIL ---
router.put("/classes/bookings/:id/confirm", async (req, res) => {
  const { id } = req.params;
  try {
    // A. Fetch User & Class info first
    const details = await query(`
      SELECT u.email, u.name as user_name, c.name as class_name, c.class_time, c.class_day 
      FROM class_bookings b
      JOIN users u ON b.userid = u.id
      JOIN classes c ON b.class_id = c.id
      WHERE b.id = $1
    `, [id]);

    if (details.rows.length === 0) return res.status(404).json({ message: "Booking not found" });
    const { email, user_name, class_name, class_time, class_day } = details.rows[0];

    // B. Update DB: Confirm status and Reduce slots
    await query("UPDATE class_bookings SET status = 'confirmed' WHERE id = $1", [id]);
    await query(`UPDATE classes SET capacity = capacity - 1 WHERE id = (SELECT class_id FROM class_bookings WHERE id = $1)`, [id]);

    // C. Send the Approval Email
    const mailOptions = {
      from: `"Narrow Fitness" <${process.env.EMAIL_USER}>`, 
      to: email,
      subject: "Your Seat is Reserved: " + class_name,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #f3f4f6; border-radius: 15px;">
          <h2 style="color: #f97316; margin-bottom: 20px;">Reservation Confirmed!</h2>
          <p>Hi <b>${user_name}</b>,</p>
          <p>Your request to join the <b>${class_name}</b> session has been successfully approved.</p>
          <div style="background: #000; color: #fff; padding: 20px; border-radius: 12px; margin: 20px 0;">
            <p style="margin: 0; font-size: 12px; color: #f97316; text-transform: uppercase;">Schedule Details</p>
            <p style="margin: 10px 0 0 0; font-size: 18px; font-weight: bold;">${class_day} @ ${class_time}</p>
          </div>
          <p style="color: #666;">Please arrive at the gym at least 10 minutes before the session starts. Let's crush those goals!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 10px; color: #999; text-align: center;">Narrow Fitness Management System</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.log("❌ Mail Error:", err.message);
        else console.log("📧 Approval email sent to:", email);
    });

    res.json({ success: true, message: "Member approved and email sent." });

  } catch (err: any) {
    res.status(500).json({ message: "Internal error during confirmation" });
  }
});

// --- 3. ADMIN: REMOVE MEMBER WITH EMAIL ---
router.delete("/classes/bookings/:id", async (req, res) => {
  const { id } = req.params;
  try {
    // A. Fetch details before deleting
    const details = await query(`
      SELECT u.email, u.name as user_name, c.name as class_name, b.status, b.class_id
      FROM class_bookings b
      JOIN users u ON b.userid = u.id
      JOIN classes c ON b.class_id = c.id
      WHERE b.id = $1
    `, [id]);

    if (details.rows.length === 0) return res.status(404).json({ message: "Booking not found" });
    const { email, user_name, class_name, status, class_id } = details.rows[0];

    // B. If they were already confirmed, give the slot back to the class
    if (status === 'confirmed') {
      await query("UPDATE classes SET capacity = capacity + 1 WHERE id = $1", [class_id]);
    }

    // C. Delete the booking record
    await query("DELETE FROM class_bookings WHERE id = $1", [id]);

    // D. Send Removal Email
    const mailOptions = {
      from: `"Narrow Fitness" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Update: Class Enrollment Canceled",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #fee2e2; border-radius: 15px;">
          <h2 style="color: #ef4444; margin-bottom: 20px;">Session Enrollment Update</h2>
          <p>Hi <b>${user_name}</b>,</p>
          <p>We are writing to inform you that your registration for the <b>${class_name}</b> session has been removed by the administrator.</p>
          <p style="color: #666; line-height: 1.6;">This could be due to a schedule update or a coach cancellation. Please check the dashboard for alternative sessions.</p>
          <p>We apologize for the inconvenience.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="font-size: 10px; color: #999; text-align: center;">Narrow Fitness Management System</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) console.log("❌ Mail Error:", err.message);
        else console.log("📧 Removal email sent to:", email);
    });

    res.json({ success: true, message: "Member removed and notified." });

  } catch (err: any) {
    res.status(500).json({ message: "Internal error during removal" });
  }
});
//real time updates 

// adminRoutes.ts

// Approve Booking
router.put("/bookings/confirm/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      "UPDATE bookings SET status = 'confirmed' WHERE id = $1 RETURNING user_id, class_id",
      [id]
    );
    
    if (result.rows.length > 0) {
      const { user_id } = result.rows[0];

      // REAL-TIME NOTIFICATION TO MEMBER
      const io = req.app.get("socketio");
      
      // We send a message that the frontend member dashboard listens to
      io.emit("member_update", {
        targetUserId: user_id,
        type: "BOOKING_CONFIRMED",
        message: "Your class seat has been confirmed!"
      });
      
      res.json({ message: "Confirmed and user notified live!" });
    }
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});
router.put("/bookings/confirm/:id", async (req, res) => {
  // ... your update logic ...
  
  // SILENT SIGNAL: Tell Members to refresh their class cards
  const io = req.app.get("socketio");
  io.emit("silent_member_refresh"); 

  res.status(200).json({ success: true });
});

// --- INQUIRIES MANAGEMENT ---

// 1. Fetch all inquiries
// Path: GET /api/admin/inquiries
router.get("/inquiries", async (req, res) => {
  try {
    const result = await query(
      "SELECT * FROM inquiries ORDER BY is_read ASC, created_at DESC"
    );
    res.status(200).json(result.rows);
  } catch (err: any) {
    console.error("❌ GET /inquiries Error:", err.message);
    res.status(500).json({ message: "Error fetching inquiries" });
  }
});

// 2. Mark inquiry as read
// Path: PUT /api/admin/inquiries/:id/read
router.put("/inquiries/:id/read", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(
      "UPDATE inquiries SET is_read = TRUE WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ message: "Inquiry not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ PUT /inquiries read Error:", err.message);
    res.status(500).json({ message: "Update failed" });
  }
});

// 3. Delete an inquiry
// Path: DELETE /api/admin/inquiries/:id
router.delete("/inquiries/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM inquiries WHERE id = $1", [id]);
    res.json({ message: "Inquiry deleted successfully" });
  } catch (err: any) {
    console.error("❌ DELETE /inquiries Error:", err.message);
    res.status(500).json({ message: "Delete failed" });
  }
});

// 4. Get Inquiry Stats (Total and Unread)
// Path: GET /api/admin/stats/inquiries
router.get("/stats/inquiries", async (req, res) => {
    try {
      const result = await query(`
        SELECT 
          COUNT(*) as total, 
          COUNT(*) FILTER (WHERE is_read = FALSE) as unread 
        FROM inquiries
      `);
      res.json({
        total: parseInt(result.rows[0].total) || 0,
        unread: parseInt(result.rows[0].unread) || 0
      });
    } catch (err: any) {
      console.error("❌ GET /stats/inquiries Error:", err.message);
      res.status(500).json({ total: 0, unread: 0 });
    }
});
// Fetch gallery items
router.get("/gallery", async (req, res) => {
  try {
    const result = await query("SELECT * FROM gallery ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "Error fetching gallery" });
  }
});

// Add new gallery item
router.post("/gallery", async (req, res) => {
  const { title, description, image_url } = req.body;
  try {
    const result = await query(
      "INSERT INTO gallery (title, description, image_url) VALUES ($1, $2, $3) RETURNING *",
      [title, description, image_url]
    );
    
    // Silent refresh signal for admin UI
    const io = req.app.get("socketio");
    if (io) io.emit("silent_admin_refresh");

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Upload failed" });
  }
});

// Delete gallery item
router.delete("/gallery/:id", async (req, res) => {
  try {
    await query("DELETE FROM gallery WHERE id = $1", [req.params.id]);
    res.json({ message: "Item deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});
// --- UPDATE GALLERY ITEM ---
// URL: PUT /api/admin/gallery/:id
router.put("/gallery/:id", async (req, res) => {
  const { id } = req.params;
  const { title, description } = req.body;

  try {
    const result = await query(
      "UPDATE gallery SET title = $1, description = $2 WHERE id = $3 RETURNING *",
      [title, description, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Gallery Update Error:", err.message);
    res.status(500).json({ message: "Failed to update gallery item" });
  }
});
// adminRouter.post("/broadcast-email", ...)
router.post("/broadcast-email", async (req, res) => {
  const { subject, message } = req.body;

  try {
    // 1. Fetch all user emails
    const members = await query("SELECT email, name FROM users WHERE role = 'user'");
    
    if (members.rows.length === 0) {
      return res.status(404).json({ message: "No members found to notify." });
    }

    let successCount = 0;
    let failureCount = 0;
    const failures: string[] = [];

    console.log(`📢 Starting broadcast to ${members.rows.length} members...`);

    // 2. Loop through members
    for (const member of members.rows) {
      try {
        await transporter.sendMail({
          from: `"Narrow Fitness" <${process.env.EMAIL_USER}>`,
          to: member.email,
          subject: subject,
          html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 15px; max-width: 600px;">
              <div style="background-color: #000; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px;">
                <h1 style="color: #f97316; margin: 0; font-style: italic;">Narrow Fitness</h1>
              </div>
              <h2 style="color: #333;">Important Announcement</h2>
              <p>Hi <b>${member.name}</b>,</p>
              <p style="font-size: 16px; line-height: 1.6; color: #444; background: #fdf2f0; padding: 15px; border-radius: 10px; border-left: 4px solid #f97316;">
                ${message}
              </p>
              <p style="color: #777; font-size: 13px; margin-top: 30px;">
                If you have questions, please contact the gym desk.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 10px; color: #999; text-align: center;">Narrow Fitness Management Team • Colombo, Sri Lanka</p>
            </div>
          `
        });
        successCount++;
      } catch (mailErr: any) {
        failureCount++;
        failures.push(`${member.email}: ${mailErr.message}`);
        console.error(`❌ Failed to send to ${member.email}:`, mailErr.message);
      }
    }

    // 3. Final Report
    console.log(`✅ Broadcast Finished. Success: ${successCount}, Failures: ${failureCount}`);

    if (failureCount > 0) {
      res.json({ 
        success: true, 
        message: `Broadcast completed with partial success.`,
        details: `${successCount} sent, ${failureCount} failed.`,
        errors: failures 
      });
    } else {
      res.json({ success: true, message: `Successfully sent to all ${successCount} members!` });
    }

  } catch (err: any) {
    console.error("❌ CRITICAL BROADCAST ERROR:", err.message);
    res.status(500).json({ message: "Could not initiate broadcast. Check server logs." });
  }
});
export default router;
