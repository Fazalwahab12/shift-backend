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

/**
 * Shift Backend API Server
 * Node.js + Express + Firebase/Firestore
 */
class ShiftServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Initialize server
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Shift Backend Server...');
      
      // Initialize database
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
      process.exit(1);
    }
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    try {
      await databaseService.initialize();
      console.log('✅ Database initialized successfully');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Configure middleware
   */
  configureMiddleware() {
    console.log('⚙️  Configuring middleware...');

    // Trust proxy for accurate IP addresses
    this.app.set('trust proxy', 1);

    // Security middleware (disabled for development)
    if (this.environment !== 'development') {
      this.app.use(helmetConfig);
      this.app.use(securityHeaders);
    }
    
    // CORS
    this.app.use(cors(corsOptions));
    
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
        version: '1.0.0'
      });
    });

    // API routes
    this.app.use('/api/phone', phoneRoutes);
    this.app.use('/api/onboarding', onboardingRoutes);
    this.app.use('/api/seekers', seekerRoutes);
    this.app.use('/api/companies', companyRoutes);
    this.app.use('/api/jobs', jobRoutes);
    this.app.use('/api/journey', userJourneyRoutes);
    this.app.use('/api/callback', callbackRoutes);

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Shift Backend API v1.0.0',
        documentation: '/api/docs',
        endpoints: {
          phone: '/api/phone',
          onboarding: '/api/onboarding',
          seekers: '/api/seekers',
          companies: '/api/companies',
          jobs: '/api/jobs',
          journey: '/api/journey',
          callback: '/api/callback'
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