import { Router } from "express";
import bcrypt from 'bcryptjs';
import { query } from '../index.js'; 
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';

const memberRouter = Router();

// Use environment variable for Secret, or a fallback for development
const JWT_SECRET = process.env.JWT_SECRET || "narrow_fitness_secret_key_123";

// --- NODEMAILER CONFIGURATION ---
// SUGGESTION: Move 'user' and 'pass' to your .env file for safety
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify transporter connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ Nodemailer config error:", error);
  } else {
    console.log("📧 Mail server is ready to send OTPs");
  }
});

// --- ROUTE 1: REQUEST OTP ---
memberRouter.post("/auth/request-otp", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ message: "Email is required." });
  }

  try {
    // 1. Check if user already exists
    const userExists = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (userExists.rows.length > 0) {
        return res.status(400).json({ message: "Email already registered in our system." });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60000); // 5 Minutes from now

    // 3. Store OTP in database
    await query("DELETE FROM signup_otps WHERE email = $1", [email]); 
    await query("INSERT INTO signup_otps (email, otp, expiry) VALUES ($1, $2, $3)", [email, otp, expiry]);

    // 4. Send the Email
const mailOptions = {
  // We use backticks `` and ${} to inject the email from your .env file
  from: `"Narrow Fitness" <${process.env.EMAIL_USER}>`, 
  to: email,
  subject: "Verification Code: " + otp,
  html: `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #f97316;">Narrow Fitness</h2>
      <p>Your verification code for joining the elite is:</p>
      <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 30px; font-weight: bold; letter-spacing: 10px; color: #000;">
        ${otp}
      </div>
      <p style="color: #888; font-size: 12px; margin-top: 20px;">This code expires in 5 minutes.</p>
    </div>
  `
};

    await transporter.sendMail(mailOptions);
    console.log(`✅ OTP [${otp}] sent to ${email}`);
    res.status(200).json({ message: "OTP sent successfully. Please check your inbox." });

  } catch (err: any) {
    console.error("OTP Error:", err);
    res.status(500).json({ message: "Failed to send email. Please try again later." });
  }
});

