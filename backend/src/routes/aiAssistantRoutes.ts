import { Router, Response } from "express";
import { query } from '../index.js';
import multer from 'multer';
import { createRequire } from 'module';
import { GoogleGenerativeAI } from "@google/generative-ai";
import PDFDocument from 'pdfkit';

const require = createRequire(import.meta.url);
const mammoth = require('mammoth'); 
const pdfLib = require('pdf-parse'); // Standard import



// --- THE FINAL BULLETPROOF PDF HELPER (NO 'NEW' KEYWORD) ---
const safePdfParse = async (buffer: any) => {
  try {
    const lib = pdfLib as any;

    // 1. Support for Mehmet Kozan's pdf-parse (v2.0.0+)
    if (lib.PDFParse && typeof lib.PDFParse === 'function') {
      const parser = new lib.PDFParse({ data: buffer });
      const result = await parser.getText();
      return result.text || "";
    }

    // 2. Check if the import itself is the function (Standard CJS / Classic pdf-parse)
    if (typeof lib === 'function') {
      const data = await lib(buffer);
      return typeof data === 'string' ? data : (data?.text || "");
    }

    // 3. Check if it's wrapped in .default (Standard ESM Interop)
    if (lib.default && typeof lib.default === 'function') {
      const data = await lib.default(buffer);
      return typeof data === 'string' ? data : (data?.text || "");
    }

    // 4. Last resort: check for common property names
    const fallback = lib.pdf || lib.parse;
    if (typeof fallback === 'function') {
      const data = await fallback(buffer);
      return typeof data === 'string' ? data : (data?.text || "");
    }

    throw new Error("PDF parser function not found in library.");
  } catch (err: any) {
    console.error("PDF Library Internal Error:", err.message);
    throw new Error("Could not parse this PDF. Please try another file.");
  }
};

const aiRouter = Router();

// --- 1. CONFIGURATION ---
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage, 
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB Limit for Vercel stability
});

// Initialize Gemini (Free, Stable, No Deprecations)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// --- 2. SESSION & HISTORY ---
aiRouter.get("/sessions/:userId", async (req, res) => {
  const uid = Number(req.params.userId);
  try {
    const result = await query("SELECT id, title, created_at FROM chat_sessions WHERE userid = $1 ORDER BY created_at DESC", [uid]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ message: "failed to load sessions" }); }
});

aiRouter.get("/history/:sessionId", async (req, res) => {
  const sid = Number(req.params.sessionId);
  try {
    const result = await query(`SELECT id, role, message, input_type, file_name, created_at FROM chat_history WHERE session_id = $1 ORDER BY created_at ASC`, [sid]);
    res.json({ messages: result.rows });
  } catch (err) { res.status(500).json({ messages: [] }); }
});

// --- NEW: FETCH ACCURATE USAGE STATS ---
aiRouter.get("/stats/:userId", async (req, res) => {
  const uid = Number(req.params.userId);
  try {
    const dataRes = await query(`
      SELECT 
        u.role, 
        pr.name as package_name,
        au.daily_count, au.last_message_at 
      FROM users u
      LEFT JOIN memberprofiles p ON u.id = p.userid
      LEFT JOIN pricing pr ON p.package_id = pr.id
      LEFT JOIN ai_usage au ON u.id = au.userid
      WHERE u.id = $1`, [uid]);
    
    const userData = dataRes?.rows[0];
    if (!userData) return res.status(404).json({ message: "not found" });

    const safeRole = (userData.role || "").toLowerCase();
    const safePkg = (userData.package_name || "").toLowerCase();

    // Tiered Limits Logic (DRY - same as /chat)
    let DAILY_LIMIT = 10; 
    let SESSION_MAX = 30;
    
    if (safeRole === 'admin') {
      DAILY_LIMIT = 100;
      SESSION_MAX = 100;
    } else if (safePkg.includes('personal')) { 
      DAILY_LIMIT = 35; 
      SESSION_MAX = 50; 
    } else if (safePkg.includes('pro')) { 
      DAILY_LIMIT = 20; 
      SESSION_MAX = 40; 
    } else if (safePkg.includes('basic')) {
      DAILY_LIMIT = 15;
      SESSION_MAX = 30;
    }

    const now = new Date();
    const lastMsgTime = new Date(userData.last_message_at || 0);
    const hoursPassed = (now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60);
    
    // If 2 hours passed, current count is effectively 0 for the user's view
    const effectiveCount = hoursPassed >= 2 ? 0 : (userData.daily_count || 0);

    res.json({
      current: effectiveCount,
      max: DAILY_LIMIT,
      sessionMax: SESSION_MAX,
      packageName: userData.package_name || 'Free'
    });
  } catch (err) {
    res.status(500).json({ current: 0, max: 10, sessionMax: 30 });
  }
});

