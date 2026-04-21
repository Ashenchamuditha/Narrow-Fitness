import { Router, Response } from "express";
import { query } from '../../api/index.js';
import multer from 'multer';
import Tesseract from 'tesseract.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParser = require('pdf-parse'); 
const mammoth = require('mammoth'); 

const aiRouter = Router();

// --- 1. CONFIGURATION ---
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 15 * 1024 * 1024 } 
});

// --- 2. SESSION MANAGEMENT ---

// Get all sessions for a specific user
aiRouter.get("/sessions/:userId", async (req, res) => {
  const uid = Number(req.params.userId);
  try {
    const result = await query(
      "SELECT id, title, created_at FROM chat_sessions WHERE userid = $1 ORDER BY created_at DESC",
      [uid]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ message: "failed to load sessions" });
  }
});

// Create a new session
aiRouter.post("/sessions/new", async (req, res) => {
  const { userId, title } = req.body;
  try {
    const result = await query(
      "INSERT INTO chat_sessions (userid, title) VALUES ($1, $2) RETURNING *",
      [userId, title || 'new workout chat']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "failed to create session" });
  }
});

// --- 3. HISTORY RETRIEVAL ---

aiRouter.get("/history/:sessionId", async (req, res) => {
  const sid = Number(req.params.sessionId);
  try {
    const result = await query(
      `SELECT id, role, message, input_type, file_name, created_at 
       FROM chat_history WHERE session_id = $1 
       ORDER BY created_at ASC`, [sid]
    );
    res.json({ messages: result.rows });
  } catch (err) {
    res.status(500).json({ messages: [] });
  }
});

// --- 4. MEDIA EXTRACTION ENGINE ---

