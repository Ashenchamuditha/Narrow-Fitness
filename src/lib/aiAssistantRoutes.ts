import { Router, Response } from "express";
import { query } from '../../api/index.js';
import multer from 'multer';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const mammoth = require('mammoth'); 
const pdfLib = require('pdf-parse'); 

// --- FIXED HELPER WITH TYPES ---
const safePdfParse = async (buffer: Buffer): Promise<any> => {
  try {
    // We cast to 'any' to stop the red lines on .default and .pdf
    const lib = pdfLib as any;

    if (typeof lib === 'function') return await lib(buffer);
    if (lib.default && typeof lib.default === 'function') return await lib.default(buffer);
    if (lib.pdf && typeof lib.pdf === 'function') return await lib.pdf(buffer);
    
    throw new Error("PDF parser function not found in library.");
  } catch (err) {
    throw err;
  }
};

const aiRouter = Router();

// --- 1. CONFIGURATION ---
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit for Vercel stability
});

// --- 2. SESSION & HISTORY ---
aiRouter.get("/sessions/:userId", async (req, res) => {
  const uid = Number(req.params.userId);
  try {
    const result = await query("SELECT id, title, created_at FROM chat_sessions WHERE userid = $1 ORDER BY created_at DESC", [uid]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: "failed to load sessions" }); }
});

aiRouter.post("/sessions/new", async (req, res) => {
  const { userId, title } = req.body;
  try {
    const result = await query("INSERT INTO chat_sessions (userid, title) VALUES ($1, $2) RETURNING *", [userId, title || 'new workout chat']);
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ message: "failed to create session" }); }
});

aiRouter.get("/history/:sessionId", async (req, res) => {
  const sid = Number(req.params.sessionId);
  try {
    const result = await query(`SELECT id, role, message, input_type, file_name, created_at FROM chat_history WHERE session_id = $1 ORDER BY created_at ASC`, [sid]);
    res.json({ messages: result.rows });
  } catch (err) { res.status(500).json({ messages: [] }); }
});