aiRouter.post("/sessions/new", async (req, res) => {
  const { userId, title } = req.body;
  try {
    const result = await query(
      "INSERT INTO chat_sessions (userid, title) VALUES ($1, $2) RETURNING id, title, created_at",
      [userId, title]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ message: "failed to create session" });
  }
});



// --- 3. MEDIA EXTRACTION ENGINE (ULTIMATE STABILITY) ---
aiRouter.post("/process-media", upload.single('file'), async (req: any, res: Response) => {
  if (!req.file) return res.status(400).json({ message: "no file uploaded" });

  const mimeType = req.file.mimetype;
  const fileName = req.file.originalname;
  const apiKey = process.env.GROQ_API_KEY?.trim() || "";

  try {
    let rawText = "";

    // 1. WORD (.docx) - Status: Working
    if (mimeType.includes('officedocument') || fileName.toLowerCase().endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      rawText = result.value;
    }
    // 2. PDF - Status: Fixed for Docker
     else if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')) {
      console.log(`📄 Local Parsing PDF: ${fileName}`);
      
      // ENSURE THIS NAME MATCHES THE HELPER ABOVE
      rawText = await safePdfParse(req.file.buffer); 
    }
    
    // 3. IMAGES - Status: Using Current Stable Groq Model
     else if (mimeType.startsWith('image/')) {
      console.log(`📸 Groq Vision analyzing: ${fileName}`);
      const base64Image = req.file.buffer.toString('base64');
      
      const visionRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${apiKey}`, 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          // THIS IS THE NEW STABLE MODEL FOR 2026
          model: "meta-llama/llama-4-scout-17b-16e-instruct", 
          messages: [{
            role: "user",
            content: [
              { type: "text", text: "Extract all workout exercises, sets, reps, and diet instructions from this fitness image clearly." },
              { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
            ]
          }],
          temperature: 0.1 // Keep temperature low for high extraction accuracy
        })
      });

      const visionData: any = await visionRes.json();

      // Better error handling to see exactly what Groq says
      if (visionData.error) {
        console.error("❌ Groq Vision Error:", visionData.error);
        throw new Error(`Vision API: ${visionData.error.message}`);
      }

      rawText = visionData.choices?.[0]?.message?.content || "";
    }


    // 4. VOICE - Status: Working
    else if (mimeType.startsWith('audio/')) {
      const formData = new FormData();
      formData.append('file', new Blob([req.file.buffer], { type: mimeType }), fileName);
      formData.append('model', 'whisper-large-v3');
      // Added prompt to improve accuracy for fitness terms and multi-language support (English/Sinhala)
      formData.append('prompt', 'The user is talking about fitness, workouts, or diet. They might use English or Sinhala (phonetic or script). Examples: "Leg day today", "Mata diet plan ekak oni", "Kohomada workout eka?", "Show me my progress".');
      
      const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}` },
        body: formData
      });
      const whisperData: any = await whisperRes.json();
      
      if (whisperData.error) {
        console.error("❌ Whisper Error:", whisperData.error);
        throw new Error(`Transcription API: ${whisperData.error.message}`);
      }

      rawText = whisperData.text || "";
      
      // FOR VOICE: Return raw text immediately without summary to avoid "reasoning" or summary in input
      return res.json({ text: rawText, fileName, type: 'voice' });
    }

    if (!rawText || rawText.trim().length === 0) throw new Error("Extraction resulted in empty text.");

    // SUCCESS LOG
    const estTokens = Math.ceil(rawText.length / 4);
    console.log(`✅ Extraction Success! Size: ~${estTokens} tokens`);

    // --- SUMMARY (Using Groq 8B - Fast & Saves your 70B tokens) ---
    const summaryRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: `Summarize this workout for coaching context: ${rawText.substring(0, 4000)}` }],
        max_tokens: 300
      })
    });
    const summaryData: any = await summaryRes.json();
    const cleanSummary = summaryData.choices?.[0]?.message?.content || rawText;

    res.json({ text: cleanSummary, fileName, type: 'file' });

  } catch (err: any) {
    console.error("❌ Media Error:", err.message);
    res.status(500).json({ message: "Media Error: " + err.message });
  }
});