// --- ROUTE 2: VERIFY OTP & SIGNUP ---
memberRouter.post("/auth/signup", async (req, res) => {
  const { name, email, password, otp } = req.body;

  if (!otp || !email || !password || !name) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    // 1. Verify OTP from DB
    const otpRes = await query(
        "SELECT * FROM signup_otps WHERE email = $1 AND otp = $2 AND expiry > NOW()", 
        [email, otp]
    );

    if (otpRes.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired OTP code." });
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10);
    const role = email.toLowerCase().includes("admin") ? "admin" : "user";

    // 3. Create the User (5 parameters)
    const result = await query(
      "INSERT INTO users (name, email, password, role, is_profile_complete) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role, is_profile_complete",
      [name, email, hashedPassword, role, false]
    );

    // 4. Delete the OTP after successful signup
    await query("DELETE FROM signup_otps WHERE email = $1", [email]);

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    console.log(`✅ New user created: ${email}`);

    // Return the user object so the Frontend Guard (is_profile_complete) works immediately
    res.status(201).json({ 
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_profile_complete: user.is_profile_complete
      }, 
      token 
    });

  } catch (err: any) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Signup failed. Email might already be taken." });
  }
});
// --- FORGOT PASSWORD: STEP 1 - REQUEST OTP ---
memberRouter.post("/auth/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    // 1. Check if the user exists in the system
    const userRes = await query("SELECT id FROM users WHERE email = $1", [email]);
    
    // For security, if email doesn't exist, we still say "check your email" 
    // but we don't actually send anything. This prevents "email fishing".
    if (userRes.rows.length === 0) {
      return res.status(200).json({ message: "If your email is registered, you will receive an OTP shortly." });
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 5 * 60000); // 5 Minutes valid

    // 3. Store in password_reset_otps table (Overwrite if one already exists for this email)
    await query("DELETE FROM password_reset_otps WHERE email = $1", [email]);
    await query("INSERT INTO password_reset_otps (email, otp, expiry) VALUES ($1, $2, $3)", [email, otp, expiry]);

    // 4. Send Email
    const mailOptions = {
      from: `"Narrow Fitness Security" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Code: " + otp,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #f97316;">Narrow Fitness</h2>
          <p>We received a request to reset your password. Use the verification code below:</p>
          <div style="background: #000; color: #fff; padding: 15px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px;">
            ${otp}
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #777;">This code expires in 5 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`🔐 Password Reset OTP sent to: ${email}`);
    res.status(200).json({ message: "Verification code sent to your email." });

  } catch (err: any) {
    console.error("Forgot Password Error:", err.message);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
});

// --- FORGOT PASSWORD: STEP 2 - VERIFY OTP & RESET PASSWORD ---
// 2. VERIFY RESET OTP (This was MISSING and caused the error)
memberRouter.post("/auth/verify-reset-otp", async (req, res) => {
  const { email, otp } = req.body;
  try {
    const result = await query(
      "SELECT * FROM password_reset_otps WHERE email = $1 AND otp = $2 AND expiry > NOW()",
      [email, otp]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    res.status(200).json({ success: true, message: "OTP verified. Proceed to reset password." });
  } catch (err: any) {
    res.status(500).json({ message: "Server error during verification." });
  }
});

// 3. RESET PASSWORD (Updated to match your requirements)
memberRouter.post("/auth/reset-password", async (req, res) => {
  const { email, otp, newPassword } = req.body;

  try {
    // Verify OTP one last time before changing password
    const otpCheck = await query(
      "SELECT * FROM password_reset_otps WHERE email = $1 AND otp = $2 AND expiry > NOW()",
      [email, otp]
    );

    if (otpCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or expired verification code." });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the Users table
    const userUpdate = await query(
      "UPDATE users SET password = $1 WHERE email = $2 RETURNING id, name, email, role, is_profile_complete", 
      [hashedPassword, email]
    );

    // Clean up: Delete the used OTP
    await query("DELETE FROM password_reset_otps WHERE email = $1", [email]);

    console.log(`✅ Password successfully reset for: ${email}`);

    // LOG USER IN IMMEDIATELY
    const user = userUpdate.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: "24h" });

    res.status(200).json({ 
      success: true, 
      message: "Password updated successfully!",
      user,
      token 
    });

  } catch (err: any) {
    console.error("Reset Password Error:", err.message);
    res.status(500).json({ message: "Database error during password reset." });
  }
});

  //workout 
// 1. Fetch List of Workouts (Already exists, but good to have)
memberRouter.get("/workouts/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query(
      "SELECT id, title, source_type, file_name, is_active, created_at FROM workouts WHERE userid = $1 ORDER BY created_at DESC",
      [userId]
    );
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: "Server error fetching workouts" });
  }
});

// 2. Fetch specific active workout (For AI Assistant)
memberRouter.get("/workouts/active/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query(
      "SELECT title, content FROM workouts WHERE userid = $1 AND is_active = TRUE LIMIT 1",
      [userId]
    );
    res.json(result.rows[0] || { message: "No active plan found" });
  } catch (err: any) {
    res.status(500).json({ message: "Error identifying active plan" });
  }
});

// 3. Fetch full content for reading
memberRouter.get("/workouts/detail/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query("SELECT * FROM workouts WHERE id = $1", [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: "Plan not found" });
    res.json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Error loading content" });
  }
});

// 3. NEW: UPDATE an existing workout plan
memberRouter.put("/workouts/:id", async (req, res) => {
  const { id } = req.params;
  const { title, sourceType, content, fileName } = req.body;

  try {
    console.log(`📡 Updating Workout Plan ID: ${id}`);
    
    const result = await query(
      `UPDATE workouts 
       SET title = $1, source_type = $2, content = $3, file_name = $4 
       WHERE id = $5 
       RETURNING *`,
      [title, sourceType, content, fileName, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Plan not found" });
    }

    res.json({ message: "Plan updated successfully", plan: result.rows[0] });
  } catch (err: any) {
    console.error("❌ Update Error:", err.message);
    res.status(500).json({ message: "Failed to update workout plan" });
  }
});

// 4. Save a new workout
memberRouter.post("/workouts", async (req, res) => {
  const { userId, title, sourceType, content, fileName } = req.body;
  if (!userId || !title || !content || !sourceType) {
    return res.status(400).json({ message: "Missing required fields." });
  }
  try {
    const result = await query(
      "INSERT INTO workouts (userid, title, source_type, content, file_name, is_active) VALUES ($1, $2, $3, $4, $5, FALSE) RETURNING *",
      [userId, title, sourceType, content, fileName || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Internal Server Error: " + err.message });
  }
});

// 5. Activate a workout
memberRouter.put("/workouts/activate/:id", async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  try {
    await query("UPDATE workouts SET is_active = FALSE WHERE userid = $1", [userId]);
    const result = await query("UPDATE workouts SET is_active = TRUE WHERE id = $1 RETURNING *", [id]);
    res.json({ message: "Workout activated!", workout: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ message: "Activation failed" });
  }
});

// 6. Delete a workout
memberRouter.delete("/workouts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM workouts WHERE id = $1", [id]);
    res.json({ message: "Plan deleted successfully." });
  } catch (err: any) {
    res.status(500).json({ message: "Could not delete plan." });
  }
});
//greetings email for new users 



// --- CLASS & BOOKING ROUTES ---

// 7. DEFINITIVE CLASS ROUTE (Includes "Reserved/Pending" status)
// Frontend should call: fetch(`/api/member/classes?userId=${user.id}`)
memberRouter.get("/classes", async (req, res) => {
  const userId = req.query.userId;
  try {
    const result = await query(`
      SELECT 
        c.*, 
        t.name as trainer_name,
        (SELECT status FROM class_bookings cb 
         WHERE cb.class_id = c.id AND cb.userid = $1 LIMIT 1) as booking_status
      FROM classes c 
      LEFT JOIN trainers t ON c.trainer_id = t.id 
      ORDER BY c.class_day ASC, c.class_time ASC
    `, [userId || 0]);
    res.json(result.rows);
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching classes" });
  }
});

// 8. Request to join a class
memberRouter.post("/classes/join", async (req, res) => {
  const { classId, userId } = req.body;
  try {
    const check = await query("SELECT * FROM class_bookings WHERE class_id = $1 AND userid = $2", [classId, userId]);
    if (check.rows.length > 0) return res.status(400).json({ message: "You have already applied for this class." });

    await query("INSERT INTO class_bookings (class_id, userid, status) VALUES ($1, $2, 'pending')", [classId, userId]);
    res.status(200).json({ message: "Request sent to coach!" });
  } catch (err: any) {
    res.status(500).json({ message: "Database error." });
  }
});


// --- PROFILE & SETTINGS ROUTES ---

memberRouter.get("/profile/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await query(`
      SELECT 
        mp.*, 
        u.subscription_status, 
        u.package_id,
        p.name as package_name
      FROM memberprofiles mp
      JOIN users u ON mp.userid = u.id
      LEFT JOIN pricing p ON u.package_id = p.id
      WHERE mp.userid = $1
    `, [userId]);

    if (result.rows.length === 0) return res.status(404).json({ message: "Profile not found" });
    res.status(200).json(result.rows[0]);
  } catch (err: any) {
    res.status(500).json({ message: "Error fetching profile" });
  }
});

// 10. Secure Security Update
memberRouter.put("/update-security", async (req, res) => {
  const { userId, name, currentPassword, newPassword, profileImage } = req.body;
  try {
    const userResult = await query("SELECT * FROM users WHERE id = $1", [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ message: "User not found." });
    const dbUser = userResult.rows[0];

    // Image-only quick bypass
    if (profileImage && currentPassword === "BYPASS_FOR_IMAGE") {
      await query("UPDATE users SET profile_image = $1 WHERE id = $2", [profileImage, userId]);
      return res.status(200).json({ success: true, message: "Photo updated!" });
    }

    const isMatch = await bcrypt.compare(currentPassword, dbUser.password);
    if (!isMatch) return res.status(401).json({ message: "The current password you entered is incorrect." });

    let updates = [];
    let params = [];
    params.push(name || dbUser.name);
    updates.push(`name = $${params.length}`);

    if (newPassword && newPassword.trim() !== "") {
      const hashedPass = await bcrypt.hash(newPassword, 10);
      params.push(hashedPass);
      updates.push(`password = $${params.length}`);
    }

    if (profileImage) {
      params.push(profileImage);
      updates.push(`profile_image = $${params.length}`);
    }

    params.push(userId);
    const queryStr = `UPDATE users SET ${updates.join(", ")} WHERE id = $${params.length}`;
    await query(queryStr, params);
    res.status(200).json({ success: true, message: "Account updated successfully!" });
  } catch (err) {
    res.status(500).json({ message: "Database error during security update." });
  }
});
const sendGreetingEmail = async (email: string, name: string, data: any) => {
  const mailOptions = {
    from: `"Narrow Fitness Elite" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "YOUR PROFILE IS LIVE | Narrow Fitness Elite",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; background-color: #000; color: #fff; padding: 40px; border-radius: 20px; border: 1px solid #333;">
        <h1 style="color: #f97316; text-transform: uppercase; font-style: italic;">Welcome to the Elite, ${name}</h1>
        <p style="color: #aaa; font-size: 14px;">Your registration and onboarding are officially complete. Your physical data has been synchronized with our AI coaching systems.</p>
        
        <div style="background-color: #111; padding: 20px; border-radius: 15px; border-left: 4px solid #f97316; margin: 25px 0;">
          <h3 style="color: #f97316; margin-top: 0; font-size: 12px; text-transform: uppercase;">Blueprint Summary</h3>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Target Goal:</strong> ${data.goal}</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Starting Weight:</strong> ${data.weight} kg</p>
          <p style="margin: 5px 0; font-size: 14px;"><strong>Height:</strong> ${data.height} cm</p>
        </div>

        <p style="font-size: 13px; color: #666; font-style: italic; text-align: center;">"Results are earned, not given. Your journey starts now."</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="http://localhost:5173/member" style="background-color: #f97316; color: #fff; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 12px; text-transform: uppercase;">Access Member Hub</a>
        </div>
      </div>
    `
  };
  return transporter.sendMail(mailOptions);
};

// --- 11. Save Physical Record (Sync with Password check) ---
memberRouter.post("/profile-secure", async (req, res) => {
  const { userId, currentPassword, gender, dob, phone, address, current_weight, height, target_weight, medical_conditions, medical_details, has_injuries, injury_details, has_allergies, allergy_details, primary_goal, activity_level, emergency_contact_name, emergency_contact_phone } = req.body;
  
  try {
    const userRes = await query("SELECT email, name, password FROM users WHERE id = $1", [userId]);
    const user = userRes.rows[0];
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(401).json({ message: "Verification failed." });

    const profileExists = await query("SELECT userid FROM memberprofiles WHERE userid = $1", [userId]);
    if (profileExists.rows.length > 0) {
        await query(`UPDATE memberprofiles SET gender=$2, dob=$3, phone=$4, address=$5, current_weight=$6, height=$7, target_weight=$8, medical_conditions=$9, medical_details=$10, has_injuries=$11, injury_details=$12, has_allergies=$13, allergy_details=$14, primary_goal=$15, activity_level=$16, emergency_contact_name=$17, emergency_contact_phone=$18, updated_at=now() WHERE userid = $1`, 
          [userId, gender, dob, phone, address, current_weight, height, target_weight, medical_conditions, medical_details, has_injuries, injury_details, has_allergies, allergy_details, primary_goal, activity_level, emergency_contact_name, emergency_contact_phone]);
    } else {
        await query(`INSERT INTO memberprofiles (userid, gender, dob, phone, address, current_weight, height, target_weight, medical_conditions, medical_details, has_injuries, injury_details, has_allergies, allergy_details, primary_goal, activity_level, emergency_contact_name, emergency_contact_phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, 
          [userId, gender, dob, phone, address, current_weight, height, target_weight, medical_conditions, medical_details, has_injuries, injury_details, has_allergies, allergy_details, primary_goal, activity_level, emergency_contact_name, emergency_contact_phone]);
    }

    // Trigger Email
    sendGreetingEmail(user.email, user.name, { goal: primary_goal, weight: current_weight, height: height }).catch(e => console.error(e));
    
    res.status(200).json({ success: true, message: "Profile saved and synced." });
  } catch (err) {
    res.status(500).json({ message: "Database Error" });
  }
});

