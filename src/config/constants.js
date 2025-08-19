/**
 * Application Constants
 * Centralized configuration constants for the Shift Backend API
 */

// Environment variables with defaults
const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT) || 3000,
  API_VERSION: process.env.API_VERSION || '1.0.0'
};

// Database collection names
const COLLECTIONS = {
  USERS: process.env.USERS_COLLECTION || 'users',
  SEEKERS: process.env.SEEKERS_COLLECTION || 'seekers',
  COMPANIES: process.env.COMPANIES_COLLECTION || 'companies',
  ONBOARDING_DATA: process.env.ONBOARDING_COLLECTION || 'onboarding_data',
  PHONE_REGISTRATIONS: process.env.PHONE_REGISTRATIONS_COLLECTION || 'phone_registrations',
  JOBS: process.env.JOBS_COLLECTION || 'jobs',
  APPLICATIONS: process.env.APPLICATIONS_COLLECTION || 'applications',
  NOTIFICATIONS: process.env.NOTIFICATIONS_COLLECTION || 'notifications',
  INDUSTRIES: process.env.INDUSTRIES_COLLECTION || 'industries',
  ROLES: process.env.ROLES_COLLECTION || 'roles'
};

// User types
const USER_TYPES = {
  SEEKER: 'seeker',
  COMPANY: 'company'
};

// Experience levels
const EXPERIENCE_LEVELS = {
  ENTRY: 'entry',
  INTERMEDIATE: 'intermediate',
  SENIOR: 'senior'
};

// Gender options
const GENDERS = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other'
};

// Company sizes
const COMPANY_SIZES = {
  STARTUP: 'startup',
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large'
};

// Subscription plans
const SUBSCRIPTION_PLANS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  ENTERPRISE: 'enterprise'
};

// Employment types
const EMPLOYMENT_TYPES = {
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  SHIFT: 'shift',
  FREELANCE: 'freelance',
  INTERNSHIP: 'internship'
};

// Oman governorates
const OMAN_GOVERNORATES = [
  'Muscat',
  'Dhofar', 
  'Al Batinah North',
  'Al Batinah South',
  'Musandam',
  'Al Buraimi',
  'Ad Dakhiliyah',
  'Ad Dhahirah',
  'Ash Sharqiyah North',
  'Ash Sharqiyah South',
  'Al Wusta'
];

// Popular Oman wilayats by governorate
const OMAN_WILAYATS = {
  'Muscat': ['Muscat', 'Bausher', 'Seeb', 'Al Amerat', 'Quriyat', 'Mutrah'],
  'Dhofar': ['Salalah', 'Taqah', 'Mirbat', 'Sadah', 'Rakhyut', 'Dhalkut', 'Muqshin', 'Shaleem and Hallaniyat Islands', 'Al Mazyunah', 'Thumrait'],
  'Al Batinah North': ['Sohar', 'Shinas', 'Liwa', 'Saham', 'Al Khaburah', 'As Suwaiq'],
  'Al Batinah South': ['Rustaq', 'Nakhal', 'Wadi Al Maawil', 'Awabi', 'Al Musanaah', 'Barka'],
  'Musandam': ['Khasab', 'Bukha', 'Daba', 'Madha'],
  'Al Buraimi': ['Al Buraimi', 'Mahdhah', 'As Sunaynah'],
  'Ad Dakhiliyah': ['Nizwa', 'Samail', 'Bahla', 'Adam', 'Al Hamra', 'Manah', 'Izki', 'Bid Bid'],
  'Ad Dhahirah': ['Ibri', 'Yanqul', 'Dhank'],
  'Ash Sharqiyah North': ['Ibra', 'Al Mudaybi', 'Bidiyah', 'Dima Wa Tayyin', 'Al Qabil', 'Wadi Bani Khalid'],
  'Ash Sharqiyah South': ['Sur', 'Al Kamil Wa Al Wafi', 'Jaalan Bani Bu Hassan', 'Jaalan Bani Bu Ali', 'Masirah'],
  'Al Wusta': ['Haima', 'Mahawt', 'Ad Duqum', 'Al Jazer']
};

