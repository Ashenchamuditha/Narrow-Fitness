import { Router } from "express";
import { query } from "../index.js";
import { createInAppNotification } from '../services/notificationService.js';

const attendanceRouter = Router();

// --- ADMIN: FETCH ALL ATTENDANCE ---
attendanceRouter.get("/", async (req, res) => {
  const { date, userId } = req.query;
  try {
    let queryStr = `
      SELECT a.*, u.name, u.email 
      FROM attendance a
      JOIN users u ON a.userid = u.id
    `;
    const params = [];
    const conditions = [];

    if (date) {
      params.push(date);
      conditions.push(`a.attendance_date = $${params.length}`);
    }

    if (userId) {
      params.push(`%${userId}%`);
      const pIdx = params.length;
      
      if (!isNaN(Number(userId))) {
        conditions.push(`(u.name ILIKE $${pIdx} OR a.userid = ${Number(userId)})`);
      } else {
        conditions.push(`u.name ILIKE $${pIdx}`);
      }
    }

    if (conditions.length > 0) {
      queryStr += " WHERE " + conditions.join(" AND ");
    }

    queryStr += " ORDER BY a.check_in DESC";
    const result = await query(queryStr, params);
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Attendance Fetch Error:", err.message);
    res.status(500).json({ message: "Error fetching attendance" });
  }
});

// --- ADMIN: GET ATTENDANCE STATS ---
attendanceRouter.get("/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const totalToday = await query("SELECT COUNT(*) FROM attendance WHERE attendance_date = $1", [today]);
    const currentInGym = await query("SELECT COUNT(*) FROM attendance WHERE status = 'in-gym'");
    const avgDuration = await query("SELECT AVG(duration_minutes) FROM attendance WHERE status = 'completed'");
    const peakHour = await query(`
      SELECT EXTRACT(HOUR FROM check_in) as hour, COUNT(*) as count 
      FROM attendance 
      WHERE check_in > NOW() - INTERVAL '30 days'
      GROUP BY hour 
      ORDER BY count DESC 
      LIMIT 1
    `);

    res.json({
      totalToday: parseInt(totalToday.rows[0].count),
      currentInGym: parseInt(currentInGym.rows[0].count),
      avgDuration: Math.round(parseFloat(avgDuration.rows[0].avg) || 0),
      peakHour: peakHour.rows[0] ? `${peakHour.rows[0].hour}:00` : '--:--'
    });
  } catch (err: any) {
    console.error("❌ Stats Error:", err.message);
    res.status(500).json({ message: "Error fetching stats" });
  }
});

// --- ADMIN: GET ALL QR CONFIGS ---
attendanceRouter.get("/configs", async (req, res) => {
  try {
    const result = await query("SELECT * FROM attendance_configs ORDER BY created_at DESC");
    console.log(`✅ Fetched ${result.rows.length} QR configs`);
    res.json(result.rows);
  } catch (err: any) {
    console.error("❌ Configs Fetch Error:", err.message);
    res.status(500).json({ message: "Error fetching configs" });
  }
});