// --- 12. Standard Profile Save (Legacy support for Onboarding) ---
memberRouter.post("/profile", async (req, res) => {
    const { userId, gender, dob, phone, address, weight, height, targetWeight, medicalConditions, medicalDetails, hasInjuries, injuryDetails, hasAllergies, allergyDetails, primaryGoal, activityLevel, emergencyName, emergencyPhone, profileImage } = req.body;
    
    try {
      const userRes = await query("SELECT email, name FROM users WHERE id = $1", [userId]);
      const user = userRes.rows[0];

      const profileExists = await query("SELECT userid FROM memberprofiles WHERE userid = $1", [userId]);
      if (profileExists.rows.length > 0) {
        await query(`UPDATE memberprofiles SET gender=$2, dob=$3, phone=$4, address=$5, current_weight=$6, height=$7, target_weight=$8, medical_conditions=$9, medical_details=$10, has_injuries=$11, injury_details=$12, has_allergies=$13, allergy_details=$14, primary_goal=$15, activity_level=$16, emergency_contact_name=$17, emergency_contact_phone=$18, updated_at=now() WHERE userid = $1`, 
          [userId, gender, dob, phone, address, weight, height, targetWeight, medicalConditions, medicalDetails, hasInjuries, injuryDetails, hasAllergies, allergyDetails, primaryGoal, activityLevel, emergencyName, emergencyPhone]);
      } else {
        await query(`INSERT INTO memberprofiles (userid, gender, dob, phone, address, current_weight, height, target_weight, medical_conditions, medical_details, has_injuries, injury_details, has_allergies, allergy_details, primary_goal, activity_level, emergency_contact_name, emergency_contact_phone) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`, 
          [userId, gender, dob, phone, address, weight, height, targetWeight, medicalConditions, medicalDetails, hasInjuries, injuryDetails, hasAllergies, allergyDetails, primaryGoal, activityLevel, emergencyName, emergencyPhone]);
      }

      await query("UPDATE users SET is_profile_complete = TRUE, profile_image = $1 WHERE id = $2", [profileImage || null, userId]);

      // Trigger Email
      sendGreetingEmail(user.email, user.name, { goal: primaryGoal, weight: weight, height: height }).catch(e => console.error(e));

      res.status(200).json({ message: "Welcome email sent and profile completed." });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
});

// --- 2. MEMBERSHIP ACTIVATION (FIXED & UNIFIED) ---
memberRouter.post("/activate-plan", async (req, res) => {
  const { userId, code, planId } = req.body;
  console.log(`[Server] Activation attempt: User ${userId}, Plan ${planId}, Code ${code}`);

  try {
    // A. Verify code matches plan and is unused
    const codeRes = await query(
      "SELECT * FROM activation_codes WHERE code = $1 AND is_used = FALSE AND package_id = $2",
      [code, planId]
    );

    if (codeRes.rows.length === 0) {
      return res.status(400).json({ message: "Invalid or already used activation code for this plan." });
    }

    // B. Fetch details for Email (Name, Email, and Plan Name)
    const userDetails = await query("SELECT name, email, subscription_status FROM users WHERE id = $1", [userId]);
    const planDetails = await query("SELECT name FROM pricing WHERE id = $1", [planId]);

    const user = userDetails.rows[0];
    const planName = planDetails.rows[0].name;
    const isUpgrade = user.subscription_status === 'active';

    // C. Update Database
    await query("UPDATE activation_codes SET is_used = TRUE WHERE code = $1", [code]);
    const updatedUserRes = await query(
      `UPDATE users 
       SET subscription_status = 'active', package_id = $1 
       WHERE id = $2 
       RETURNING id, name, email, role, is_profile_complete, profile_image, subscription_status, package_id`,
      [planId, userId]
    );

    // D. SEND ACTIVATION EMAIL
    const mailOptions = {
      from: `"Narrow Fitness" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: isUpgrade ? "Elite Upgrade Confirmed!" : "Membership Activated: " + planName,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
          <h2 style="color: #f97316;">${isUpgrade ? 'Tier Upgraded' : 'Welcome to the Elite Tier'}</h2>
          <p>Hi <b>${user.name}</b>,</p>
          <p>Your activation code has been verified. Your <b>${planName}</b> membership is now <b>Active</b>.</p>
          <div style="background: #000; color: #fff; padding: 20px; border-radius: 15px; margin: 20px 0; text-align: center;">
            <p style="margin: 0; font-size: 10px; color: #f97316; text-transform: uppercase;">Active Package</p>
            <h2 style="margin: 5px 0; font-style: italic;">${planName}</h2>
          </div>
          <p>Start using your Pro features like the AI Coach and Training Vault today!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin-top: 30px;" />
          <p style="font-size: 10px; color: #888; text-align: center;">Narrow Fitness Digital Management</p>
        </div>
      `
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) console.log("❌ Mail Error:", err.message);
        else console.log("📧 Activation email sent to:", user.email);
    });

    res.status(200).json({ 
      success: true, 
      message: "Membership activated! Email sent.",
      user: updatedUserRes.rows[0] 
    });

  } catch (err: any) {
    console.error("❌ Activation Error:", err.message);
    res.status(500).json({ message: "Internal server error during activation." });
  }
});