// Country codes
const COUNTRY_CODES = {
  OMAN: '+968',
  UAE: '+971',
  SAUDI: '+966',
  KUWAIT: '+965',
  QATAR: '+974',
  BAHRAIN: '+973'
};

// File upload constants
const FILE_UPLOAD = {
  MAX_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB
  ALLOWED_IMAGE_TYPES: (process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/webp').split(','),
  ALLOWED_DOCUMENT_TYPES: (process.env.ALLOWED_DOCUMENT_TYPES || 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
  STORAGE_PATHS: {
    SEEKER_PHOTOS: 'profiles/seekers/',
    COMPANY_LOGOS: 'profiles/companies/logos/',
    COMPANY_COVERS: 'profiles/companies/covers/',
    CVS: 'documents/cvs/',
    DOCUMENTS: 'documents/',
    TEMP: 'temp/'
  }
};

// Rate limiting constants
const RATE_LIMITS = {
  GENERAL: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
  },
  PHONE_REGISTER: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: parseInt(process.env.PHONE_REGISTER_LIMIT_PER_HOUR) || 5
  },
  PROFILE_CREATION: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: parseInt(process.env.PROFILE_CREATION_LIMIT_PER_HOUR) || 3
  },
  SEARCH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: parseInt(process.env.SEARCH_LIMIT_PER_15MIN) || 50
  }
};

// Validation constants
const VALIDATION = {
  PHONE_NUMBER: {
    MIN_LENGTH: 8,
    MAX_LENGTH: 15
  },
  NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 50
  },
  COMPANY_NAME: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 100
  },
  COMMERCIAL_REGISTRATION: {
    MIN_LENGTH: 1,
    MAX_LENGTH: 20
  },
  DESCRIPTION: {
    MAX_LENGTH: 1000
  },
  MAX_INDUSTRIES: 5,
  MAX_ROLES: 10,
  MIN_AGE: 16,
  MAX_AGE: 100,
  MIN_RATING: 1,
  MAX_RATING: 5
};

// Search and pagination constants
const PAGINATION = {
  DEFAULT_LIMIT: parseInt(process.env.DEFAULT_SEARCH_LIMIT) || 20,
  MAX_LIMIT: parseInt(process.env.MAX_SEARCH_RESULTS) || 100,
  MIN_LIMIT: 1
};

// Profile completion requirements
const PROFILE_COMPLETION = {
  SEEKER_MIN_PERCENTAGE: parseInt(process.env.MIN_SEEKER_PROFILE_COMPLETION) || 75,
  COMPANY_MIN_PERCENTAGE: parseInt(process.env.MIN_COMPANY_PROFILE_COMPLETION) || 80
};

// Onboarding step names
const ONBOARDING_STEPS = {
  INDUSTRY_SELECTION: 'industry_selection',
  ROLE_SELECTION: 'role_selection',
  EXPERIENCE_LEVEL: 'experience_level',
  HIRING_NEEDS: 'hiring_needs',
  REFERRAL_SOURCE: 'referral_source'
};

// Profile step numbers
const PROFILE_STEPS = {
  SEEKER: {
    PERSONAL_INFO: 1,
    LOCATION_INFO: 2,
    PROFESSIONAL_INFO: 3,
    EDUCATION: 4,
    WORK_PREFERENCES: 5
  },
  COMPANY: {
    BASIC_INFO: 1,
    INDUSTRY_BUSINESS: 2,
    CONTACT_INFO: 3,
    LOCATION_ADDRESS: 4,
    BRANDING_MEDIA: 5,
    HR_HIRING: 6
  }
};

// Verification status
const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

// Notification types
const NOTIFICATION_TYPES = {
  WELCOME: 'welcome',
  PROFILE_INCOMPLETE: 'profile_incomplete',
  NEW_JOB_MATCH: 'new_job_match',
  APPLICATION_STATUS: 'application_status',
  MESSAGE_RECEIVED: 'message_received',
  PROFILE_VERIFIED: 'profile_verified'
};

