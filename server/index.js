const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const multer = require('multer');
const { initDb } = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5100;

// Security Headers with Helmet
app.use(helmet({
  contentSecurityPolicy: false, // Allows inline document & blob viewing
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false // Allows iframe document preview
}));
app.disable('x-powered-by'); // Hide server technology fingerprint

// CORS with origin validation & credentials support
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim())
  : ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error('Blocked by CORS policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Body Parsers with strict size limits to prevent DOS
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Apply General Rate Limiter to all /api routes
app.use('/api', apiLimiter);

// Serve static uploads directory for local fallback
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');
const userRoutes = require('./routes/userRoutes');
const projectRoutes = require('./routes/projectRoutes');
const shareUploadRoutes = require('./routes/shareUploadRoutes');

// Root health check endpoint (Public)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'S3 PostgreSQL File Management API'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/share-upload', shareUploadRoutes);
app.use('/api', projectRoutes);

// Multer & Global Error Handling Middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds maximum limit of 25MB.' });
    }
    return res.status(400).json({ error: `File upload error: ${err.message}` });
  } else if (err) {
    return res.status(400).json({ error: err.message || 'An unexpected error occurred.' });
  }
  next();
});

// Initialize Database & Start Server
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  });
});

// Ensure in-memory store is flushed to disk on graceful shutdown
const memoryStore = require('./config/memoryStore');
const handleShutdown = () => {
  try {
    memoryStore.saveStore();
  } catch (_) {}
  process.exit(0);
};
process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
