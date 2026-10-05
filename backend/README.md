# CampusDesk Backend (`backend/`)

Express API service providing AI integration (Gemini / Mistral) and campus data routing for the CampusDesk platform.

## Setup

1. Install dependencies:
   ```bash
   cd backend
   npm install
   ```

2. Copy `.env.example` to `.env` and configure your API key:
   ```env
   PORT=5000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Endpoints

* `GET /health`: Health check endpoint.
* `POST /api/ai/query`: Send student query and optional college guidelines context to Gemini AI.
* `GET /api/guidelines`: Retrieve official college bylaws and guidelines.
