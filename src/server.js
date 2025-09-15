const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
require('dotenv').config();

// Import configurations
const { databaseService } = require('./config/database');

// Import middleware
const { 
  globalErrorHandler, 
  handleNotFound 
} = require('./middleware/errorHandler');
const {
  generalLimiter,
  helmetConfig,
  corsOptions,
  requestLogger,
  securityHeaders,
  validateRequest
} = require('./middleware/security');
const { sanitizeRequest } = require('./middleware/validation');

// Import routes
const phoneRoutes = require('./routes/phoneRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const seekerRoutes = require('./routes/seekerRoutes');
const companyRoutes = require('./routes/companyRoutes');
const jobRoutes = require('./routes/jobRoutes');
const userJourneyRoutes = require('./routes/userJourneyRoutes');
const callbackRoutes = require('./routes/callback');
const chatRoutes = require('./routes/chatRoutes');
const jobApplicationRoutes = require('./routes/jobApplicationRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const instantHireRoutes = require('./routes/instantHireRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const emailHistoryRoutes = require('./routes/emailHistoryRoutes');

/**
 * Shift Backend API Server
 * Node.js + Express + Firebase/Firestore
 */
class ShiftServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.environment = process.env.NODE_ENV || 'development';
    this.databaseEnabled = false;
  }

  /**
   * Initialize server
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Shift Backend Server...');
      console.log(`📍 Environment: ${this.environment}`);
      console.log(`🌐 Port: ${this.port}`);
      
      // Initialize database (with fallback)
      await this.initializeDatabase();
      
      // Configure middleware
      this.configureMiddleware();
      
      // Configure routes
      this.configureRoutes();
      
      // Configure error handling
      this.configureErrorHandling();
      
      // Start server
      this.startServer();
      
    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      // Don't exit immediately, try to start without database
      console.log('⚠️  Attempting to start server without database...');
      this.startServerWithoutDatabase();
    }
  }

  /**
   * Initialize database connection with fallback
   */
  async initializeDatabase() {
    try {
      // Check if Firebase credentials are available
      const hasFirebaseCredentials = process.env.FIREBASE_SERVICE_ACCOUNT || 
                                   process.env.FIREBASE_PROJECT_ID ||
                                   process.env.FIREBASE_DATABASE_URL;
      
      if (!hasFirebaseCredentials) {
        console.log('⚠️  No Firebase credentials found. Database features will be disabled.');
        this.databaseEnabled = false;
        return;
      }

      await databaseService.initialize();
      this.databaseEnabled = true;
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      console.log('⚠️  Continuing without database...');
      this.databaseEnabled = false;
      // Don't throw error, allow server to start without database
    }
  }

  /**
   * Configure middleware
   */
  configureMiddleware() {
    console.log('⚙️  Configuring middleware...');

    // Trust proxy for accurate IP addresses (important for Railway)
    this.app.set('trust proxy', 1);

    // Security middleware (disabled for development)
    if (this.environment !== 'development') {
      this.app.use(helmetConfig);
      this.app.use(securityHeaders);
    }
    
    // CORS - Simplified for debugging
    const railwayCorsOptions = {
      origin: true, // Allow all origins for debugging
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };
    this.app.use(cors(railwayCorsOptions));
    
    // Compression
    this.app.use(compression());
    
    // Rate limiting (disabled for development)
    if (this.environment !== 'development') {
      this.app.use('/api/', generalLimiter);
    }
    
    // Request logging
    if (this.environment === 'development') {
      this.app.use(morgan('dev'));
    } else {
      this.app.use(morgan('combined'));
    }
    this.app.use(requestLogger);
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request validation and sanitization (disabled for development)
    if (this.environment !== 'development') {
      this.app.use(validateRequest);
      this.app.use(sanitizeRequest);
    }

    console.log('✅ Middleware configured successfully');
  }

  /**
   * Configure API routes
   */
  configureRoutes() {
    console.log('🛣️  Configuring routes...');

    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Shift Backend API is running',
        timestamp: new Date().toISOString(),
        environment: this.environment,
        version: '1.0.0',
        database: this.databaseEnabled ? 'connected' : 'disabled'
      });
    });

    // API routes (only if database is enabled)
    if (this.databaseEnabled) {
      this.app.use('/api/phone', phoneRoutes);
      this.app.use('/api/onboarding', onboardingRoutes);
      this.app.use('/api/seekers', seekerRoutes);
      this.app.use('/api/companies', companyRoutes);
      this.app.use('/api/jobs', jobRoutes);
      this.app.use('/api/journey', userJourneyRoutes);
      this.app.use('/api/chats', chatRoutes);
      this.app.use('/api/', jobApplicationRoutes);
      this.app.use('/api/', interviewRoutes);
      this.app.use('/api/', instantHireRoutes);
      this.app.use('/api/notifications', notificationRoutes);
      this.app.use('/api/email-history', emailHistoryRoutes);
      console.log('✅ Database routes enabled (including chat, applications, interviews, instant hires, notifications & email history)');
    } else {
      // Mock routes for when database is disabled
      this.app.use('/api/phone', (req, res) => {
        res.status(503).json({ 
          success: false, 
          message: 'Database not available. Please check Firebase configuration.' 
        });
      });
      this.app.use('/api/onboarding', (req, res) => {
        res.status(503).json({ 
          success: false, 
          message: 'Database not available. Please check Firebase configuration.' 
        });
      });
      this.app.use('/api/seekers', (req, res) => {
        res.status(503).json({ 
          success: false, 
          message: 'Database not available. Please check Firebase configuration.' 
        });
      });
      this.app.use('/api/companies', (req, res) => {
        res.status(503).json({ 
          success: false, 
          message: 'Database not available. Please check Firebase configuration.' 
        });
      });
      this.app.use('/api/jobs', (req, res) => {
        res.status(503).json({ 
          success: false, 
          message: 'Database not available. Please check Firebase configuration.' 
        });
      });
      this.app.use('/api/journey', (req, res) => {
        res.status(503).json({ 
          success: false, 
          message: 'Database not available. Please check Firebase configuration.' 
        });
      });
      console.log('⚠️  Database routes disabled - using mock responses');
    }

    // Callback routes (always available)
    this.app.use('/api/callback', callbackRoutes);

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Shift Backend API v1.0.0',
        documentation: '/api/docs',
        environment: this.environment,
        database: this.databaseEnabled ? 'connected' : 'disabled',
        endpoints: {
          health: '/health',
          phone: '/api/phone',
          onboarding: '/api/onboarding',
          seekers: '/api/seekers',
          companies: '/api/companies',
          jobs: '/api/jobs',
          journey: '/api/journey',
          callback: '/api/callback',
          notifications: '/api/notifications'
        },
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ Routes configured successfully');
  }

  /**
   * Configure error handling
   */
  configureErrorHandling() {
    console.log('🛡️  Configuring error handling...');

    // Handle unhandled routes
    this.app.all('*', handleNotFound);
    
    // Global error handler
    this.app.use(globalErrorHandler);

    console.log('✅ Error handling configured successfully');
  }

  /**
   * Start the server
   */
  startServer() {
    const server = this.app.listen(this.port, '0.0.0.0', () => {
      console.log('🎉 Server started successfully!');
      console.log(`📍 Environment: ${this.environment}`);
      console.log(`🌐 Server running on port ${this.port}`);
      console.log(`🔗 Health check: http://localhost:${this.port}/health`);
      console.log(`📚 API docs: http://localhost:${this.port}/api`);
      console.log(`💾 Database: ${this.databaseEnabled ? 'Connected' : 'Disabled'}`);
      console.log('────────────────────────────────────────');
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received. Shutting down gracefully...');
      server.close(() => {
        console.log('✅ Process terminated');
        process.exit(0);
      });
    });

    return server;
  }

  /**
   * Start server without database (fallback)
   */
  startServerWithoutDatabase() {
    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
    this.startServer();
  }
}

/**
 * Handle uncaught exceptions and unhandled rejections
 */
process.on('uncaughtException', (err) => {
  console.error('💥 UNCAUGHT EXCEPTION! Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('💥 UNHANDLED REJECTION! Shutting down...');
  console.error('Error:', err.name, err.message);
  console.error('Stack:', err.stack);
  process.exit(1);
});

/**
 * Initialize and start the server
 */
if (require.main === module) {
  const server = new ShiftServer();
  server.initialize();
}

module.exports = ShiftServer;