// --- 4. MEDIA EXTRACTION ENGINE (FIXED) ---
aiRouter.post("/process-media", upload.single('file'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "no file uploaded" });

  const mimeType = req.file.mimetype;
  const fileName = req.file.originalname;
  const apiKey = process.env.GROQ_API_KEY?.trim() || "";

  try {
    let rawText = "";

    // 1. Handle Word (.docx)
    if (mimeType.includes('officedocument') || fileName.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      rawText = result.value;
    }
    // 2. Handle PDF (Using the safe helper)
    else if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      console.log(`📄 Parsing PDF: ${fileName}`);
      const data = await safePdfParse(req.file.buffer);
      rawText = data.text;
    }
    // 3. Handle Images (Using the STABLE llava model)
    else if (mimeType.startsWith('image/')) {
      console.log(`📸 Parsing Image: ${fileName}`);
      const base64Image = req.file.buffer.toString('base64');
      const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llava-v1.5-7b-4096", // Stable model, not decommissioned
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Read this fitness plan and extract all workout/diet text." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }]
        })
      });
      const visionData: any = await visionRes.json();
      if (visionData.error) throw new Error("Vision API: " + visionData.error.message);
      rawText = visionData.choices?.[0]?.message?.content || "";
    }
    //voice inputs (whisper)
     else if (mimeType.startsWith('audio/') || fileName.endsWith('.webm')) {
      const formData = new FormData();
      formData.append('file', new Blob([req.file.buffer], { type: mimeType }), fileName);
      formData.append('model', 'whisper-large-v3');
      
      // THIS PROMPT IS THE SECRET: It forces English letters for English sounds.
      formData.append('prompt', 'This is a fitness conversation. If you hear English words like "Hi", "How are you", "Gym", "Workout", use the English Alphabet. Only use Sinhala script (සිංහල) for actual Sinhala words.');

      const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: formData
      });
      const whisperData: any = await whisperRes.json();
      rawText = whisperData.text || "";

      // --- LOG VOICE INPUT TO TERMINAL IMMEDIATELY ---
      const voiceTokens = Math.ceil(rawText.length / 4);
      console.log(`🎤 VOICE INPUT: "${rawText}"`);
      console.log(`🎫 Transcription Est. Tokens: ~${voiceTokens}`);
    }
    // --- VALIDATION & LOGGING (Once only) ---
    if (!rawText || rawText.trim().length === 0) throw new Error("File was empty or unreadable.");

    const estTokens = Math.ceil(rawText.length / 4);
    console.log(`📂 Attached Doc Size: ~${estTokens} tokens`);

    // --- SUMMARY CACHE ---
    const summaryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: `Summarize this workout clearly: ${rawText.substring(0, 4000)}` }],
        max_tokens: 500
      })
    });
    const summaryData: any = await summaryRes.json();
    const cleanSummary = summaryData.choices?.[0]?.message?.content || rawText;

    res.json({ text: cleanSummary, fileName, type: 'file' });

  } catch (err: any) {
    console.error("❌ Extraction Error:", err.message);
    res.status(500).json({ message: "Error: " + err.message });
  }
});
// --- 4. ELITE CHAT LOGIC ---
aiRouter.post("/chat", async (req, res) => {
  const { userId, message, sessionId, inputType, fileName } = req.body;
  const apiKey = process.env.GROQ_API_KEY?.trim() || "";
  const uid = Number(userId);
  const currentDateTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });

  try {
    const dataRes = await query(`
      SELECT 
        u.id AS user_db_id, 
        u.name, u.role, 
        p.gender, p.dob, p.current_weight, p.height, p.target_weight,
        p.primary_goal, p.has_injuries, p.injury_details, p.has_allergies, p.allergy_details,
        pr.name as package_name, pr.id as package_id,
        au.daily_count, au.last_message_at 
      FROM users u
      LEFT JOIN memberprofiles p ON u.id = p.userid
      LEFT JOIN pricing pr ON p.package_id = pr.id
      LEFT JOIN ai_usage au ON u.id = au.userid
      WHERE u.id = $1`, [uid]);
    
    const userData = dataRes?.rows[0];
    if (!userData) return res.status(404).json({ message: "athlete profile not found." });

    const modelToUse = (inputType === 'file' || inputType === 'voice') 
  ? "llama-3.3-70b-versatile" 
  : "llama-3.3-70b-versatile"; // I have set both to 70b for your project safety.


    // --- UPDATED LOGGING ---
    console.log(`-------------------------------------------`);
    console.log(`👤 User ID: ${userData.user_db_id || uid}`); 
    console.log(`📦 Package: ${userData.package_name || 'Free'} (ID: ${userData.package_id || 'N/A'})`);
    console.log(`🤖 Model: ${modelToUse}`); // <--- MODEL SHOWN HERE
    console.log(`🕒 Time: ${currentDateTime}`);
    console.log(`💬 Message: ${message?.substring(0, 30)}...`);
    const inputLabel = inputType === 'voice' ? '🎤 Voice' : '💬 Text';
    console.log(`${inputLabel}: ${message}`);
    


    // Safety checks for NULL values (Vercel fix)
    const safeRole = (userData.role || "").toLowerCase();
    const safePkg = (userData.package_name || "").toLowerCase();
    const birthDate = new Date(userData.dob);
    const age = userData.dob ? new Date().getFullYear() - birthDate.getFullYear() : "unknown";

    // Tiered Limits
    let DAILY_LIMIT = 10; 
    let SESSION_MAX = 30;
    if (safeRole === 'admin') DAILY_LIMIT = 100;
    else if (safeRole.includes('pro')) { DAILY_LIMIT = 20; SESSION_MAX = 50; }
    else if (safePkg.includes('personal') || safePkg.includes('elite')) { DAILY_LIMIT = 35; SESSION_MAX = 50; }

    // Quota and Cooldown checks
    const now = new Date();
    const lastMsgTime = new Date(userData.last_message_at || 0);
    const hoursPassed = (now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60);
    if (userData.daily_count >= DAILY_LIMIT && hoursPassed < 2) {
        return res.status(403).json({ message: "Daily quota exhausted." });
    }

    // Fetch Active Workout Cache
    let workoutContext = "no active workout.";
    const activeWorkoutRes = await query("SELECT title, content FROM workouts WHERE userid = $1 AND is_active = true LIMIT 1", [uid]);
    if (activeWorkoutRes?.rows[0]) {
      workoutContext = `active workout: ${activeWorkoutRes.rows[0].title}. details: ${activeWorkoutRes.rows[0].content}`;
    }

    // SYSTEM PROMPT (STRICT PROTOCOLS)
    const systemPrompt = `you are the "narrow fitness master coach". 
    CURRENT DATE/TIME: ${currentDateTime} (Use this to greet the user correctly - e.g., don't say Good Morning at night).
FACTS ABOUT THE ATHLETE:
- Name: ${userData.name} | Age: ${age} | Gender: ${userData.gender}
- Stats: H: ${userData.height}cm | W: ${userData.current_weight}kg | Target: ${userData.target_weight}kg
- Goal: ${userData.primary_goal}
- Safety: Injuries: ${userData.has_injuries ? userData.injury_details : 'none'} | Allergies: ${userData.has_allergies ? userData.allergy_details : 'none'}
- Context: ${workoutContext}

STRICT LANGUAGE PROTOCOL:
1. If the user speaks English or provides an English phonetic transcription (like "Hello how are you"), respond in English,never use singlish.
2. Only use Sinhala script (සිංහල අකුරෙන්) if the user is asking a question that is clearly intended to be answered in Sinhala.
3. NEVER repeat yourself. Be professional and direct.
4. English for English. Professional and motivating tone.

STRICT OPERATIONAL RULES:
1. GREETINGS: Warmly mention readiness for their workout plan.
2. SCOPE: Focus on fitness, nutrition, and onboarding stats.
3. OUT-OF-SCOPE: Refuse unrelated topics using the standard "focus on physical peak" refusal.
4. SAFETY: Prioritize injury data: ${userData.has_injuries ? userData.injury_details : 'none'}.
5. FORMATTING: Use Markdown Tables ONLY for structured routines/diets.
6. DATA DISCLOSURE: Disclose athlete's biometrics if asked.
7.GREETINGS: Respond warmly. Check the current time (${currentDateTime}) and use appropriate greetings like "Good Evening" or "Good Morning".
8. TYPOGRAPHY: Normal sentence case for readability.`;

// 5. CALL GROQ API
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${apiKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        model: modelToUse,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
        temperature: 0.3, 
        max_tokens: 1500
      })
    });

    const data: any = await groqRes.json();
    const remainingTokens = groqRes.headers.get("x-ratelimit-remaining-tokens") || "Unknown";
    
   

    // 6. LOG TOKEN USAGE
     if (data.usage) {
       console.log(`🎫 Tokens: Prompt: ${data.usage.prompt_tokens} | Completion: ${data.usage.completion_tokens} | Total: ${data.usage.total_tokens}`);
      // 3. SHOW REMAINING TOKENS FOR THE DAY
      console.log(`📉 TOKENS REMAINING (TPD): ${remainingTokens}`);
      
      // Calculate percentage used for your info (based on your TPD limits)
      const limit = modelToUse.includes('70b') ? 100000 : 500000;
      const percentUsed = ((limit - Number(remainingTokens)) / limit * 100).toFixed(2);
      console.log(`📊 Daily Limit Usage: ${percentUsed}%`);
    }
    console.log(`-------------------------------------------`);

    if (!groqRes.ok || !data.choices?.[0]) {
       throw new Error(data.error?.message || "AI API Error");
    }

    const responseText = data.choices[0].message.content;

    // SAVE & UPDATE
    await query("INSERT INTO chat_history (userid, role, message, session_id, input_type, file_name) VALUES ($1, 'user', $2, $3, $4, $5)", [uid, message, sessionId, inputType || 'text', fileName || null]);
    await query("INSERT INTO chat_history (userid, role, message, session_id, input_type) VALUES ($1, 'model', $2, $3, 'text')", [uid, responseText, sessionId]);
    
    const resetCount = hoursPassed >= 2 ? 1 : Number(userData.daily_count) + 1;
    await query("UPDATE ai_usage SET daily_count = $1, last_message_at = NOW() WHERE userid = $2", [resetCount, uid]);

    res.json({ text: responseText, usage: { current: resetCount, max: DAILY_LIMIT } });

  } catch (err: any) {
    res.status(500).json({ message: "the ai coach is busy. try again shortly." });
  }
});

aiRouter.delete("/sessions/:id", async (req, res) => {
  try {
    await query("DELETE FROM chat_history WHERE session_id = $1", [req.params.id]);
    await query("DELETE FROM chat_sessions WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: "fail" }); }
});

export default aiRouter;