// --- ADMIN: ADD NEW QR CONFIG ---
attendanceRouter.post("/configs", async (req, res) => {
  const { location_name, qr_key } = req.body;
  try {
    console.log(`➕ Adding new config: ${location_name} (${qr_key})`);
    const result = await query(
      "INSERT INTO attendance_configs (location_name, qr_key, is_active) VALUES ($1, $2, TRUE) RETURNING *",
      [location_name, qr_key]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Add Config Error:", err.message);
    res.status(500).json({ message: "Error adding config" });
  }
});

// --- ADMIN: UPDATE QR CONFIG ---
attendanceRouter.put("/configs/:id", async (req, res) => {
  const { id } = req.params;
  const { location_name, qr_key, is_active } = req.body;
  try {
    const result = await query(
      `UPDATE attendance_configs 
       SET location_name = COALESCE($1, location_name), 
           qr_key = COALESCE($2, qr_key),
           is_active = COALESCE($3, is_active)
       WHERE id = $4 RETURNING *`,
      [location_name, qr_key, is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Update Config Error:", err.message);
    res.status(500).json({ message: "Error updating config" });
  }
});

// --- ADMIN: DELETE QR CONFIG ---
attendanceRouter.delete("/configs/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const check = await query("SELECT is_active FROM attendance_configs WHERE id = $1", [id]);
    const wasActive = check.rows[0]?.is_active;

    await query("DELETE FROM attendance_configs WHERE id = $1", [id]);

    // Ensure at least one config exists and is active
    const remaining = await query("SELECT id FROM attendance_configs LIMIT 1");
    if (remaining.rows.length === 0) {
      const defaultKey = `NF-ATTEND-${Math.random().toString(36).substring(2, 7).toUpperCase()}-2026`;
      await query("INSERT INTO attendance_configs (qr_key, location_name, is_active) VALUES ($1, 'Main Entrance', TRUE)", [defaultKey]);
    } else if (wasActive) {
      await query("UPDATE attendance_configs SET is_active = TRUE WHERE id = (SELECT id FROM attendance_configs LIMIT 1)");
    }

    res.json({ message: "Config deleted successfully" });
  } catch (err: any) {
    console.error("❌ Delete Config Error:", err.message);
    res.status(500).json({ message: "Error deleting config" });
  }
});

// --- ADMIN: TOGGLE QR CONFIG STATUS ---
attendanceRouter.post("/configs/toggle", async (req, res) => {
  const { id, is_active } = req.body;
  try {
    console.log(`🔘 Toggling config ID: ${id} to ${is_active}`);
    const result = await query(
      "UPDATE attendance_configs SET is_active = $1 WHERE id = $2 RETURNING *",
      [is_active, id]
    );
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Toggle Error:", err.message);
    res.status(500).json({ message: "Error toggling config" });
  }
});

// --- ADMIN: ROTATE & AUTOMATICALLY ACTIVATE QR KEY ---
attendanceRouter.post("/configs/rotate", async (req, res) => {
  const { locationId, newKey } = req.body;
  try {
    console.log(`🔄 Rotating key for ID ${locationId} to ${newKey}`);
    
    const result = await query(
      `UPDATE attendance_configs 
       SET qr_key = $1, 
           last_rotated_at = CURRENT_TIMESTAMP, 
           is_active = TRUE 
       WHERE id = $2 RETURNING *`,
      [newKey.trim(), locationId]
    );
    
    if (result.rows.length === 0) {
      console.warn(`⚠️ No config found with ID ${locationId}`);
      return res.status(404).json({ message: "Config not found" });
    }
    
    console.log(`✅ Key rotated and activated: ${result.rows[0].qr_key}`);
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Rotate Error:", err.message);
    res.status(500).json({ message: "Error rotating and activating QR key" });
  }
});

// --- ADMIN: ACTIVATE QR CONFIG ---
attendanceRouter.post("/configs/activate", async (req, res) => {
  const { id } = req.body;
  try {
    console.log(`🔘 Activating config ID: ${id}`);
    const result = await query(
      "UPDATE attendance_configs SET is_active = TRUE, last_rotated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *",
      [id]
    );
    console.log(`✅ Config ${id} activated.`);
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Activation Error:", err.message);
    res.status(500).json({ message: "Error activating config" });
  }
});

// --- MEMBER: GET CURRENT STATUS & LAST SESSION ---
attendanceRouter.get("/status/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const activeResult = await query(
      "SELECT * FROM attendance WHERE userid = $1 AND status = 'in-gym' ORDER BY check_in DESC LIMIT 1",
      [userId]
    );
    const lastResult = await query(
      "SELECT * FROM attendance WHERE userid = $1 AND status = 'completed' ORDER BY check_out DESC LIMIT 1",
      [userId]
    );
    res.json({
      active: activeResult.rows[0] || null,
      last: lastResult.rows[0] || null
    });
  } catch (err: any) {
    console.error("❌ Status Error:", err.message);
    res.status(500).json({ message: "Error fetching status" });
  }
});

