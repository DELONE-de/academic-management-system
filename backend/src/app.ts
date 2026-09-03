// src/app.ts

import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

// Validate environment before anything else
import { validateEnv } from './config/env.js';
validateEnv();

import routes from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { requestCorrelation, logger } from './utils/logger.js';
import process from 'process';

// Create Express application
const app: Application = express();

// ======================
// GLOBAL RATE LIMITING
// ======================

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100,
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

// CORS configuration
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',')
  : ['http://localhost:3000'];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.some((o) => origin.startsWith(o.trim())) ||
        /\.vercel\.app$/.test(origin) ||
        origin === 'http://localhost:3000';
      if (isAllowed) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
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

// Cookie parsing (for HttpOnly auth cookie)
app.use(cookieParser());

// ======================
// ROUTES
// ======================

// API routes — CSRF protection for cookie-authenticated state-changing requests
app.use('/api', csrfProtection, routes);

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