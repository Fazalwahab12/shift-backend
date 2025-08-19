const { body, param, query, validationResult } = require('express-validator');
const { AppError } = require('./errorHandler');

/**
 * Validation Middleware and Helpers
 */

/**
 * Common validation rules
 */
const commonValidations = {
  // User ID validation
  userId: () => body('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .isLength({ min: 1 })
    .withMessage('User ID cannot be empty'),

  // Phone number validation
  phoneNumber: () => body('phoneNumber')
    .isLength({ min: 8, max: 15 })
    .withMessage('Phone number must be between 8 and 15 digits')
    .isNumeric()
    .withMessage('Phone number must contain only numbers'),

  // Country code validation
  countryCode: () => body('countryCode')
    .optional()
    .matches(/^\+\d{1,4}$/)
    .withMessage('Country code must start with + followed by 1-4 digits'),

  // Email validation
  email: () => body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),

  // Name validation
  firstName: () => body('firstName')
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  lastName: () => body('lastName')
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters')
    .matches(/^[a-zA-Z\u0600-\u06FF\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  // User type validation
  userType: () => body('userType')
    .isIn(['seeker', 'company'])
    .withMessage('User type must be either seeker or company'),

  // Experience level validation
  experienceLevel: () => body('experienceLevel')
    .isIn(['entry', 'intermediate', 'senior'])
    .withMessage('Experience level must be entry, intermediate, or senior'),

  // Gender validation
  gender: () => body('gender')
    .isIn(['male', 'female', 'other'])
    .withMessage('Gender must be male, female, or other'),

  // Date validation
  dateOfBirth: () => body('dateOfBirth')
    .isISO8601()
    .withMessage('Please provide a valid date of birth')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      
      if (age < 16 || age > 100) {
        throw new Error('Age must be between 16 and 100 years');
      }
      return true;
    }),

  // Company validation
  companyName: () => body('companyName')
    .isLength({ min: 1, max: 100 })
    .withMessage('Company name must be between 1 and 100 characters'),

  commercialRegistrationNumber: () => body('commercialRegistrationNumber')
    .isLength({ min: 1, max: 20 })
    .withMessage('Commercial registration number must be between 1 and 20 characters')
    .isAlphanumeric()
    .withMessage('Commercial registration number must be alphanumeric'),

  companySize: () => body('companySize')
    .isIn(['startup', 'small', 'medium', 'large'])
    .withMessage('Company size must be startup, small, medium, or large'),

  // URL validation
  website: () => body('website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),

  profilePhoto: () => body('profilePhoto')
    .optional()
    .isURL()
    .withMessage('Profile photo must be a valid URL'),

  // Array validation
  industries: () => body('industries')
    .optional()
    .isArray()
    .withMessage('Industries must be an array')
    .custom((industries) => {
      if (industries.length > 5) {
        throw new Error('Maximum 5 industries allowed');
      }
      return true;
    }),

  roles: () => body('roles')
    .optional()
    .isArray()
    .withMessage('Roles must be an array')
    .custom((roles) => {
      if (roles.length > 10) {
        throw new Error('Maximum 10 roles allowed');
      }
      return true;
    }),

  // Pagination validation
  page: () => query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  limit: () => query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  // Rating validation
  rating: () => body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  // Step validation
  step: () => param('step')
    .isInt({ min: 1, max: 6 })
    .withMessage('Step must be between 1 and 6')
};

/**
 * Sanitization helpers
 */
const sanitizeInput = {
  // Remove HTML tags and trim whitespace
  cleanString: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/<[^>]*>/g, '').trim();
  },

  // Clean phone number (remove non-numeric characters except +)
  cleanPhoneNumber: (value) => {
    if (typeof value !== 'string') return value;
    return value.replace(/[^\d+]/g, '');
  },

  // Normalize Arabic text
  normalizeArabic: (value) => {
    if (typeof value !== 'string') return value;
    return value.normalize('NFKC');
  }
};

/**
 * Custom validation middleware
 */
const customValidations = {
  // Validate Oman phone number
  omanPhoneNumber: () => body('phoneNumber')
    .custom((value, { req }) => {
      const countryCode = req.body.countryCode || '+968';
      if (countryCode === '+968' && value) {
        // Oman phone numbers: 8 digits starting with specific prefixes
        const omanMobileRegex = /^(9[0-9]|7[0-9]|2[0-9])\d{6}$/;
        if (!omanMobileRegex.test(value)) {
          throw new Error('Invalid Oman phone number format');
        }
      }
      return true;
    }),

  // Validate unique email
  uniqueEmail: () => body('email')
    .custom(async (value, { req }) => {
      // This would typically check against database
      // For now, just basic validation
      if (value && value.includes('test@test.com')) {
        throw new Error('This email is not allowed');
      }
      return true;
    }),

  // Validate password strength (if implementing auth later)
  strongPassword: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),

  // Validate file upload
  fileUpload: (fileTypes = [], maxSize = 5 * 1024 * 1024) => body('file')
    .custom((value, { req }) => {
      if (!req.file) return true; // Optional file
      
      // Check file type
      if (fileTypes.length > 0 && !fileTypes.includes(req.file.mimetype)) {
        throw new Error(`File type must be one of: ${fileTypes.join(', ')}`);
      }
      
      // Check file size
      if (req.file.size > maxSize) {
        throw new Error(`File size must be less than ${maxSize / 1024 / 1024}MB`);
      }
      
      return true;
    })
};

/**
 * Validation result handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.param,
      message: error.msg,
      value: error.value
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * Sanitize request body
 */
const sanitizeRequest = (req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        // Clean string inputs
        req.body[key] = sanitizeInput.cleanString(req.body[key]);
        
        // Special handling for specific fields
        if (key === 'phoneNumber') {
          req.body[key] = sanitizeInput.cleanPhoneNumber(req.body[key]);
        }
        
        if (key.includes('Arabic') || key.includes('arabic')) {
          req.body[key] = sanitizeInput.normalizeArabic(req.body[key]);
        }
      }
    }
  }
  
  next();
};

/**
 * Validation rule sets for different endpoints
 */
const validationRules = {
  // Phone registration
  phoneRegistration: [
    commonValidations.phoneNumber(),
    commonValidations.countryCode(),
    commonValidations.userType(),
    customValidations.omanPhoneNumber()
  ],

  // Seeker profile creation
  seekerProfile: [
    commonValidations.userId(),
    commonValidations.firstName().optional(),
    commonValidations.lastName().optional(),
    commonValidations.email().optional(),
    commonValidations.dateOfBirth().optional(),
    commonValidations.gender().optional(),
    commonValidations.experienceLevel().optional()
  ],

  // Company profile creation
  companyProfile: [
    commonValidations.userId(),
    commonValidations.companyName().optional(),
    commonValidations.commercialRegistrationNumber().optional(),
    commonValidations.email().optional(),
    commonValidations.companySize().optional(),
    commonValidations.website().optional()
  ],

  // Search validation
  search: [
    commonValidations.page(),
    commonValidations.limit()
  ]
};

module.exports = {
  commonValidations,
  customValidations,
  validationRules,
  handleValidationErrors,
  sanitizeRequest,
  sanitizeInput
};