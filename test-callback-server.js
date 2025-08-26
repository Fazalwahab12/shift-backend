const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// Import callback routes
const callbackRoutes = require('./src/routes/callback');

/**
 * Simple Test Server for Callback Routes
 */
class TestCallbackServer {
  constructor() {
    this.app = express();
    this.port = 3000;
  }

  /**
   * Initialize server
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Test Callback Server...');
      
      // Configure middleware
      this.configureMiddleware();
      
      // Configure routes
      this.configureRoutes();
      
      // Start server
      this.startServer();
      
    } catch (error) {
      console.error('❌ Failed to initialize server:', error);
      process.exit(1);
    }
  }

  /**
   * Configure middleware
   */
  configureMiddleware() {
    console.log('⚙️  Configuring middleware...');

    // CORS
    this.app.use(cors());
    
    // Request logging
    this.app.use(morgan('dev'));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
        message: 'Test Callback Server is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // Callback routes
    this.app.use('/api/callback', callbackRoutes);

    // API documentation endpoint
    this.app.get('/api', (req, res) => {
      res.status(200).json({
        success: true,
        message: 'Test Callback Server v1.0.0',
        endpoints: {
          health: '/health',
          callback: '/api/callback'
        },
        timestamp: new Date().toISOString()
      });
    });

    console.log('✅ Routes configured successfully');
  }

  /**
   * Start the server
   */
  startServer() {
    const server = this.app.listen(this.port, '0.0.0.0', () => {
      console.log('🎉 Test Callback Server started successfully!');
      console.log(`🌐 Server running on port ${this.port}`);
      console.log(`🔗 Health check: http://localhost:${this.port}/health`);
      console.log(`📚 API docs: http://localhost:${this.port}/api`);
      console.log(`📞 Callback endpoint: http://localhost:${this.port}/api/callback/omantel`);
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
 * Initialize and start the server
 */
if (require.main === module) {
  const server = new TestCallbackServer();
  server.initialize();
}

module.exports = TestCallbackServer;
