import { Router, Response } from "express";
import { query } from '../../api/index.js';
import multer from 'multer';
import { createRequire } from 'module';

// --- STABLE LIBRARIES ---
const require = createRequire(import.meta.url);
const mammoth = require('mammoth'); 

const aiRouter = Router();

// --- 1. CONFIGURATION ---
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB Limit
});
// Add this at the top of your file
const pdf = require('pdf-parse');

aiRouter.post("/process-media", upload.single('file'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "no file uploaded" });

  const mimeType = req.file.mimetype;
  const fileName = req.file.originalname;
  const apiKey = process.env.GROQ_API_KEY?.trim() || "";

  try {
    let extractedText = "";

    // 1. WORD DOCUMENTS
    if (mimeType.includes('officedocument') || fileName.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
    }

    // 2. PDF DOCUMENTS
    else if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      const data = await pdf(req.file.buffer);
      extractedText = data.text;
    }

    // 3. IMAGES (Using Groq Vision instead of Tesseract for Vercel stability)
    else if (mimeType.startsWith('image/')) {
      console.log("📸 Image detected, sending to Groq Vision...");
      const base64Image = req.file.buffer.toString('base64');
      
      const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.2-11b-vision-preview",
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Extract all workout and diet details from this image." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }]
        })
      });
      const visionData: any = await visionRes.json();
      extractedText = visionData.choices?.[0]?.message?.content || "";
    }

    // ... (Keep your existing audio logic) ...

    if (!extractedText || extractedText.trim().length === 0) {
      return res.status(422).json({ message: "Could not extract any text from this file." });
    }

    res.json({ text: extractedText.trim(), fileName, type: 'file' });

  } catch (err: any) {
    console.error("❌ Extraction Error:", err);
    res.status(500).json({ message: "Error processing file: " + err.message });
  }
});
// --- 2. SESSION MANAGEMENT ---

// Get all workout sessions for the user
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

// Create new workout session
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

// --- 4. MEDIA EXTRACTION ENGINE (STABLE VERSION) ---

aiRouter.post("/process-media", upload.single('file'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "no file uploaded" });

  const mimeType = req.file.mimetype;
  const fileName = req.file.originalname;

  try {
    let extractedText = "";

    // A. Handle Word (.docx) - STABLE
    if (mimeType.includes('officedocument') || fileName.toLowerCase().endsWith('.docx')) {
      console.log(`📝 processing workout word doc: ${fileName}`);
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      extractedText = result.value;
    }

    // B. Handle Voice (Whisper via Groq) - STABLE (API based)
    else if (mimeType.startsWith('audio/') || fileName.endsWith('.webm')) {
      console.log(`🎙️ transcribing workout audio...`);
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

    // C. Disabled Formats (To prevent crashes)
    else {
      return res.status(400).json({ 
        message: "This file format is temporarily disabled for server stability. Please use .docx or manual paste." 
      });
    }

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error("the file was read but no text could be extracted.");
    }

    res.json({ 
      text: extractedText.trim(), 
      fileName: fileName,
      type: mimeType.startsWith('audio') ? 'voice' : 'file'
    });

  } catch (err: any) {
    console.error("❌ Media Extraction Error:", err.message);
    res.status(500).json({ message: "extraction failed: " + err.message });
  }
});