aiRouter.post("/process-media", upload.single('file'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "no file uploaded" });
  const mimeType = req.file.mimetype;
  const fileName = req.file.originalname;

  try {
    let extractedText = "";

    if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      const parseFunction = typeof pdfParser === 'function' ? pdfParser : pdfParser.default;
      const data = await parseFunction(req.file.buffer);
      extractedText = data.text;
    } 
    else if (mimeType.includes('officedocument') || fileName.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
    }
    else if (mimeType.startsWith('image/')) {
      const { data: { text } } = await Tesseract.recognize(req.file.buffer, 'eng');
      extractedText = text;
    }
    else if (mimeType.startsWith('audio/') || fileName.endsWith('.webm')) {
      const formData = new FormData();
      const audioFile = new Blob([req.file.buffer], { type: mimeType });
      formData.append('file', audioFile, fileName);
      formData.append('model', 'whisper-large-v3');

      const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` },
        body: formData
      });
      const whisperData: any = await whisperRes.json();
      extractedText = whisperData.text || "";
    }

    if (!extractedText || extractedText.trim().length === 0) throw new Error("no text found");

    res.json({ 
      text: extractedText.trim(), 
      fileName: fileName,
      type: mimeType.startsWith('audio') ? 'voice' : 'file'
    });
  } catch (err: any) {
    res.status(500).json({ message: "extraction failed: " + err.message });
  }
});

// --- 5. ELITE CHAT LOGIC (With Complete Onboarding Integration) ---

aiRouter.post("/chat", async (req, res) => {
  const { userId, message, sessionId, inputType, fileName } = req.body;
  const apiKey = process.env.GROQ_API_KEY?.trim() || "";
  const uid = Number(userId);

  try {
    // A. FETCH COMPLETE ATHLETE CONTEXT (Onboarding + Package + Usage)
    console.log(`\n--- [AI COACH] Full Context Analysis for UID: ${uid} ---`);
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
      LEFT JOIN pricing pr ON u.package_id = pr.id  
      LEFT JOIN ai_usage au ON u.id = au.userid
      WHERE u.id = $1`, [uid]);

    const userData = dataRes.rows[0];
    if (!userData) return res.status(404).json({ message: "athlete record not found." });
    
    // B. CALCULATE DYNAMIC BIO DATA
    const birthDate = new Date(userData.dob);
    const age = userData.dob ? new Date().getFullYear() - birthDate.getFullYear() : "unknown";
    const medicalList = Array.isArray(userData.medical_conditions) ? userData.medical_conditions.join(", ") : "none reported";
    const pkg = (userData.package_name || '').toLowerCase();

    // C. DETERMINE TIERED LIMITS
    let DAILY_LIMIT = 10; 
    let SESSION_MAX = 30;
    if (userData.role === 'admin') DAILY_LIMIT = 100;
    else if (pkg.includes('pro')) { DAILY_LIMIT = 20; SESSION_MAX = 50; }
    else if (pkg.includes('personal') || pkg.includes('elite')) { DAILY_LIMIT = 35; SESSION_MAX = 50; }

    // D. SESSION MESSAGE CAP CHECK
    const sessionCountRes = await query("SELECT COUNT(*) FROM chat_history WHERE session_id = $1 AND role = 'user'", [sessionId]);
    if (parseInt(sessionCountRes.rows[0].count) >= SESSION_MAX) {
      return res.status(422).json({ message: `session limit reached (${SESSION_MAX} msgs). please start a new workout chat.` });
    }

    // E. DAILY COOLDOWN LOGIC
    const now = new Date();
    const lastMsgTime = new Date(userData.last_message_at || 0);
    const hoursPassed = (now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60);

    if (userData.daily_count >= DAILY_LIMIT && hoursPassed < 2) {
        const unlock = new Date(lastMsgTime.getTime() + (2 * 60 * 60 * 1000)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return res.status(403).json({ message: `daily free limit reached. unblocks at ${unlock}.`, usage: { current: userData.daily_count, max: DAILY_LIMIT } });
    }

    // F. FETCH ACTIVE WORKOUT CONTEXT
    let workoutContext = "no active workout vault file.";
    const activeWorkoutRes = await query("SELECT title, content FROM workouts WHERE userid = $1 AND is_active = true LIMIT 1", [uid]);
    const activePlan = activeWorkoutRes.rows[0];
    if (activePlan) {
      workoutContext = `active blueprint: ${activePlan.title}. content: ${activePlan.content}`;
    }

    // G. REFINED SYSTEM PROMPT (Total Awareness Protocol)
    const systemPrompt = `you are the "narrow fitness ai coach", an elite athletic performance engine. 
    use the following athlete context for every response:
    
    PROFILE:
    - Name: ${userData.name} | Age: ${age} | Gender: ${userData.gender}
    - Stats: ${userData.current_weight}kg, ${userData.height}cm
    - Goal: ${userData.primary_goal} | Activity: ${userData.activity_level}
    
    SAFETY & MEDICAL:
    - Conditions: ${medicalList} | Other: ${userData.other_medical || 'none'}
    - Injuries: ${userData.has_injuries ? userData.injury_details : 'no current injuries'}
    - Allergies: ${userData.has_allergies ? userData.allergy_details : 'none'}
    
    VAULT CONTEXT:
    - ${workoutContext}
   STRICT LANGUAGE PROTOCOL:
1. You are bilingual (English & Sinhala).
2. NEVER use "Singlish" (Sinhala words written in English letters like 'kohomada', 'machan', 'ayubowan').
3. SCRIPT RULE: If the user speaks in Sinhala or Singlish, you MUST respond ONLY using the proper Sinhala Alphabet (සිංහල අකුරෙන්).
4. If the user speaks in English, respond in English.
5. Keep the tone professional but friendly (use 'ඔයා' or 'මචං' appropriately if the user is casual).

STRICT OPERATIONAL RULES:
1. GREETINGS: Respond warmly. Mention you are ready to assist with their "${activePlan?.title || 'fitness'}" workout plan.
2. SCOPE: Answer fitness, nutrition, and recovery questions only. If asked anything else, say: "as your narrow coach, i must remain focused on your physical peak. please keep inquiries within fitness and nutrition scope."
3. SAFETY FIRST: Always prioritize safety. If the athlete has an injury (${userData.has_injuries ? userData.injury_details : 'none'}), strictly forbid high-impact moves that could aggravate it.
4. FORMATTING: Every workout routine or diet plan MUST be delivered in a neatly formatted markdown table.
5. FORM GUIDANCE & VIDEOS: If an athlete asks "how to do" an exercise or asks for form guidance:
   - Provide a 3-4 sentence paragraph explaining the setup, core movement, and muscle focus.
   - Include one critical safety tip in **bold**.
   - Provide a YouTube search link formatted exactly like this: [watch tutorial](https://www.youtube.com/results?search_query=how+to+do+[EXERCISE_NAME]+proper+form).
   - Replace [EXERCISE_NAME] with the actual exercise (e.g., incline+bench+press).
6. PRIVACY: Never reveal the athlete's raw weight or medical data in text unless they specifically ask you to analyze it.
7. TONE: Maintain a "master controller" personality—professional, motivating, elite, and concise.
8.OUT-OF-SCOPE: If asked non-fitness questions in Sinhala, say: "ඔබේ ශාරීරික යෝග්‍යතාවය පිළිබඳ ගැටළු වලට පමණක් මට පිළිතුරු දිය හැක. කරුණාකර ව්‍යායාම සහ පෝෂණය පිළිබඳ ප්‍රශ්න පමණක් යොමු කරන්න." 
9. TYPOGRAPHY: Use normal sentence case (not all-caps) for descriptions to ensure high readability.`;

    // H. CALL GROQ (Llama 3.3 70B)
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: message }],
        temperature: 0.3, max_tokens: 2500
      })
    });

    const data: any = await groqRes.json();
    if (!groqRes.ok) throw new Error(data.error?.message || "Groq Error");
    const responseText = data.choices[0].message.content;

    // I. DB SYNC (Atomic increments and history storage)
    await query(
      "INSERT INTO chat_history (userid, role, message, session_id, input_type, file_name) VALUES ($1, 'user', $2, $3, $4, $5)", 
      [uid, message, sessionId, inputType || 'text', fileName || null]
    );
    await query(
      "INSERT INTO chat_history (userid, role, message, session_id, input_type) VALUES ($1, 'model', $2, $3, 'text')", 
      [uid, responseText, sessionId]
    );
    
    const resetCount = hoursPassed >= 2 ? 1 : Number(userData.daily_count) + 1;
    await query("UPDATE ai_usage SET daily_count = $1, last_message_at = NOW() WHERE userid = $2", [resetCount, uid]);

    res.json({ 
      text: responseText, 
      usage: { current: resetCount, max: DAILY_LIMIT, sessionMax: SESSION_MAX } 
    });

  } catch (err: any) {
    console.error("❌ AI Error:", err.message);
    res.status(500).json({ message: "the ai coach is calculating protocols. try again shortly." });
  }
});

// --- 6. DELETE SPECIFIC SESSION ---
aiRouter.delete("/sessions/:id", async (req, res) => {
  const sid = Number(req.params.id);
  try {
    await query("DELETE FROM chat_history WHERE session_id = $1", [sid]);
    const result = await query("DELETE FROM chat_sessions WHERE id = $1 RETURNING title", [sid]);
    if (result.rows.length === 0) return res.status(404).json({ message: "not found" });
    res.json({ success: true, message: "deleted" });
  } catch (err) {
    res.status(500).json({ message: "delete fail" });
  }
});

export default aiRouter;