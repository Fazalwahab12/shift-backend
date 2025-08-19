/**
 * Global Error Handler Middleware
 * Handles all errors in the application and returns appropriate responses
 */

class AppError extends Error {
  constructor(message, statusCode, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle Firebase/Firestore errors
 */
const handleFirebaseError = (error) => {
  let message = 'Database operation failed';
  let statusCode = 500;

  // Handle specific Firebase error codes
  switch (error.code) {
    case 'permission-denied':
      message = 'Permission denied. Access to this resource is forbidden.';
      statusCode = 403;
      break;
    case 'not-found':
      message = 'The requested resource was not found.';
      statusCode = 404;
      break;
    case 'already-exists':
      message = 'The resource already exists.';
      statusCode = 409;
      break;
    case 'invalid-argument':
      message = 'Invalid data provided.';
      statusCode = 400;
      break;
    case 'unauthenticated':
      message = 'Authentication required.';
      statusCode = 401;
      break;
    case 'resource-exhausted':
      message = 'Resource quota exceeded. Please try again later.';
      statusCode = 429;
      break;
    case 'deadline-exceeded':
      message = 'Request timeout. Please try again.';
      statusCode = 408;
      break;
    case 'unavailable':
      message = 'Service temporarily unavailable. Please try again later.';
      statusCode = 503;
      break;
    default:
      if (error.message) {
        message = error.message;
      }
  }

  return new AppError(message, statusCode);
};

/**
 * Handle validation errors
 */
const handleValidationError = (error) => {
  const errors = Object.values(error.errors).map(err => err.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle duplicate field errors
 */
const handleDuplicateFieldsError = (error) => {
  const field = Object.keys(error.keyValue)[0];
  const message = `Duplicate field value: ${field}. Please use another value.`;
  return new AppError(message, 409);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => new AppError('Invalid token. Please log in again.', 401);

const handleJWTExpiredError = () => new AppError('Your token has expired. Please log in again.', 401);

/**
 * Send error response for development
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * Send error response for production
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      status: err.status,
      message: err.message
    });
  } else {
    // Programming or other unknown error: don't leak error details
    console.error('ERROR 💥', err);
    
    res.status(500).json({
      success: false,
      status: 'error',
      message: 'Something went wrong!'
    });
  }
};

/**
 * Global error handling middleware
 */
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Handle Firebase/Firestore errors
    if (err.code && err.code.includes('firebase')) {
      error = handleFirebaseError(error);
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      error = handleValidationError(error);
    }
    
    // Handle duplicate field errors
    if (err.code === 11000) {
      error = handleDuplicateFieldsError(error);
    }
    
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }
    
    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    sendErrorProd(error, res);
  }
};

/**
 * Catch async errors wrapper
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * Handle unhandled routes
 */
const handleNotFound = (req, res, next) => {
  const err = new AppError(`Can't find ${req.originalUrl} on this server!`, 404);
  next(err);
};

module.exports = {
  AppError,
  globalErrorHandler,
  catchAsync,
  handleNotFound
};