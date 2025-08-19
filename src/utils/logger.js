/**
 * Logger Utility
 * Centralized logging system for the Shift Backend API
 */

const fs = require('fs');
const path = require('path');

class Logger {
  constructor() {
    this.logLevel = process.env.LOG_LEVEL || 'info';
    this.enableRequestLogging = process.env.ENABLE_REQUEST_LOGGING === 'true';
    this.logFilePath = process.env.LOG_FILE_PATH;
    
    // Create logs directory if logging to file
    if (this.logFilePath) {
      const logDir = path.dirname(this.logFilePath);
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }
  }

  /**
   * Log levels in order of priority
   */
  levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
  };

  /**
   * Get current timestamp
   */
  getTimestamp() {
    return new Date().toISOString();
  }

  /**
   * Format log message
   */
  formatMessage(level, message, meta = {}) {
    const timestamp = this.getTimestamp();
    const logMessage = {
      timestamp,
      level,
      message,
      ...meta
    };

    return JSON.stringify(logMessage);
  }

  /**
   * Write log to console and/or file
   */
  writeLog(level, message, meta = {}) {
    // Check if log level should be output
    if (this.levels[level] > this.levels[this.logLevel]) {
      return;
    }

    const formattedMessage = this.formatMessage(level, message, meta);

    // Console output with colors
    const colors = {
      error: '\x1b[31m', // Red
      warn: '\x1b[33m',  // Yellow
      info: '\x1b[36m',  // Cyan
      debug: '\x1b[37m'  // White
    };
    
    const reset = '\x1b[0m';
    const color = colors[level] || reset;
    
    console.log(`${color}${formattedMessage}${reset}`);

    // File output
    if (this.logFilePath) {
      fs.appendFileSync(this.logFilePath, formattedMessage + '\n');
    }
  }

  /**
   * Error logging
   */
  error(message, meta = {}) {
    this.writeLog('error', message, {
      ...meta,
      stack: meta.stack || (new Error()).stack
    });
  }

  /**
   * Warning logging
   */
  warn(message, meta = {}) {
    this.writeLog('warn', message, meta);
  }

  /**
   * Info logging
   */
  info(message, meta = {}) {
    this.writeLog('info', message, meta);
  }

  /**
   * Debug logging
   */
  debug(message, meta = {}) {
    this.writeLog('debug', message, meta);
  }

  /**
   * HTTP request logging
   */
  request(req, res, duration) {
    if (!this.enableRequestLogging) return;

    const meta = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length') || 0
    };

    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`;
    
    if (res.statusCode >= 500) {
      this.error(message, meta);
    } else if (res.statusCode >= 400) {
      this.warn(message, meta);
    } else {
      this.info(message, meta);
    }
  }

  /**
   * Database operation logging
   */
  database(operation, collection, duration, meta = {}) {
    this.debug(`Database ${operation} on ${collection}`, {
      operation,
      collection,
      duration: `${duration}ms`,
      ...meta
    });
  }

  /**
   * Security event logging
   */
  security(event, details = {}) {
    this.warn(`Security Event: ${event}`, {
      event,
      ...details,
      timestamp: this.getTimestamp()
    });
  }

  /**
   * Performance logging
   */
  performance(operation, duration, meta = {}) {
    if (duration > 1000) { // Log slow operations (>1s)
      this.warn(`Slow operation: ${operation}`, {
        operation,
        duration: `${duration}ms`,
        ...meta
      });
    } else {
      this.debug(`Performance: ${operation}`, {
        operation,
        duration: `${duration}ms`,
        ...meta
      });
    }
  }

  /**
   * Authentication logging
   */
  auth(event, userId, details = {}) {
    this.info(`Auth Event: ${event}`, {
      event,
      userId,
      ...details
    });
  }

  /**
   * Validation error logging
   */
  validation(errors, req) {
    this.warn('Validation failed', {
      errors,
      url: req.originalUrl,
      method: req.method,
      ip: req.ip,
      body: this.sanitizeBody(req.body)
    });
  }

  /**
   * Rate limit logging
   */
  rateLimit(ip, endpoint) {
    this.security('Rate limit exceeded', {
      ip,
      endpoint,
      action: 'blocked'
    });
  }

  /**
   * Sanitize request body for logging (remove sensitive data)
   */
  sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;

    const sanitized = { ...body };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'authorization'];
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });

    return sanitized;
  }

  /**
   * Log application startup
   */
  startup(config) {
    this.info('🚀 Shift Backend API Starting', {
      environment: config.NODE_ENV,
      port: config.PORT,
      version: config.API_VERSION,
      features: config.FEATURES
    });
  }

  /**
   * Log application shutdown
   */
  shutdown(reason) {
    this.info('🛑 Shift Backend API Shutting Down', {
      reason,
      timestamp: this.getTimestamp()
    });
  }

  /**
   * Log Firebase operations
   */
  firebase(operation, collection, docId, meta = {}) {
    this.debug(`Firebase ${operation}`, {
      operation,
      collection,
      docId,
      ...meta
    });
  }

  /**
   * Log file operations
   */
  file(operation, filePath, size = null, meta = {}) {
    this.debug(`File ${operation}`, {
      operation,
      filePath,
      size: size ? `${size} bytes` : null,
      ...meta
    });
  }

  /**
   * Log search operations
   */
  search(type, criteria, resultCount, duration, meta = {}) {
    this.info(`Search: ${type}`, {
      type,
      criteria,
      resultCount,
      duration: `${duration}ms`,
      ...meta
    });
  }

  /**
   * Log business events
   */
  business(event, data = {}) {
    this.info(`Business Event: ${event}`, {
      event,
      ...data
    });
  }
}

// Create singleton instance
const logger = new Logger();

module.exports = logger;