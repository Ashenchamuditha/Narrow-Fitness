import { Router } from "express";
import { query } from '../../api/index.js'; 
const aiRouter = Router();

// --- 1. FETCH CHAT HISTORY & STATUS ---
aiRouter.get("/history/:userId", async (req, res) => {
  const { userId } = req.params;
  
  if (!userId || userId === 'undefined') {
    return res.status(400).json({ messages: [], usage: null });
  }

  try {
    const historyResult = await query(
      "SELECT role, message, created_at FROM chat_history WHERE userid = $1 ORDER BY created_at ASC LIMIT 100",
      [userId]
    );

    const usageResult = await query(
      "SELECT daily_count, last_reset, last_message_at FROM ai_usage WHERE userid = $1",
      [userId]
    );

    res.status(200).json({
      messages: historyResult.rows || [],
      usage: usageResult.rows[0] || null
    });
  } catch (err: any) {
    res.status(500).json({ message: "Error retrieving history" });
  }
});

// --- 2. MAIN CHAT ROUTE (With Full Onboarding Context) ---
aiRouter.post("/chat", async (req, res) => {
  const { userId, message } = req.body;
  const apiKey = process.env.GROQ_API_KEY?.trim() || "";
  const uid = Number(userId);

  if (!uid || !message) {
    return res.status(400).json({ message: "Missing User ID or Message" });
  }

  try {
    console.log(`\n--- [AI] Processing Elite Analysis for UID: ${uid} ---`);

    // A. FETCH COMPLETE ATHLETE CONTEXT (Onboarding + Package + Usage)
    const dataRes = await query(`
      SELECT 
        u.name, u.role, 
        p.gender, p.dob, p.current_weight, p.height, p.target_weight,
        p.primary_goal, p.activity_level, p.medical_conditions, p.other_medical,
        p.has_injuries, p.injury_details, p.has_allergies, p.allergy_details,
        pr.name as package_name,
        au.daily_count, au.last_reset, au.last_message_at
      FROM users u
      LEFT JOIN memberprofiles p ON u.id = p.userid
      LEFT JOIN pricing pr ON p.package_id = pr.id
      LEFT JOIN ai_usage au ON u.id = au.userid
      WHERE u.id = $1`, [uid]);

    const userData = dataRes.rows[0];
    if (!userData) return res.status(404).json({ message: "Athlete record not found." });
    
    // B. CALCULATE AGE & PREPARE STRINGS
    const birthDate = new Date(userData.dob);
    const age = userData.dob ? new Date().getFullYear() - birthDate.getFullYear() : "Unknown";
    const medical = Array.isArray(userData.medical_conditions) ? userData.medical_conditions.join(", ") : "None";

    // C. DETERMINE TIER LIMITS
    const packageName = (userData.package_name || '').toLowerCase();
    const userRole = (userData.role || '').toLowerCase();
    const isPremium = packageName.includes('pro') || packageName.includes('elite') || userRole === 'admin' || userRole === 'trainer';
    const DAILY_LIMIT = isPremium ? 100 : 5;
    
    // D. USAGE & COOLDOWN LOGIC
    const now = new Date();
    const today = now.toLocaleDateString('en-CA'); 
    let currentCount = 0;

    if (userData.daily_count === null) {
      await query("INSERT INTO ai_usage (userid, daily_count, last_reset, last_message_at) VALUES ($1, 1, $2, NOW())", [uid, today]);
      currentCount = 1;
    } else {
      const lastResetDate = new Date(userData.last_reset).toLocaleDateString('en-CA');
      const lastMsgTime = new Date(userData.last_message_at);
      const hoursPassed = (now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60);

      if (lastResetDate !== today) {
        await query("UPDATE ai_usage SET daily_count = 1, last_reset = $1, last_message_at = NOW() WHERE userid = $2", [today, uid]);
        currentCount = 1;
      } else if (!isPremium && userData.daily_count >= DAILY_LIMIT) {
        if (hoursPassed < 2) {
          const unlockTime = new Date(lastMsgTime.getTime() + (2 * 60 * 60 * 1000)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return res.status(403).json({ 
            message: `Daily free limit reached. Your chat will unblock at ${unlockTime}.`,
            usage: { current: userData.daily_count, max: DAILY_LIMIT }
          });
        } else {
          await query("UPDATE ai_usage SET daily_count = 1, last_message_at = NOW() WHERE userid = $1", [uid]);
          currentCount = 1;
        }
      } else {
        const updateRes = await query(
          "UPDATE ai_usage SET daily_count = daily_count + 1, last_message_at = NOW() WHERE userid = $1 RETURNING daily_count", 
          [uid]
        );
        currentCount = updateRes.rows[0].daily_count;
      }
    }

    // E. FETCH ACTIVE WORKOUT PLAN
    let workoutContext = "No specific workout plan assigned yet.";
    try {
      const workoutResult = await query("SELECT title, content FROM workouts WHERE userid = $1 AND is_active = true LIMIT 1", [uid]);
      if (workoutResult.rows.length > 0) {
        workoutContext = `Current Active Plan: ${workoutResult.rows[0].title}. Exercises: ${workoutResult.rows[0].content}`;
      }
    } catch (e) { console.log("Workout context skipped."); }

    // F. BUILD THE MASTER SYSTEM PROMPT (The "Brain")
    const systemPrompt = `You are the "Narrow Fitness AI Coach", a high-level athletic advisor. 
    You are speaking with ${userData.name}. Use the following biological and medical data for every response:
    
    ATHLETE PROFILE:
    - Age: ${age} | Gender: ${userData.gender}
    - Biometrics: ${userData.current_weight}kg, ${userData.height}cm
    - Target Weight: ${userData.target_weight || 'Not specified'}kg
    - Activity Level: ${userData.activity_level}
    - Primary Fitness Goal: ${userData.primary_goal}
    
    MEDICAL & SAFETY:
    - Known Conditions: ${medical}
    - Other Medical Info: ${userData.other_medical || 'None'}
    - Injury History: ${userData.has_injuries ? userData.injury_details : 'No current injuries'}
    - Allergies: ${userData.has_allergies ? userData.allergy_details : 'No known allergies'}
    
    CURRENT PROGRAMMING:
    - ${workoutContext}

    STRICT OPERATIONAL RULES:
    1. Always prioritize safety based on the Athlete's injuries and medical conditions.
    2. Provide Workout Routines and Diet Plans ONLY in neatly formatted Markdown Tables.
    3. Stay professional, motivating, and strictly focused on Fitness, Nutrition, and Recovery.
    4. If the user asks non-fitness questions, politely redirect them to their goals.
    5. Be concise. Your athletes are busy training.`;

    // G. CALL GROQ API
    console.log(`📡 [Groq] Generating response for ${userData.name}...`);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
        temperature: 0.4, // Balanced creativity and precision
        max_tokens: 2500
      })
    });

    const data: any = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "Groq AI connection lost.");
    
    const responseText = data.choices[0].message.content;

    // H. SAVE TO CHAT HISTORY
    await query("INSERT INTO chat_history (userid, role, message) VALUES ($1, 'user', $2), ($1, 'model', $3)", [uid, message, responseText]);

    console.log(`✅ [AI] Analysis complete. Usage: ${currentCount}/${DAILY_LIMIT}`);
    
    res.json({ 
      text: responseText, 
      usage: { current: currentCount, max: DAILY_LIMIT } 
    });

  } catch (err: any) {
    console.error("❌ AI ROUTE ERROR:", err.message);
    res.status(500).json({ message: "AI Coach is analyzing data. Please try again in 30 seconds." });
  }
});

export default aiRouter;