// --- 5. ELITE CHAT LOGIC ---
aiRouter.post("/chat", async (req, res) => {
  const { userId, message, sessionId, inputType, fileName } = req.body;
  const apiKey = process.env.GROQ_API_KEY?.trim() || "";
  const uid = Number(userId);

  try {
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

     const modelToUse = (inputType === 'file' || inputType === 'voice') 
      ? "llama-3.1-8b-instant" 
      : "llama-3.3-70b-versatile";

   const userData = (dataRes && dataRes.rows) ? dataRes.rows[0] : null;
    if (!userData) return res.status(404).json({ message: "athlete profile not found." });
    
    const pkg = (userData.package_name || '').toLowerCase();
    
    // TIERED LIMITS logic
    let DAILY_LIMIT = 10; 
    let SESSION_MAX = 30;
    if (userData.role === 'admin') DAILY_LIMIT = 100;
    else if (userData.role.includes('pro')) { DAILY_LIMIT = 20; SESSION_MAX = 50; }
    else if (userData.package_name.includes('personal') || userData.package_name.includes('elite')) { DAILY_LIMIT = 35; SESSION_MAX = 50; }

    // Session Cap check
    const countRes = await query("SELECT COUNT(*) FROM chat_history WHERE session_id = $1 AND role = 'user'", [sessionId]);
    if (parseInt(countRes.rows[0].count) >= SESSION_MAX) {
      return res.status(422).json({ message: `session limit reached (${SESSION_MAX} msgs). please start a new workout chat.` });
    }

    // Cooldown check
    const now = new Date();
    const lastMsgTime = new Date(userData.last_message_at || 0);
    const hoursPassed = (now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60);

    if (userData.daily_count >= DAILY_LIMIT && hoursPassed < 2) {
        const unlock = new Date(lastMsgTime.getTime() + (2 * 60 * 60 * 1000)).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        return res.status(403).json({ message: `daily quota exhausted. unblocks at ${unlock}.` });
    }
// L4: Fetch Active Workout
    let workoutContext = "no active workout.";
    const activeWorkoutRes = await query("SELECT title, content FROM workouts WHERE userid = $1 AND is_active = true LIMIT 1", [uid]);
    const activePlan = (activeWorkoutRes && activeWorkoutRes.rows) ? activeWorkoutRes.rows[0] : null;
    if (activePlan) {
      workoutContext = `active workout: ${activePlan.title}. details: ${activePlan.content}`;
    }

    // SYSTEM PROMPT
    const birthDate = new Date(userData.dob);
    const age = userData.dob ? new Date().getFullYear() - birthDate.getFullYear() : "unknown";
    
    // Athlete Context
    let contextText = `athlete: ${userData.name}, ${age}y, ${userData.gender}, goal: ${userData.primary_goal}.`;

    // Add medical conditions, injuries, allergies
    if (userData.medical_conditions || userData.has_injuries || userData.has_allergies) {
      contextText += `
        medical conditions: ${userData.medical_conditions || 'none'},
        injuries: ${userData.has_injuries ? userData.injury_details : 'none'},
        allergies: ${userData.has_allergies ? userData.allergy_details : 'none'}`;
    }
    
    const systemPrompt = `you are the "narrow fitness master coach". 
    FACTS ABOUT THE ATHLETE (You must use these):
- Name: ${userData.name}
- Age: ${age} | Gender: ${userData.gender}
- Height: ${userData.height}cm
- Current Weight: ${userData.current_weight}kg
- Target Weight: ${userData.target_weight || 'Not set'}kg
- Goal: ${userData.primary_goal}
- Injuries: ${userData.has_injuries ? userData.injury_details : 'None'}
    athlete: ${userData.name}, ${age}y, ${userData.gender}, goal: ${userData.primary_goal}.
    safety: injuries: ${userData.has_injuries ? userData.injury_details : 'none'}.
    context: ${workoutContext}.
   STRICT LANGUAGE PROTOCOL:
1. You are bilingual (English & Sinhala).
2. NEVER use "Singlish" (Sinhala words written in English letters like 'kohomada', 'machan', 'ayubowan').
3. SCRIPT RULE: If the user speaks in Sinhala or Singlish, you MUST respond ONLY using the proper Sinhala Alphabet (සිංහල අකුරෙන්).
4. If the user speaks in English, respond in English.
5. Keep the tone professional but friendly (use 'ඔයා' or 'මචං' appropriately if the user is casual).

STRICT OPERATIONAL RULES:
1. GREETINGS: Respond warmly. Mention you are ready to assist with their "${activePlan?.title || 'fitness'}" workout plan.
2. SCOPE & AWARENESS: You are fully aware of the athlete's profile. Answer questions about fitness, nutrition, recovery, and their own onboarding data (weight, height, goals, injuries). If asked about their specific stats, provide them clearly as they are part of their "Narrow Profile."
3. OUT-OF-SCOPE: Only decline questions that are totally unrelated to the gym, health, or their profile (e.g., politics, movies). In those cases, use the standard refusal: "as your narrow coach, i must remain focused on your physical peak..."
4. SAFETY FIRST: Always prioritize safety. Use the injury data (${userData.has_injuries ? userData.injury_details : 'none'}) to warn against dangerous movements.
5. FORMATTING: Use Markdown Tables ONLY for structured "Schedules" (Workout routines or Diet plans). Use natural, motivating paragraphs for general questions, form explanations, or profile summaries.
6. DATA DISCLOSURE: You have permission to discuss the athlete's biometrics with them. If they ask "Do you know my height?" or "What is my goal?", answer them directly using the provided data.
7. TONE: Maintain a "master controller" personality—professional, motivating, and elite.
8. TYPOGRAPHY: Use normal sentence case for descriptions.
8.OUT-OF-SCOPE: If asked non-fitness questions in Sinhala, say: "ඔබේ ශාරීරික යෝග්‍යතාවය පිළිබඳ ගැටළු වලට පමණක් මට පිළිතුරු දිය හැක. කරුණාකර ව්‍යායාම සහ පෝෂණය පිළිබඳ ප්‍රශ්න පමණක් යොමු කරන්න." 
9. TYPOGRAPHY: Use normal sentence case (not all-caps) for descriptions to ensure high readability.`;

     const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${apiKey}`, 
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
       model: modelToUse,
        messages: [
          { role: "system", content: systemPrompt }, 
          { role: "user", content: message } 
        ],
        temperature: 0.3, 
        max_tokens: 2500
      })
    });

    const data: any = await groqRes.json();

    // Check if the API response is valid before reading 'choices[0]'
    if (!groqRes.ok || data.error) {
      console.error("❌ Groq API Error:", data.error || data);
      return res.status(500).json({ 
        message: "The AI is overwhelmed by this document. Try sending a shorter part of it." 
      });
    }

    if (!data.choices || !data.choices[0]) {
      throw new Error("AI returned an empty response.");
    }

    const responseText = data.choices[0].message.content;

    // SAVE & SYNC
    await query("INSERT INTO chat_history (userid, role, message, session_id, input_type, file_name) VALUES ($1, 'user', $2, $3, $4, $5)", [uid, message, sessionId, inputType || 'text', fileName || null]);
    await query("INSERT INTO chat_history (userid, role, message, session_id, input_type) VALUES ($1, 'model', $2, $3, 'text')", [uid, responseText, sessionId]);
    
    const resetCount = hoursPassed >= 2 ? 1 : Number(userData.daily_count) + 1;
    await query("UPDATE ai_usage SET daily_count = $1, last_message_at = NOW() WHERE userid = $2", [resetCount, uid]);

    res.json({ text: responseText, usage: { current: resetCount, max: DAILY_LIMIT, sessionMax: SESSION_MAX } });

  } catch (err: any) {
    console.error("❌ AI Error:", err.message);
    res.status(500).json({ message: "the ai coach is busy. try again shortly." });
  }
});

// --- 6. DELETE SESSION ---
aiRouter.delete("/sessions/:id", async (req, res) => {
  const sid = Number(req.params.id);
  try {
    await query("DELETE FROM chat_history WHERE session_id = $1", [sid]);
    await query("DELETE FROM chat_sessions WHERE id = $1", [sid]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: "fail" }); }
});

export default aiRouter;