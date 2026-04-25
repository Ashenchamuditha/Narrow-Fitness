# Narrow Fitness - Client-Server Refactor

This project has been refactored into a separate frontend and backend architecture.

## Directory Structure
- `frontend/`: React + Vite application.
- `backend/`: Node.js + Express + PostgreSQL application.

## Getting Started with Docker (Recommended)

This project is fully dockerized for easy deployment and development.

1. **Prerequisites**: Ensure you have [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed.
2. **Environment Setup**: Copy `.env.example` to `.env` and fill in your API keys and email credentials.
   ```bash
   cp .env.example .env
   ```
3. **Run the Application**:
   ```bash
   docker-compose up --build
   ```
4. **Access**:
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:5000`

The Docker setup includes:
- **Frontend**: Multi-stage build served via Nginx with automated API proxying.
- **Backend**: Node.js Express server with auto-restart.
- **Database**: PostgreSQL 16 container with persistent volumes.

## Manual Setup

### Backend
1. Navigate to the backend directory: `cd backend`
2. Install dependencies: `npm install`
3. Set up your `.env` file.
4. Start the server: `npm run dev`

### Frontend
1. Navigate to the frontend directory: `cd frontend`
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev` (proxies `/api` to port 5000)

## Features
- Isolated API routes in `backend/src/routes`.
- Shared PostgreSQL database.
- Real-time updates via Socket.io.
- AI Assistant integration.
- Admin and Member dashboards.
