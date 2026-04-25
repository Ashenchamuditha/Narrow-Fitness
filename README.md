# Narrow Fitness - Client-Server Refactor

This project has been refactored into a separate frontend and backend architecture.

## Directory Structure
- `frontend/`: React + Vite application.
- `backend/`: Node.js + Express + PostgreSQL application.

## Getting Started

### Backend
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Set up your `.env` file (one has been provided from the original root).
4. Start the server: `npm run dev` (starts on port 5000)

### Frontend
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev` (starts on port 5173, proxies `/api` to port 5000)

## Features
- Isolated API routes in `backend/src/routes`.
- Shared PostgreSQL database.
- Real-time updates via Socket.io.
- AI Assistant integration.
- Admin and Member dashboards.
