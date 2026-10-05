import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDb } from './db';
import { authRouter } from './routes/authRoutes';
import { queryRouter } from './routes/queryRoutes';
import { guidelinesRouter } from './routes/guidelinesRoutes';
import { aiRouter } from './routes/aiRoutes';
import { uploadRouter } from './routes/uploadRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration: Allow all origins in development, support credentials and Authorization header
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

// Serve uploaded documents statically
const uploadsDir = path.resolve(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/queries', queryRouter);
app.use('/api/guidelines', guidelinesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/upload', uploadRouter);

// Root landing page
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>CampusDesk AI - API Server</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: #0B0F1A; color: #F1F5F9; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .card { background: #131B2E; border: 1px solid #1E293B; border-radius: 16px; padding: 40px; max-width: 540px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; }
        .badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: #10B981; padding: 6px 14px; border-radius: 9999px; font-size: 13px; font-weight: 600; margin-bottom: 20px; }
        .dot { width: 8px; height: 8px; background: #10B981; border-radius: 50%; }
        h1 { font-size: 26px; font-weight: 700; margin-bottom: 12px; color: #FFFFFF; }
        p { color: #94A3B8; font-size: 15px; line-height: 1.6; margin-bottom: 28px; }
        .btn { display: inline-block; background: linear-gradient(135deg, #6366F1, #8B5CF6); color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 16px; transition: opacity 0.2s; box-shadow: 0 8px 20px rgba(99, 102, 241, 0.35); }
        .btn:hover { opacity: 0.9; }
        .endpoints { margin-top: 32px; padding-top: 24px; border-top: 1px solid #1E293B; text-align: left; }
        .endpoints-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748B; font-weight: 700; margin-bottom: 12px; }
        .endpoint-link { display: flex; justify-content: space-between; color: #38BDF8; text-decoration: none; font-size: 13px; padding: 6px 0; font-family: monospace; }
        .endpoint-link:hover { text-decoration: underline; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="badge"><span class="dot"></span> Backend API Live</div>
        <h1>CampusDesk AI API Server</h1>
        <p>This port (<code>:5000</code>) runs the backend API and database services. The interactive web application runs on port <strong>8081</strong>.</p>
        <a class="btn" href="http://localhost:8081" target="_self">👉 Open CampusDesk Web App (Port 8081)</a>
        <div class="endpoints">
          <div class="endpoints-title">API Endpoints</div>
          <a class="endpoint-link" href="/health"><span>GET /health</span><span>Health Status &rarr;</span></a>
          <a class="endpoint-link" href="/api/guidelines"><span>GET /api/guidelines</span><span>Policies &rarr;</span></a>
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'CampusDesk Backend',
    database: 'SQLite (sql.js)',
    timestamp: new Date().toISOString(),
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`[CampusDesk] Backend server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[CampusDesk] Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
