# Narrow Fitness – Comprehensive Gym Management Platform

**Individual Final Year Project** | Full-Stack Web Application

---

## 📋 Project Overview
Engineered a complete **gym management system** with AI-powered assistance, enabling seamless member enrollment, class scheduling, payment processing, and personalized fitness guidance—all from a single integrated platform.

**Tech Stack:** TypeScript | React 19 | Express.js | PostgreSQL (Neon Cloud) | Groq AI (Llama 3.3) | Socket.io | JWT | Tailwind CSS

---

## 🎯 Core Features Implemented

### 🤖 AI Fitness Assistant (Solo Development)
- Integrated **Groq Llama 3.3** LLM for real-time personalized workout & nutrition guidance
- Built persistent **chat history system** with daily usage limits per user
- Implemented AI response caching & error handling for production stability
- Created dedicated `/api/member/ai` routes with role-based access control

### 🔐 Authentication & Security (Solo Development)
- Designed **JWT-based authentication** with 24-hour token expiration
- Implemented **bcryptjs password hashing** for secure credential storage
- Built **three-tier RBAC system** (Admin/Trainer/Member) with route protection
- Created **OTP email verification** for contact inquiries using Nodemailer
- Added email validation regex & input sanitization across all endpoints

### 👤 Member Management (Solo Development)
- Designed **member onboarding flow** with profile completion tracking
- Built member profile system storing fitness goals, weight, height, and preferences
- Created **member dashboard** displaying real-time stats and enrollment status
- Implemented member search/filter functionality in admin panel
- Added member activity tracking and engagement metrics

### 📅 Class & Workout Management (Solo Development)
- Built **admin class scheduling system** with trainer assignment
- Created member class enrollment with capacity management
- Implemented **real-time class updates** via WebSocket notifications
- Designed workout tracking page for members to log exercises
- Added trainer profile management with bio, images, and specialization

### 💳 Payment & Subscription System (Solo Development)
- Developed **pricing tier system** with package selection (Basic/Pro/Premium)
- Built **payment tracking dashboard** with transaction history
- Implemented subscription status management and renewal logic
- Created package upgrade/downgrade functionality
- Added payment analytics for admin insights

### 📡 Real-Time Communication (Solo Development)
- Implemented **Socket.io WebSocket server** for live class notifications
- Built real-time **AI chat synchronization** across browser tabs
- Created live member count updates in admin dashboard
- Enabled instant class status changes (Active/Cancelled/Full)
- Added connection monitoring & automatic reconnection logic

### 🏗️ Database & Cloud Architecture (Solo Development)
- Designed **normalized PostgreSQL schema** with 10+ tables (users, profiles, classes, payments, etc.)
- Configured **dual-mode database connection**: Local development + Neon Cloud production
- Implemented **SSL security** for cloud connections with environment detection
- Created **auto-initialization database tables** on server startup
- Built comprehensive **database health checks** with error logging

### 🖼️ Content Management (Solo Development)
- Built **admin gallery management system** with CRUD operations
- Implemented **image upload handling** via Multer middleware
- Created public-facing gallery component with lazy loading
- Added gallery sorting and deletion functionality

### ✅ System Reliability (Solo Development)
- Designed **comprehensive startup health checks**:
  - Database connectivity verification
  - Groq AI API validation
  - Mail server status confirmation
  - Environment variable audit
- Implemented **request logging middleware** for debugging
- Created **error handling** across all routes with meaningful messages
- Added **graceful database connection pooling** with pg library

---

## 🛠️ Technical Achievements

| Feature | Technology | Impact |
|---------|-----------|--------|
| AI Responses | Groq Llama 3.3 API | Real-time, low-latency guidance |
| Authentication | JWT + bcryptjs | Secure 24-hour sessions |
| Real-Time Updates | Socket.io | Sub-second sync across clients |
| Database | PostgreSQL + Neon | Scalable, production-ready |
| Email System | Nodemailer + OTP | Verified user interactions |
| Deployment | Vercel + Neon Cloud | 99%+ uptime, auto-scaling |

---

## 📊 Functionality Matrix

```
Authentication:    ✅ Login/Register | ✅ OTP Verification | ✅ Password Hashing
Member Features:   ✅ Profile Setup | ✅ Class Enrollment | ✅ AI Chat | ✅ Payment History
Admin Features:    ✅ Member Management | ✅ Class Scheduling | ✅ Trainer Management | ✅ Revenue Analytics
AI Assistant:      ✅ Persistent Chat | ✅ Daily Limits | ✅ Groq Integration | ✅ History Tracking
Real-Time:         ✅ WebSocket Sync | ✅ Live Notifications | ✅ Class Updates
Security:          ✅ RBAC | ✅ JWT Tokens | ✅ Email Verification | ✅ Input Validation
```

---

## 🚀 Project Statistics

- **Total Lines of Code:** 5,000+
- **Components Built:** 25+ React components
- **API Endpoints:** 30+ Express routes
- **Database Tables:** 10+ PostgreSQL tables
- **Development Time:** 3+ months (solo)
- **GitHub Commits:** 50+ documented commits

---

## 💡 Key Learning Outcomes

✓ Full-stack TypeScript development with modern frameworks  
✓ AI/LLM integration patterns and API management  
✓ Real-time communication with WebSockets  
✓ Cloud database deployment and security  
✓ Production-grade authentication & authorization  
✓ Email service integration & OTP workflows  
✓ System design & scalable architecture  

---

## 🔗 Repository
**GitHub:** [Ashenchamuditha/Narrow-Fitness](https://github.com/Ashenchamuditha/Narrow-Fitness)

---

*Solo Full-Stack Development | Production-Ready Application | Cloud-Deployed System*
