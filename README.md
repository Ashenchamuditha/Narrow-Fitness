<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fcab0874-a31c-441c-b9de-9a5dd54e2b90

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
Narrow Fitness – Comprehensive Gym Management Platform (Full-Stack Web Application)
Tech Stack: TypeScript, React 19, Express.js, PostgreSQL, Neon Cloud, Groq AI (Llama 3.3), Socket.io

Key Features & Accomplishments:

Intelligent AI Fitness Assistant – Integrated Groq's Llama 3.3 AI model to provide personalized workout recommendations and nutrition guidance in real-time, with persistent chat history and daily usage tracking
Role-Based Access Control (RBAC) – Implemented secure three-tier authorization system for Members, Trainers, and Admins with JWT-based authentication and encrypted password handling (bcryptjs)
Member Onboarding & Profile Management – Designed comprehensive member registration flow with profile completion tracking, fitness goals assessment, and real-time dashboard statistics
Class & Workout Management – Built admin-driven system for scheduling fitness classes, managing trainer profiles, and member enrollment with real-time updates via WebSocket (Socket.io)
Payment & Subscription System – Developed pricing tier management with package selection, payment tracking, and subscription analytics
Email Verification & OTP Security – Implemented secure contact inquiry system with Nodemailer OTP verification and input validation
Real-Time Communication – Enabled WebSocket integration for live notifications, class updates, and AI chat synchronization across multiple connected clients
Cloud-Based Architecture – Deployed with PostgreSQL on Neon Cloud with environment-based SSL configuration for production-grade reliability
Gallery & Content Management – Built admin interface for managing gym gallery with dynamic image uploads and public display
System Health Monitoring – Integrated comprehensive startup checks for database connectivity, API validation, and service verification