// --- 4. ELITE CHAT LOGIC ---
aiRouter.post("/chat", async (req, res) => {
  const { userId, message, sessionId, inputType, fileName } = req.body;
  const apiKey = process.env.GROQ_API_KEY?.trim() || "";
  const uid = Number(userId);
  const currentDateTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Colombo' });

  try {
    // Check Membership Status
    const memberRes = await query("SELECT status FROM memberships WHERE userid = $1", [uid]);
    if (memberRes.rows.length > 0 && memberRes.rows[0].status === 'blocked') {
      return res.status(403).json({ message: "Your account is blocked. Please renew your membership to use the AI Assistant." });
    }

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
  : "llama-3.1-8b-instant"; // 8B for fast text, 70B for complex analysis


    // --- UPDATED LOGGING ---
    console.log(`-------------------------------------------`);
    console.log(`👤 User ID: ${userData.user_db_id || uid}`); 
    console.log(`📦 Package: ${userData.package_name || 'Free'} (ID: ${userData.package_id || 'N/A'})`);
    console.log(`🤖 Model: ${modelToUse}`); 
    console.log(`🕒 Time: ${currentDateTime}`);
    console.log(`💬 Message: ${message?.substring(0, 30)}...`);
    const inputLabel = inputType === 'voice' ? '🎤 Voice' : '💬 Text';
    console.log(`${inputLabel}: ${message}`);
    


    // Safety checks for NULL values (Vercel fix)
    const safeRole = (userData.role || "").toLowerCase();
    const safePkg = (userData.package_name || "").toLowerCase();
    const birthDate = new Date(userData.dob);
    const age = userData.dob ? new Date().getFullYear() - birthDate.getFullYear() : "unknown";

    // Tiered Limits (Mapping to Basic, Pro, Personal Training)
    let DAILY_LIMIT = 10; 
    let SESSION_MAX = 30;
    
    if (safeRole === 'admin') {
      DAILY_LIMIT = 100;
      SESSION_MAX = 100;
    } else if (safePkg.includes('personal')) { 
      DAILY_LIMIT = 35; 
      SESSION_MAX = 50; 
    } else if (safePkg.includes('pro')) { 
      DAILY_LIMIT = 20; 
      SESSION_MAX = 40; 
    } else if (safePkg.includes('basic')) {
      DAILY_LIMIT = 15;
      SESSION_MAX = 30;
    }

    // Quota and Cooldown checks
    const now = new Date();
    const lastMsgTime = new Date(userData.last_message_at || 0);
    const hoursPassed = (now.getTime() - lastMsgTime.getTime()) / (1000 * 60 * 60);
    
    // Change reset to 2 hours as requested
    if (userData.daily_count >= DAILY_LIMIT && hoursPassed < 2) {
        return res.status(403).json({ 
          message: `Daily quota exhausted (${DAILY_LIMIT} messages). It resets every 2 hours.` 
        });
    }

    // --- SESSION MESSAGE COUNT CHECK ---
    const sessionHistoryRes = await query("SELECT COUNT(*) FROM chat_history WHERE session_id = $1 AND role = 'user'", [sessionId]);
    const sessionMsgCount = parseInt(sessionHistoryRes.rows[0].count);
    
    // Strict 30 message limit per session (except for Admin)
    const CURRENT_SESSION_MAX = safeRole === 'admin' ? 100 : 30;
    
    if (sessionMsgCount >= CURRENT_SESSION_MAX) {
      return res.status(422).json({ 
        message: `Session limit reached (${CURRENT_SESSION_MAX} messages). To maintain coaching accuracy, please start a new workout session.` 
      });
    }

    // Fetch Active Workout Cache
    let workoutContext = "no active workout.";
    const activeWorkoutRes = await query("SELECT title, content, source_type, file_name FROM workouts WHERE userid = $1 AND is_active = true LIMIT 1", [uid]);
    
    if (activeWorkoutRes?.rows[0]) {
      const activeWorkout = activeWorkoutRes.rows[0];
      const isDataUrl = typeof activeWorkout.content === 'string' && activeWorkout.content.startsWith('data:');
      
      console.log(`ðŸ“‹ [CONTEXT] Active workout: "${activeWorkout.title}" | Source: ${activeWorkout.source_type}`);
      
      if (isDataUrl) {
          console.warn(`âš ï¸ [CONTEXT WARNING] Workout content is a Data URL (Binary). AI cannot read this.`);
          workoutContext = `active workout: ${activeWorkout.title}. [Warning: content is in binary format]`;
      } else {
          workoutContext = `active workout: ${activeWorkout.title}. details: ${activeWorkout.content}`;
          console.log(`âœ… [CONTEXT] Loaded (~${activeWorkout.content?.length} chars)`);
      }
    }
    console.log(`ðŸ¤– [SYSTEM PROMPT] Context: ${workoutContext.substring(0, 100)}...`);

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
1. DETECT: Identify if the user is speaking English or Sinhala/Singlish.
2. ENGLISH: If user speaks English, respond ONLY in English.
3. SINHALA: If user speaks Sinhala OR Singlish (phonetic Sinhala like "kohomada", "ade thank you bn"), respond ONLY in Sinhala Script (සිංහල අකුරෙන්).
4. NO SINGLISH: Never respond using Singlish (phonetic Sinhala). Always use proper Sinhala Script or English.
5. NATURAL FLOW: Avoid stiff or literal translations in Sinhala. Use natural, warm, and conversational Sinhala (e.g., instead of "ඔබ හොඳ ආධාර ලබනවා", use "ඔබට ස්තූතියි! අපි ඔබගේ ඉලක්ක කරා යෑමට සූදානම්.").
6. CASUAL HANDLING: If the user is friendly/casual (using "ade", "macho", "bn"), respond with high "coach energy"—be warm, supportive, and motivating in your Sinhala script response.

STRICT WORKOUT & DIET PROTOCOLS:
1. FRESH GENERATION: If the user asks for a "new", "fresh", or "different" workout/diet plan (e.g., "give me a new 2 day plan"), you MUST generate a completely new plan based on their stats. Do NOT just repeat the "Active Workout Context". Use the context only to avoid previous mistakes or to progress from it.
2. SRI LANKAN DIET: All diet plans MUST be centered around Sri Lankan food culture. Include healthy versions of local foods like Red Rice, Dhal, Gotukola, Coconut Sambol (in moderation), Fish/Chicken Curries, Egg hoppers, and local fruits like Papaya and Mango.
3. TABLE STRUCTURE: Use Markdown Tables for ALL workout routines (Exercise, Sets, Reps, Rest) and diet plans (Meal Time, Food Item, Portion).
4. DISPLAY FIRST: You MUST always display the full plan (Workout or Diet) in the chat first using the Markdown table format. 
5. PDF DOWNLOADS: Only AFTER displaying the full plan, inform the user they can download it as a professional PDF by clicking the download button that appears below your message. Do NOT just provide a download link or offer only the download.

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
    
    // --- ACCURATE GROQ QUOTA TRACKING ---
    const remTokens = groqRes.headers.get("x-ratelimit-remaining-tokens");
    const limTokens = groqRes.headers.get("x-ratelimit-limit-tokens");
    const remReqs = groqRes.headers.get("x-ratelimit-remaining-requests");
    const limReqs = groqRes.headers.get("x-ratelimit-limit-requests");

    // 6. LOG TOKEN USAGE
     if (data.usage) {
       console.log(`🎫 Tokens: Prompt: ${data.usage.prompt_tokens} | Completion: ${data.usage.completion_tokens} | Total: ${data.usage.total_tokens}`);
      
       if (remTokens && limTokens) {
          const tpmUsed = ((Number(limTokens) - Number(remTokens)) / Number(limTokens) * 100).toFixed(2);
          console.log(`📉 TPM Usage (Per Minute): ${tpmUsed}% [${remTokens}/${limTokens} tokens left]`);
       }

       if (remReqs && limReqs) {
          const rpdUsed = ((Number(limReqs) - Number(remReqs)) / Number(limReqs) * 100).toFixed(2);
          console.log(`📊 RPD Usage (Daily Requests): ${rpdUsed}% [${remReqs}/${limReqs} requests left]`);
       }
    }
    console.log(`-------------------------------------------`);

    if (!groqRes.ok || !data.choices?.[0]) {
       throw new Error(data.error?.message || "AI API Error");
    }

    const responseText = data.choices[0].message.content;

    // SAVE & UPDATE (Bulletproof Upsert for New Users)
    await query("INSERT INTO chat_history (userid, role, message, session_id, input_type, file_name) VALUES ($1, 'user', $2, $3, $4, $5)", [uid, message, sessionId, inputType || 'text', fileName || null]);
    await query("INSERT INTO chat_history (userid, role, message, session_id, input_type) VALUES ($1, 'model', $2, $3, 'text')", [uid, responseText, sessionId]);
    
    // Reset count logic synchronized with 2-hour window
    const resetCount = hoursPassed >= 2 ? 1 : Number(userData.daily_count || 0) + 1;
    
    await query(`
      INSERT INTO ai_usage (userid, daily_count, last_message_at) 
      VALUES ($1, $2, NOW())
      ON CONFLICT (userid) 
      DO UPDATE SET daily_count = $2, last_message_at = NOW()
    `, [uid, resetCount]);

    // LOG USER USAGE
    console.log(`👤 User: ${uid} | Package: ${userData.package_name || 'Free'} | Session: ${sessionMsgCount + 1}/${CURRENT_SESSION_MAX} | Used: ${resetCount}/${DAILY_LIMIT} | Left: ${Math.max(0, DAILY_LIMIT - resetCount)}`);
    console.log(`-------------------------------------------`);

    res.json({ text: responseText, usage: { current: resetCount, max: DAILY_LIMIT, sessionMax: SESSION_MAX } });

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

// --- 5. PDF GENERATION ENGINE ---
aiRouter.post("/generate-plan-pdf", async (req, res) => {
  const { content, title, userName } = req.body;
  if (!content) return res.status(400).json({ message: "Content is required" });

  try {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="narrow_fitness_plan.pdf"`);

    doc.pipe(res);

    const ORANGE = '#f97316';
    const BLACK = '#000000';
    const GRAY = '#4b5563';

    // Header
    doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(24).text('NARROW FITNESS', { align: 'center' });
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text('ELITE PERFORMANCE HUB', { align: 'center' });
    doc.moveDown(1);
    
    doc.rect(40, doc.y, 515, 2).fill(ORANGE);
    doc.moveDown(1);

    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(18).text(title?.toUpperCase() || 'FITNESS & DIET PLAN');
    doc.fontSize(10).font('Helvetica').fillColor(GRAY).text(`Athlete: ${userName || 'N/A'}`);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`);
    doc.moveDown(2);

    // Process Content - Improved Table Detection
    const lines = content.split('\n');
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    for (const line of lines) {
        if (line.includes('|') && line.trim().startsWith('|')) {
            const cells = line.split('|').filter(c => c.trim().length > 0).map(c => c.trim());
            
            if (line.includes('---')) {
                inTable = true;
                continue;
            }

            if (!inTable) {
                tableHeaders = cells;
                inTable = true;
            } else {
                tableRows.push(cells);
            }
        } else {
            if (inTable && tableHeaders.length > 0) {
                // Render Collected Table
                renderPdfTable(doc, tableHeaders, tableRows);
                tableHeaders = [];
                tableRows = [];
                inTable = false;
                doc.moveDown(1);
            }
            
            // Regular Text
            if (line.trim()) {
                const cleanLine = line.replace(/\*\*/g, '').replace(/#/g, '').trim();
                if (line.startsWith('#')) {
                    doc.fillColor(ORANGE).font('Helvetica-Bold').fontSize(14).text(cleanLine);
                } else if (line.startsWith('**')) {
                    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11).text(cleanLine);
                } else {
                    doc.fillColor(BLACK).font('Helvetica').fontSize(10).text(line.trim());
                }
                doc.moveDown(0.5);
            }
        }
    }

    // Final table if content ends with one
    if (inTable && tableHeaders.length > 0) renderPdfTable(doc, tableHeaders, tableRows);

    doc.moveDown(2);
    doc.rect(40, doc.y, 515, 1).fill('#eeeeee');
    doc.moveDown(1);
    doc.fillColor(GRAY).fontSize(8).text('Disclaimer: Consult with a medical professional before starting any new fitness or nutrition program. This plan is generated by the Narrow Fitness AI Assistant.', { align: 'center' });

    doc.end();
  } catch (err: any) {
    console.error("PDF Gen Error:", err.message);
    if (!res.headersSent) res.status(500).send("PDF Generation Failed");
  }
});

function renderPdfTable(doc: any, headers: string[], rows: string[][]) {
    const startX = 40;
    const availableWidth = 515;
    const colCount = Math.max(headers.length, 1);
    const colWidth = availableWidth / colCount;
    let currentY = doc.y;

    // Header Background
    doc.rect(startX, currentY, availableWidth, 20).fill('#000000');
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
    
    headers.forEach((h, i) => {
        doc.text(h.toUpperCase(), startX + (i * colWidth) + 5, currentY + 6, { width: colWidth - 10, align: 'left' });
    });

    currentY += 20;
    doc.fillColor('#000000').font('Helvetica').fontSize(8);

    rows.forEach((row, rowIndex) => {
        // Auto-page break if needed
        if (currentY > 750) {
            doc.addPage();
            currentY = 40;
        }

        const rowHeight = 18;
        if (rowIndex % 2 === 0) {
            doc.rect(startX, currentY, availableWidth, rowHeight).fill('#f7f7f7');
        }
        
        doc.fillColor('#000000');
        row.forEach((cell, i) => {
            doc.text(cell, startX + (i * colWidth) + 5, currentY + 5, { width: colWidth - 10, align: 'left' });
        });
        currentY += rowHeight;
    });
    
    doc.y = currentY + 10;
}

export default aiRouter;