// Application status
const APPLICATION_STATUS = {
  APPLIED: 'applied',
  VIEWED: 'viewed',
  SHORTLISTED: 'shortlisted',
  INTERVIEWED: 'interviewed',
  HIRED: 'hired',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn'
};

// Job status
const JOB_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  CLOSED: 'closed',
  EXPIRED: 'expired'
};

// Languages
const LANGUAGES = {
  EN: 'en',
  AR: 'ar'
};

// Currency
const CURRENCY = {
  OMR: 'OMR',
  USD: 'USD',
  AED: 'AED',
  SAR: 'SAR'
};

// Timezone
const TIMEZONE = process.env.DEFAULT_TIMEZONE || 'Asia/Muscat';

// Feature flags
const FEATURES = {
  PHONE_VERIFICATION: process.env.ENABLE_PHONE_VERIFICATION === 'true',
  EMAIL_VERIFICATION: process.env.ENABLE_EMAIL_VERIFICATION === 'true',
  COMPANY_VERIFICATION: process.env.ENABLE_COMPANY_VERIFICATION === 'true',
  FILE_UPLOADS: process.env.ENABLE_FILE_UPLOADS === 'true',
  SEARCH_ANALYTICS: process.env.ENABLE_SEARCH_ANALYTICS === 'true',
  AI_MATCHING: process.env.ENABLE_AI_MATCHING === 'true',
  VIDEO_INTERVIEWS: process.env.ENABLE_VIDEO_INTERVIEWS === 'true',
  SKILLS_ASSESSMENT: process.env.ENABLE_SKILLS_ASSESSMENT === 'true'
};

// Error codes
const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CONFLICT: 'CONFLICT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  FIREBASE_ERROR: 'FIREBASE_ERROR'
};

// Success messages
const SUCCESS_MESSAGES = {
  PHONE_REGISTERED: 'Phone number registered successfully',
  PHONE_VERIFIED: 'Phone verification status updated',
  ONBOARDING_CREATED: 'Onboarding data created successfully',
  ONBOARDING_UPDATED: 'Onboarding data updated successfully',
  PROFILE_CREATED: 'Profile created successfully',
  PROFILE_UPDATED: 'Profile updated successfully',
  PROFILE_STEP_UPDATED: 'Profile step updated successfully',
  PHOTO_UPLOADED: 'Photo uploaded successfully',
  FILE_UPLOADED: 'File uploaded successfully',
  SEARCH_COMPLETED: 'Search completed successfully'
};

// Error messages
const ERROR_MESSAGES = {
  PHONE_EXISTS: 'Phone number already registered',
  USER_NOT_FOUND: 'User not found',
  PROFILE_NOT_FOUND: 'Profile not found',
  PROFILE_EXISTS: 'Profile already exists',
  INVALID_USER_TYPE: 'Invalid user type',
  INVALID_PHONE: 'Invalid phone number format',
  INVALID_EMAIL: 'Invalid email format',
  COMMERCIAL_REGISTRATION_EXISTS: 'Commercial registration number already exists',
  VALIDATION_FAILED: 'Validation failed',
  UNAUTHORIZED_ACCESS: 'Unauthorized access',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
  INTERNAL_ERROR: 'Internal server error'
};

module.exports = {
  ENV,
  COLLECTIONS,
  USER_TYPES,
  EXPERIENCE_LEVELS,
  GENDERS,
  COMPANY_SIZES,
  SUBSCRIPTION_PLANS,
  EMPLOYMENT_TYPES,
  OMAN_GOVERNORATES,
  OMAN_WILAYATS,
  COUNTRY_CODES,
  FILE_UPLOAD,
  RATE_LIMITS,
  VALIDATION,
  PAGINATION,
  PROFILE_COMPLETION,
  ONBOARDING_STEPS,
  PROFILE_STEPS,
  VERIFICATION_STATUS,
  NOTIFICATION_TYPES,
  APPLICATION_STATUS,
  JOB_STATUS,
  LANGUAGES,
  CURRENCY,
  TIMEZONE,
  FEATURES,
  ERROR_CODES,
  SUCCESS_MESSAGES,
  ERROR_MESSAGES
};