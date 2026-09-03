// src/app.ts

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// Load environment variables
dotenv.config();

// Validate environment before anything else
import { validateEnv } from './config/env.js';
validateEnv();

import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { requestCorrelation, logger } from './utils/logger.js';
import process from 'process';

// Create Express application
const app: Application = express();

// ======================
// TRUST PROXY
// ======================
// Render sits behind a reverse proxy and sets X-Forwarded-For. Without this,
// express-rate-limit sees the proxy's IP instead of the client's, which causes
// ERR_ERL_UNEXPECTED_X_FORWARDED_FOR from rate-limit and misidentifies clients.
app.set('trust proxy', 1);

// ======================
// GLOBAL RATE LIMITING
// ======================

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later' },
});

app.use(globalLimiter);

// ======================
// MIDDLEWARE
// ======================

// Security headers
app.use(helmet());

// Request correlation ID + structured logging
app.use(requestCorrelation);

// CORS configuration — explicit origins only (no wildcard patterns).
// FRONTEND_URL is a comma-separated list of the exact allowed origins
// (e.g. the Vercel production/preview URLs). localhost is allowed in
// non-production for local development.
// Note: `credentials: true` is not needed — auth is header-based (Bearer
// token), not cookie-based, so the browser never sends ambient credentials.
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((o) => o.trim().replace(/\/$/, '')).filter(Boolean)
  : [];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no Origin (e.g. same-origin / curl / integration tests)
      if (!origin) return callback(null, true);
      const devOrigins = process.env.NODE_ENV === 'production' ? [] : ['http://localhost:3000'];
      if (allowedOrigins.includes(origin) || devOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging — use structured logger instead of morgan
// (morgan kept only in development for the concise console format)
if (process.env.NODE_ENV !== 'production' && process.env.MORGAN) {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ======================
// ROUTES
// ======================

app.use('/api', routes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'GPA/CGPA Academic Management System API',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// ======================
// ERROR HANDLING
// ======================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ======================
// SERVER STARTUP
// ======================

const PORT = process.env.PORT || 5000;

async function startServer(): Promise<void> {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║   🎓 GPA/CGPA Academic Management System                ║
║                                                          ║
║   Server running on port ${PORT}                           ║
║   Environment: ${process.env.NODE_ENV || 'development'}                        ║
║                                                          ║
║   API: http://localhost:${PORT}/api                        ║
║   Health: http://localhost:${PORT}/api/health              ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

// Start the server only when run directly (not when imported by tests)
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;