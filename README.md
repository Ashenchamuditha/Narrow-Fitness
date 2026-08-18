# 🏋️‍♂️ Narrow Fitness

### A Full-Stack AI-Powered Gym Management & Virtual Personal Coaching Platform

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Node](https://img.shields.io/badge/Node.js-v20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Managed-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Groq](https://img.shields.io/badge/Groq_AI-Llama_3.3_/_Whisper-orange?style=for-the-badge)](https://groq.com/)

**Narrow Fitness** is a modern, responsive web application designed to bridge the gap between day-to-day gym operations and customized fitness coaching. Built with a decoupled architecture, it integrates unified dashboards for gym staff, a real-time QR-based check-in system, and a multimodal virtual AI assistant capable of processing text, images, files, and voice notes.

---

## 🚀 Key Features

*   **🛡️ Multi-Role Portals:** Complete user authentication (JWT + BCrypt) supporting three distinct access levels: **Members**, **Trainers**, and **Administrators**.
*   **🤖 Multimodal AI Coach (Groq & Llama):**
    *   *Contextual Chat:* Conversational training advice based on the user's specific health goals, age, injuries, and allergies.
    *   *Vision OCR:* Upload images of workout logs or diet schedules to instantly extract lists into interactive tables.
    *   *Voice Input:* Hands-free coaching via **Groq Whisper Large v3** audio transcription.
    *   *Document Parser:* Upload Word (`.docx`) or PDF documents to feed customized workout cards directly into the AI coach.
*   **⚡ Real-Time Attendance System:** Unique digital member QR passes scanned directly via the browser (using `html5-qrcode`), broadcasting attendance to the admin console instantly via **Socket.io**.
*   **📊 Interactive Dashboards:** Members can track weight changes, count target macros, log active workout routines, and check scheduled group classes.
*   **🧾 Automated Billing:** System registers packages (Basic, Pro, Personal Training) and generates dynamic PDF receipts on-the-fly via **PDFKit** for easy member downloads.

---

## 🛠️ Technology Stack

### Frontend
*   **Library:** React 19, TypeScript
*   **Bundler:** Vite
*   **Styling:** Tailwind CSS v4, Framer Motion (for animations), Lucide React (for iconography)
*   **Utilities:** `html5-qrcode` (camera barcode scanning), `socket.io-client`

### Backend
*   **Runtime:** Node.js, TypeScript (run via `tsx`)
*   **Framework:** Express.js (v5)
*   **Database Client:** `pg` (PostgreSQL client)
*   **Security:** JSON Web Tokens (JWT), `bcryptjs`
*   **Real-time:** `socket.io`
*   **Document Engines:** `pdfkit` (PDF generation), `pdf-parse`, `mammoth` (Word text extraction)

### External Integrations
*   **Groq Cloud API:** Llama-3.1-8B-Instant, Llama-3.3-70B-Versatile, Llama-4-Scout-Instruct (Vision), and Whisper-Large-V3 (Speech-to-Text).
*   **Google Generative AI:** SDK ready for Gemini operations.
*   **SMTP Mail:** Nodemailer for automated gym registration/verification emails.

---

## 📂 Project Structure

```text
Narrow-Fitness-main/
├── backend/
│   ├── src/
│   │   ├── routes/          # Express API controllers (Admin, AI, Members, Payments, Attendance)
│   │   ├── services/        # Business logic services (Email, PDF generation)
│   │   └── index.ts         # Server entry point & database connection setup
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Reusable UI components & layouts
│   │   ├── pages/           # Client views (Dashboard, Workouts, Onboarding, Payments, Admin panels)
│   │   ├── App.tsx          # Client routing configuration
│   │   └── main.tsx         # Frontend render target
│   ├── package.json
│   └── vite.config.ts
└── package.json             # Root monorepo descriptor
```

---

## ⚙️ Installation & Local Setup

### Prerequisites
*   Node.js (v20 or higher)
*   PostgreSQL Database instance

### 1. Clone & Set Up the Repository
```bash
git clone https://github.com/your-username/Narrow-Fitness.git
cd Narrow-Fitness
```

### 2. Configure Backend Environment
Navigate to the `backend/` directory, create a `.env` file, and add the following parameters:
```bash
cd backend
# Create .env file
```
```env
PORT=5000
DATABASE_URL=postgresql://username:password@localhost:5432/narrow_fitness
JWT_SECRET=your_jwt_signature_secret
GROQ_API_KEY=your_groq_cloud_api_key
GEMINI_API_KEY=your_google_gemini_api_key
EMAIL_USER=your_smtp_email_username
EMAIL_PASS=your_smtp_email_password
```

Install backend dependencies and run the server:
```bash
npm install
npm run dev
```

### 3. Configure Frontend Environment
Navigate to the `frontend/` directory, create a `.env` file, and add the API endpoint:
```bash
cd ../frontend
# Create .env file
```
```env
VITE_API_URL=http://localhost:5000
```

Install frontend dependencies and start the development server:
```bash
npm install
npm run dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🔒 Security & Optimization

*   **Rate Limits:** Built-in usage tracker (`ai_usage` table) enforcing daily LLM chat quotas matched to the member's subscription package (Free: 10, Basic: 15, Pro: 20, Personal Training: 35) with a rolling 2-hour reset cooldown.
*   **Role Guards:** Middleware checks verifying JWT claims (`admin`, `trainer`, `member`) before allowing access to restricted endpoints.
*   **PDF Extraction Fail-safes:** Dynamic ESM-wrapped extraction handles multiple parse configurations, ensuring stable execution inside containerized environments (Docker).

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