// --- MEMBER: CHECK-IN ---
attendanceRouter.post("/check-in", async (req, res) => {
  const { userId, qrKey } = req.body;
  const cleanKey = qrKey?.trim();
  console.log(`📥 Check-in attempt: User ${userId}, Key: "${cleanKey}"`);
  
  try {
    // 1. Verify QR Key
    const configResult = await query(
      "SELECT id FROM attendance_configs WHERE qr_key = $1 AND is_active = TRUE",
      [cleanKey]
    );

    if (configResult.rows.length === 0) {
      console.warn(`❌ Invalid Key scan: "${cleanKey}"`);
      return res.status(400).json({ message: "Invalid QR Code. Please scan the current gym QR." });
    }

    // 2. AUTO-CHECKOUT LOGIC: Close stale sessions (older than 4 hours) or any active session
    const active = await query(
      "SELECT id, check_in FROM attendance WHERE userid = $1 AND status = 'in-gym' ORDER BY check_in DESC",
      [userId]
    );

    if (active.rows.length > 0) {
      console.log(`🧹 Auto-closing ${active.rows.length} existing active session(s) for user ${userId}`);
      for (const session of active.rows) {
        const checkIn = new Date(session.check_in);
        const checkOut = new Date();
        const duration = Math.max(60, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000)); // Default to 60m if too short or auto-closed
        
        await query(
          "UPDATE attendance SET check_out = $1, duration_minutes = $2, status = 'completed' WHERE id = $3",
          [checkOut, duration, session.id]
        );
      }
    }

    // 3. Perform new Check-in
    const result = await query(
      "INSERT INTO attendance (userid, status) VALUES ($1, 'in-gym') RETURNING *",
      [userId]
    );
    
    console.log(`✅ Check-in success: User ${userId}`);
    
    // Trigger In-App Notification
    try {
      await createInAppNotification(
        req.app, 
        userId, 
        "Check-in Success", 
        "Welcome to Narrow Fitness! Your training session has started. Push your limits today!",
        "success",
        "/member"
      );
    } catch (nErr) { console.error("Notification failed:", nErr); }

    const io = req.app.get("socketio");
    if (io) io.emit("silent_admin_refresh");

    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Check-in DB Error:", err.message);
    res.status(500).json({ message: "Check-in failed" });
  }
});

// --- MEMBER: CHECK-OUT ---
attendanceRouter.post("/check-out", async (req, res) => {
  const { userId, qrKey } = req.body;
  const cleanKey = qrKey?.trim();
  console.log(`📤 Check-out attempt: User ${userId}, Key: "${cleanKey}"`);

  try {
    const configResult = await query(
      "SELECT id FROM attendance_configs WHERE qr_key = $1 AND is_active = TRUE",
      [cleanKey]
    );

    if (configResult.rows.length === 0) {
      console.warn(`❌ Invalid Key scan: "${cleanKey}"`);
      return res.status(400).json({ message: "Invalid QR Code. Please scan the current gym QR." });
    }

    const active = await query(
      "SELECT id, check_in FROM attendance WHERE userid = $1 AND status = 'in-gym' ORDER BY check_in DESC LIMIT 1",
      [userId]
    );

    if (active.rows.length === 0) {
      return res.status(400).json({ message: "No active session found to check out." });
    }

    const attendanceId = active.rows[0].id;
    const checkIn = new Date(active.rows[0].check_in);
    const checkOut = new Date();
    const duration = Math.round((checkOut.getTime() - checkIn.getTime()) / 60000);

    const result = await query(
      `UPDATE attendance 
       SET check_out = $1, duration_minutes = $2, status = 'completed' 
       WHERE id = $3 RETURNING *`,
      [checkOut, duration, attendanceId]
    );

    console.log(`✅ Check-out success: User ${userId}, Duration: ${duration}m`);

    // Trigger In-App Notification
    try {
      await createInAppNotification(
        req.app, 
        userId, 
        "Check-out Success", 
        `Session completed. You trained for ${duration} minutes. Great work today!`,
        "info",
        "/member"
      );
    } catch (nErr) { console.error("Notification failed:", nErr); }

    const io = req.app.get("socketio");
    if (io) io.emit("silent_admin_refresh");

    res.json(result.rows[0]);
  } catch (err: any) {
    console.error("❌ Check-out DB Error:", err.message);
    res.status(500).json({ message: "Check-out failed" });
  }
});

export default attendanceRouter;