memberRouter.post("/cancel-plan", async (req, res) => {
  const { userId } = req.body;

  try {
    // 1. Fetch details from DB FIRST (This creates the 'user' variable)
    const userRes = await query(`
        SELECT u.email, u.name, p.name as plan_name 
        FROM users u 
        LEFT JOIN pricing p ON u.package_id = p.id 
        WHERE u.id = $1`, [userId]);
    
    // 2. Extract the first row into the 'user' constant
    const user = userRes.rows[0];

    // Check if user actually exists to avoid crashing
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }

    // 3. Update Database status to none
    await query("UPDATE users SET subscription_status = 'none', package_id = NULL WHERE id = $1", [userId]);

    // 4. Now 'user' is defined, so mailOptions will work
    const mailOptions = {
      from: `"Narrow Fitness"<${process.env.EMAIL_USER}>`, 
      to: user.email, // This 'user' now exists!
      subject: "Membership Cancellation Confirmation - Narrow Fitness",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #000; padding: 30px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-style: italic; text-transform: uppercase;">Narrow Fitness</h1>
          </div>
          <div style="padding: 40px; background-color: #ffffff;">
            <h2 style="color: #1a202c;">Subscription Update</h2>
            <p>Dear <b>${user.name}</b>,</p>
            <p>This email is to formally confirm that your <b>${user.plan_name}</b> membership has been cancelled.</p>
            <div style="background-color: #fff5f5; border-left: 4px solid #f56565; padding: 20px; margin: 25px 0;">
              <p style="margin: 0; color: #c53030; font-size: 13px;">
                Access to the Training Vault and AI Coach has been deactivated.
              </p>
            </div>
            <p>Stay strong,<br/><span style="color: #f97316;">Narrow Fitness Management</span></p>
          </div>
        </div>
      `
    };

    // 5. Send the mail
    transporter.sendMail(mailOptions, (err) => {
        if (err) console.log("❌ Email failed:", err.message);
        else console.log("📧 Cancellation email sent to:", user.email);
    });

    res.status(200).json({ success: true, message: "Subscription cancelled and user notified." });

  } catch (err: any) {
    console.error(err.message);
    res.status(500).json({ message: "Server error during cancellation." });
  }
});
// real time update 

// memberRoutes.ts

memberRouter.post("/classes/join", async (req, res) => {
  const { classId, userId } = req.body;

  try {
    // 1. Your existing DB logic to save the booking
    await query(
      "INSERT INTO bookings (class_id, user_id, status) VALUES ($1, $2, 'pending')",
      [classId, userId]
    );

    // 2. REAL-TIME NOTIFICATION TO ADMIN
    const io = req.app.get("socketio"); // Get the socket from server.tsx
    
    io.emit("admin_notification", {
      type: "NEW_BOOKING",
      message: "A new athlete has requested a seat in a class!",
      timestamp: new Date()
    });

    res.status(200).json({ message: "Request sent to coach!" });
  } catch (err) {
    res.status(500).json({ message: "Error joining class" });
  }
});
memberRouter.post("/classes/join", async (req, res) => {
  // ... your save logic ...
  
  // SILENT SIGNAL: Tell Admin to refresh their dashboard
  const io = req.app.get("socketio");
  io.emit("silent_admin_refresh"); 

  res.status(200).json({ success: true });
});

export default memberRouter;