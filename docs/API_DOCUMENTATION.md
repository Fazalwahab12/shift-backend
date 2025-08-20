# Shift Backend API Documentation

## Overview

The Shift Backend API is a Node.js + Express + Firebase REST API designed for the Shift job marketplace app in Oman. It provides a complete user journey from phone registration through OTP verification, onboarding preferences, to full profile creation for both job seekers and companies.

## User Journey Flow

The API follows this complete user flow:

1. **Phone Registration** → Store phone number (+968 Oman-based) with user type selection
2. **OTP Verification** → Verify phone number using Oman-based OTP provider integration
3. **Key Preferences Setup** → Select industries, roles, shift preferences, and preferred social media
4. **Profile Creation** → Complete detailed profile based on user type
5. **Recommendations** → Use stored preferences for future job matching

Each step builds upon the previous, creating a comprehensive user profile with industry/role preferences for recommendation engine.

## Base URL

```
Development: http://localhost:3000
Production: https://api.shift-oman.com
```

## API Version

Current version: **v1.0.0**

## Authentication

Currently, the API operates without authentication as requested. All endpoints are publicly accessible.

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **General API**: 100 requests per 15 minutes per IP
- **Phone Registration**: 5 requests per hour per IP
- **Profile Creation**: 3 requests per hour per IP
- **Search**: 50 requests per 15 minutes per IP

## Response Format

All API responses follow this standard format:

```json
{
  "success": boolean,
  "message": string,
  "data": object | array,
  "errors": array (only on validation errors)
}
```

## Error Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (Validation Error)
- `404` - Not Found
- `409` - Conflict (Duplicate Data)
- `429` - Too Many Requests
- `500` - Internal Server Error

---

## Complete User Journey APIs

### Step 1: Phone Registration

Register a new phone number in the system with user type selection.

```http
POST /api/phone/register
```

**Purpose**: Initial user registration with Oman-based phone number validation.

**Request Body:**
```json
{
  "phoneNumber": "92345678",
  "countryCode": "+968",
  "userType": "seeker"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number registered successfully",
  "data": {
    "userId": "user_abc123",
    "phoneNumber": "92345678",
    "countryCode": "+968",
    "userType": "seeker",
    "isPhoneVerified": false,
    "onboardingCompleted": false,
    "profileCompleted": false,
    "createdAt": "2024-01-15T10:30:00Z"
  }
}
```

**Notes**: 
- Phone number stored for future OTP verification
- User type determines onboarding flow
- Creates base user record for profile building

### Step 2: OTP Verification (Ready for Integration)

Verify phone number using OTP. Integration with Oman-based OTP provider ready.

```http
PUT /api/phone/verify
```

**Purpose**: Verify phone number using OTP (SMS/WhatsApp). Oman-based provider integration ready.

**Request Body:**
```json
{
  "userId": "user_abc123",
  "verified": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone verification status updated",
  "data": {
    "userId": "user_abc123",
    "isPhoneVerified": true,
    "lastLoginAt": "2024-01-15T10:35:00Z"
  }
}
```

**Notes**: 
- OTP provider integration ready for implementation
- Supports both SMS and WhatsApp verification
- Updates user verification status

### Check Phone Number Status

Check if a phone number exists and get user status.

```http
GET /api/phone/check/{phoneNumber}?countryCode=+968
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number found",
  "data": {
    "exists": true,
    "userId": "user_abc123",
    "userType": "seeker",
    "isPhoneVerified": true,
    "onboardingCompleted": false,
    "profileCompleted": false,
    "isActive": true
  }
}
```

### Get User by Phone

Retrieve user information by phone number.

```http
GET /api/phone/user/{phoneNumber}?countryCode=+968
```

### Update User Type

Update the user type (seeker/company).

```http
PUT /api/phone/user-type
```

**Request Body:**
```json
{
  "userId": "user123",
  "userType": "company"
}
```

### Phone Registration Statistics

Get phone registration statistics.

```http
GET /api/phone/stats?userType=seeker
```

---

## Step 3: Key Preferences Setup (Industries, Roles, Shift Preferences, Social Media)

### Complete Key Preferences Setup

Create comprehensive user preferences including industries, roles, shift preferences, and social media for future job recommendations.

```http
POST /api/onboarding
```

**Purpose**: Collect comprehensive user preferences including industries, roles, shift preferences, social media preferences, and referral data for intelligent job matching and recommendation engine.

**Request Body (Seeker):**
```json
{
  "userId": "user_abc123",
  "userType": "seeker",
  "selectedIndustries": ["hospitality", "retail", "healthcare"],
  "selectedRoles": ["waiter", "cashier", "receptionist"],
  "experienceLevel": "intermediate",
  "shiftPreferences": ["morning", "afternoon"],
  "preferredSocialMedia": ["instagram", "whatsapp"],
  "referralSource": "social_media",
  "referralDetails": "Instagram ad campaign #2024"
}
```

**Request Body (Company):**
```json
{
  "userId": "user_xyz456",
  "userType": "company",
  "selectedIndustries": ["hospitality", "retail"],
  "hiringNeeds": "regular_staff",
  "typicalHiringRoles": ["waiter", "cashier", "manager"],
  "referralSource": "business_network",
  "referralDetails": "Recommended by Al-Rashid Trading"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Onboarding data created successfully",
  "data": {
    "id": "onboarding_123",
    "userId": "user_abc123",
    "userType": "seeker",
    "selectedIndustries": ["hospitality", "retail", "healthcare"],
    "selectedRoles": ["waiter", "cashier", "receptionist"],
    "experienceLevel": "intermediate",
    "shiftPreferences": ["morning", "afternoon"],
    "preferredSocialMedia": ["instagram", "whatsapp"],
    "referralSource": "social_media",
    "referralDetails": "Instagram ad campaign #2024",
    "isCompleted": true,
    "completedSteps": ["industry_selection", "role_selection", "experience_level", "referral_source"],
    "completionPercentage": 100,
    "createdAt": "2024-01-15T10:40:00Z"
  }
}
```

**Notes**: 
- Industry/role preferences used for intelligent job matching
- Shift preferences enable better work-life balance matching
- Social media preferences enable personalized communication channels
- Referral tracking for analytics and user acquisition insights
- Completion triggers profile creation flow
- All preference data stored for advanced recommendation engine

### Get Onboarding Data

Retrieve onboarding data for a user.

```http
GET /api/onboarding/{userId}
```

### Add Industry Preference

Add an industry to user preferences.

```http
POST /api/onboarding/{userId}/industry
```

**Request Body:**
```json
{
  "industry": "hospitality"
}
```

### Remove Industry Preference

Remove an industry from user preferences.

```http
DELETE /api/onboarding/{userId}/industry/{industry}
```

### Add Role Preference

Add a role to user preferences.

```http
POST /api/onboarding/{userId}/role
```

**Request Body:**
```json
{
  "role": "waiter"
}
```

### Remove Role Preference

Remove a role from user preferences.

```http
DELETE /api/onboarding/{userId}/role/{role}
```

### Complete Onboarding Step

Mark an onboarding step as completed.

```http
POST /api/onboarding/{userId}/complete-step
```

**Request Body:**
```json
{
  "stepName": "industry_selection"
}
```

**Valid step names:**
- `industry_selection`
- `role_selection`
- `experience_level` (seekers only)
- `hiring_needs` (companies only)
- `referral_source`

### Update Experience Level

Update experience level for seekers.

```http
PUT /api/onboarding/{userId}/experience-level
```

**Request Body:**
```json
{
  "experienceLevel": "senior"
}
```

### Update Referral Source

Update how the user heard about the platform.

```http
PUT /api/onboarding/{userId}/referral
```

**Request Body:**
```json
{
  "referralSource": "friend_referral",
  "referralDetails": "Recommended by Ahmad"
}
```

### Add Shift Preference

Add a shift preference to user preferences.

```http
POST /api/onboarding/{userId}/shift-preference
```

**Request Body:**
```json
{
  "shiftPreference": "morning"
}
```

**Valid shift preferences:**
- `morning` - Morning shift (6AM-2PM)
- `afternoon` - Afternoon shift (2PM-10PM)
- `evening` - Evening shift (6PM-2AM)
- `night` - Night shift (10PM-6AM)
- `flexible` - Flexible with any shift

### Remove Shift Preference

Remove a shift preference from user preferences.

```http
DELETE /api/onboarding/{userId}/shift-preference/{shiftPreference}
```

### Add Social Media Preference

Add a preferred social media platform for communication.

```http
POST /api/onboarding/{userId}/social-media
```

**Request Body:**
```json
{
  "socialMedia": "instagram"
}
```

**Valid social media platforms:**
- `instagram` - Instagram
- `facebook` - Facebook
- `twitter` - Twitter/X
- `linkedin` - LinkedIn
- `tiktok` - TikTok
- `snapchat` - Snapchat
- `whatsapp` - WhatsApp
- `telegram` - Telegram

### Remove Social Media Preference

Remove a social media preference from user preferences.

```http
DELETE /api/onboarding/{userId}/social-media/{socialMedia}
```

### Onboarding Statistics

Get onboarding completion statistics.

```http
GET /api/onboarding/stats?userType=seeker
```

### Popular Industries

Get most popular industries selected during onboarding.

```http
GET /api/onboarding/popular-industries?userType=seeker&limit=10
```

### Popular Roles

Get most popular roles selected during onboarding.

```http
GET /api/onboarding/popular-roles?userType=company&limit=5
```

---

## Step 4A: Seeker Profile Creation (5-Step Process)

### Create Complete Seeker Profile

Create detailed job seeker profile using onboarding preferences.

```http
POST /api/seekers
```

**Purpose**: Build complete seeker profile using data from phone registration and onboarding.

**Profile Relationship Flow**:
1. Phone Registration (`user_abc123`) → 
2. Onboarding Data (`selectedIndustries`, `selectedRoles`, `experienceLevel`) → 
3. **Seeker Profile** (inherits and expands onboarding data)

**Request Body:**
```json
{
  "userId": "user_abc123",
  "firstName": "Ahmed",
  "lastName": "Al-Rashid",
  "email": "ahmed.alrashid@gmail.com",
  "dateOfBirth": "1995-03-15",
  "gender": "male",
  "nationality": "Omani",
  "governorate": "Muscat",
  "wilayat": "Bausher",
  "address": {
    "street": "Al-Khuwair Street",
    "building": "Building 123",
    "area": "Al-Khuwair"
  },
  "experienceLevel": "intermediate",
  "industries": ["hospitality", "retail", "healthcare"],
  "roles": ["waiter", "cashier", "receptionist"],
  "skills": ["Customer Service", "Arabic/English", "Point of Sale"],
  "expectedSalary": {
    "min": 300,
    "max": 500,
    "currency": "OMR"
  },
  "availabilityShifts": {
    "morning": true,
    "afternoon": true,
    "night": false
  },
  "availableDays": {
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": true,
    "saturday": false,
    "sunday": false
  },
  "transportationAvailable": true,
  "immediateAvailability": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Seeker profile created successfully",
  "data": {
    "id": "seeker_abc123",
    "userId": "user_abc123",
    "firstName": "Ahmed",
    "lastName": "Al-Rashid",
    "email": "ahmed.alrashid@gmail.com",
    "governorate": "Muscat",
    "experienceLevel": "intermediate",
    "industries": ["hospitality", "retail", "healthcare"],
    "roles": ["waiter", "cashier", "receptionist"],
    "profileCompletionStep": 1,
    "isProfileComplete": false,
    "completionPercentage": 45,
    "isVerified": false,
    "createdAt": "2024-01-15T10:45:00Z"
  }
}
```

**Notes**: 
- Inherits industries/roles from onboarding
- Creates foundation for recommendation matching
- Links to user phone registration
- 5-step completion process begins

### Get Seeker Profile by User ID

Retrieve seeker profile using user ID.

```http
GET /api/seekers/user/{userId}
```

### Get Seeker Profile by ID

Retrieve seeker profile using seeker ID.

```http
GET /api/seekers/{seekerId}
```

### Update Seeker Profile

Update seeker profile information.

```http
PUT /api/seekers/{seekerId}
```

**Request Body:**
```json
{
  "firstName": "Ahmed",
  "lastName": "Al-Rashid",
  "email": "ahmed.new@example.com",
  "skills": ["Customer Service", "Arabic/English"],
  "expectedSalary": {
    "min": 300,
    "max": 500,
    "currency": "OMR"
  }
}
```

### Complete Seeker Profile Steps (1-5)

Update specific steps to complete seeker profile.

```http
PUT /api/seekers/{seekerId}/step/{step}
```

**5-Step Completion Process:**

**Step 1: Personal Information**
```json
{
  "firstName": "Ahmed",
  "lastName": "Al-Rashid",
  "email": "ahmed.alrashid@gmail.com",
  "dateOfBirth": "1995-03-15",
  "gender": "male",
  "nationality": "Omani",
  "profilePhoto": "https://storage.firebase.com/profiles/seeker_abc123.jpg"
}
```

**Step 2: Location Information**
```json
{
  "address": {
    "street": "Al-Khuwair Street",
    "building": "Building 123",
    "area": "Al-Khuwair"
  },
  "wilayat": "Bausher",
  "governorate": "Muscat",
  "preferredWorkLocation": ["Muscat", "Bausher"],
  "transportationAvailable": true
}
```

**Step 3: Professional Information (Uses Onboarding Data)**
```json
{
  "experienceLevel": "intermediate",
  "industries": ["hospitality", "retail", "healthcare"],
  "roles": ["waiter", "cashier", "receptionist"],
  "skills": ["Customer Service", "Arabic/English", "Point of Sale"],
  "languages": [
    {"language": "Arabic", "proficiency": "native"},
    {"language": "English", "proficiency": "intermediate"}
  ]
}
```

**Step 4: Education**
```json
{
  "education": [
    {
      "level": "secondary",
      "institution": "Muscat Secondary School",
      "year": "2013",
      "field": "General Studies"
    }
  ],
  "certifications": [
    {
      "name": "Customer Service Certificate",
      "issuer": "Oman Tourism College",
      "year": "2020"
    }
  ]
}
```

**Step 5: Work Preferences**
```json
{
  "employmentType": ["full-time", "part-time", "shift"],
  "availabilityShifts": {
    "morning": true,
    "afternoon": true,
    "night": false
  },
  "availableDays": {
    "monday": true,
    "tuesday": true,
    "wednesday": true,
    "thursday": true,
    "friday": true,
    "saturday": false,
    "sunday": false
  },
  "expectedSalary": {
    "min": 300,
    "max": 500,
    "currency": "OMR"
  },
  "immediateAvailability": true,
  "availableStartDate": "2024-02-01"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile step 2 updated successfully",
  "data": {
    "profileCompletionStep": 2,
    "isProfileComplete": false,
    "completionPercentage": 65
  }
}
```

### Search Seekers

Search for job seekers based on criteria.

```http
GET /api/seekers/search?industries=hospitality,retail&experienceLevel=intermediate&governorate=Muscat&limit=20
```

**Query Parameters:**
- `industries` - Comma-separated list
- `roles` - Comma-separated list
- `experienceLevel` - entry, intermediate, senior
- `governorate` - Governorate name
- `limit` - Number of results (1-100)
- `page` - Page number

### Get Seekers by Location

Get job seekers in a specific governorate.

```http
GET /api/seekers/location/{governorate}?limit=20
```

### Get Profile Completion Status

Check profile completion percentage and missing fields.

```http
GET /api/seekers/{seekerId}/completion
```

**Response:**
```json
{
  "success": true,
  "message": "Profile completion status retrieved successfully",
  "data": {
    "seekerId": "seeker123",
    "profileCompletionStep": 3,
    "isProfileComplete": false,
    "completionPercentage": 75,
    "missingFields": ["education", "availabilityShifts"]
  }
}
```

### Upload Profile Photo

Upload or update profile photo.

```http
POST /api/seekers/{seekerId}/photo
```

**Request Body:**
```json
{
  "profilePhoto": "https://storage.example.com/photos/seeker123.jpg"
}
```

### Upload CV

Upload or update CV file.

```http
POST /api/seekers/{seekerId}/cv
```

**Request Body:**
```json
{
  "cvFile": "https://storage.example.com/cvs/seeker123.pdf"
}
```

### Delete Seeker Profile

Deactivate a seeker profile.

```http
DELETE /api/seekers/{seekerId}
```

---

## Step 4B: Company Profile Creation (6-Step Process)

### Create Complete Company Profile

Create detailed company profile using onboarding preferences.

```http
POST /api/companies
```

**Purpose**: Build complete company profile using data from phone registration and onboarding.

**Profile Relationship Flow**:
1. Phone Registration (`user_xyz456`) → 
2. Onboarding Data (`selectedIndustries`, `hiringNeeds`, `typicalHiringRoles`) → 
3. **Company Profile** (inherits and expands onboarding data)

**Request Body:**
```json
{
  "userId": "user_xyz456",
  "companyName": "Al-Rashid Trading LLC",
  "companyNameArabic": "شركة الراشد التجارية ذ.م.م",
  "legalEntityName": "Al-Rashid Trading Limited Liability Company",
  "commercialRegistrationNumber": "CR1234567",
  "taxRegistrationNumber": "TAX7654321",
  "primaryIndustry": "retail",
  "secondaryIndustries": ["hospitality", "wholesale"],
  "companyEmail": "info@alrashid.om",
  "companyPhone": "24123456",
  "website": "https://www.alrashid.om",
  "companySize": "medium",
  "establishedYear": 2010,
  "businessDescription": "Leading retail company in Oman specializing in consumer goods and hospitality services",
  "headquarters": {
    "street": "Sultan Qaboos Street",
    "building": "Al-Rashid Tower",
    "area": "Ruwi",
    "wilayat": "Muscat",
    "governorate": "Muscat",
    "postalCode": "112"
  },
  "operatingGovernorate": ["Muscat", "Dhofar", "Al Batinah North"],
  "typicalHiringRoles": ["waiter", "cashier", "sales_associate", "manager"],
  "hiringFrequency": "monthly",
  "averageJobsPerMonth": 8
}
```

**Response:**
```json
{
  "success": true,
  "message": "Company profile created successfully",
  "data": {
    "id": "company_xyz456",
    "userId": "user_xyz456",
    "companyName": "Al-Rashid Trading LLC",
    "companyNameArabic": "شركة الراشد التجارية ذ.م.م",
    "commercialRegistrationNumber": "CR1234567",
    "primaryIndustry": "retail",
    "secondaryIndustries": ["hospitality", "wholesale"],
    "companySize": "medium",
    "operatingGovernorate": ["Muscat", "Dhofar", "Al Batinah North"],
    "profileCompletionStep": 1,
    "isProfileComplete": false,
    "completionPercentage": 35,
    "isVerified": false,
    "totalJobsPosted": 0,
    "averageRating": 0,
    "createdAt": "2024-01-15T10:45:00Z"
  }
}
```

**Notes**: 
- Inherits industries/hiring roles from onboarding
- Creates foundation for job posting and seeker matching
- Links to user phone registration
- 6-step completion process begins

### Get Company Profile by User ID

Retrieve company profile using user ID.

```http
GET /api/companies/user/{userId}
```

### Get Company Profile by ID

Retrieve company profile using company ID.

```http
GET /api/companies/{companyId}
```

### Update Company Profile

Update company profile information.

```http
PUT /api/companies/{companyId}
```

**Request Body:**
```json
{
  "companyName": "Al-Rashid Trading LLC",
  "website": "https://www.alrashid.om",
  "businessDescription": "Leading retail company in Oman",
  "operatingGovernorate": ["Muscat", "Dhofar"],
  "averageJobsPerMonth": 5
}
```

### Complete Company Profile Steps (1-6)

Update specific steps to complete company profile.

```http
PUT /api/companies/{companyId}/step/{step}
```

**6-Step Completion Process:**

**Step 1: Basic Company Information**
```json
{
  "companyName": "Al-Rashid Trading LLC",
  "companyNameArabic": "شركة الراشد التجارية ذ.م.م",
  "legalEntityName": "Al-Rashid Trading Limited Liability Company",
  "commercialRegistrationNumber": "CR1234567",
  "taxRegistrationNumber": "TAX7654321",
  "establishedYear": 2010,
  "companySize": "medium"
}
```

**Step 2: Industry and Business (Uses Onboarding Data)**
```json
{
  "primaryIndustry": "retail",
  "secondaryIndustries": ["hospitality", "wholesale"],
  "businessDescription": "Leading retail company in Oman specializing in consumer goods and hospitality services",
  "servicesOffered": ["Retail Sales", "Hospitality Services", "Wholesale Distribution"],
  "targetMarkets": ["Local Consumers", "Tourists", "Small Businesses"]
}
```

**Step 3: Contact Information**
```json
{
  "contactPerson": {
    "name": "Omar Al-Rashid",
    "position": "HR Manager",
    "phone": "24123456",
    "email": "omar@alrashid.om"
  },
  "companyEmail": "info@alrashid.om",
  "companyPhone": "24123456",
  "website": "https://www.alrashid.om",
  "socialMedia": {
    "instagram": "@alrashidtrading",
    "linkedin": "al-rashid-trading-llc"
  }
}
```

**Step 4: Location and Address**
```json
{
  "headquarters": {
    "street": "Sultan Qaboos Street",
    "building": "Al-Rashid Tower",
    "area": "Ruwi",
    "wilayat": "Muscat",
    "governorate": "Muscat",
    "postalCode": "112"
  },
  "branches": [
    {
      "name": "Salalah Branch",
      "address": "Al-Hafa Street, Salalah",
      "governorate": "Dhofar"
    }
  ],
  "operatingGovernorate": ["Muscat", "Dhofar", "Al Batinah North"],
  "operatingWilayat": ["Muscat", "Bausher", "Salalah", "Sohar"]
}
```

**Step 5: Branding and Media**
```json
{
  "companyLogo": "https://storage.firebase.com/companies/logos/company_xyz456.png",
  "coverPhoto": "https://storage.firebase.com/companies/covers/company_xyz456.jpg",
  "companyPhotos": [
    "https://storage.firebase.com/companies/photos/company_xyz456_1.jpg",
    "https://storage.firebase.com/companies/photos/company_xyz456_2.jpg"
  ],
  "brandColors": {
    "primary": "#1E40AF",
    "secondary": "#F59E0B"
  }
}
```

**Step 6: HR and Hiring Preferences (Uses Onboarding Data)**
```json
{
  "hrContactInfo": {
    "name": "Sarah Al-Hinai",
    "position": "Recruitment Specialist",
    "phone": "24123457",
    "email": "hr@alrashid.om"
  },
  "typicalHiringRoles": ["waiter", "cashier", "sales_associate", "manager"],
  "preferredCandidateProfile": {
    "experienceLevel": ["entry", "intermediate"],
    "languages": ["Arabic", "English"],
    "education": ["secondary", "diploma"]
  },
  "hiringFrequency": "monthly",
  "averageJobsPerMonth": 8
}
```

**Response:**
```json
{
  "success": true,
  "message": "Profile step 3 updated successfully",
  "data": {
    "profileCompletionStep": 3,
    "isProfileComplete": false,
    "completionPercentage": 55
  }
}
```

### Search Companies

Search for companies based on criteria.

```http
GET /api/companies/search?industry=retail&governorate=Muscat&companySize=medium&limit=20
```

**Query Parameters:**
- `industry` - Industry name
- `governorate` - Governorate name
- `companySize` - startup, small, medium, large
- `limit` - Number of results (1-100)
- `page` - Page number

### Get Companies by Industry

Get companies in a specific industry.

```http
GET /api/companies/industry/{industry}?limit=20
```

### Get Profile Completion Status

Check company profile completion percentage and missing fields.

```http
GET /api/companies/{companyId}/completion
```

### Upload Company Logo

Upload or update company logo.

```http
POST /api/companies/{companyId}/logo
```

**Request Body:**
```json
{
  "companyLogo": "https://storage.example.com/logos/company123.png"
}
```

### Upload Cover Photo

Upload or update company cover photo.

```http
POST /api/companies/{companyId}/cover
```

**Request Body:**
```json
{
  "coverPhoto": "https://storage.example.com/covers/company123.jpg"
}
```

### Check Commercial Registration

Check if a commercial registration number exists.

```http
GET /api/companies/check-registration/{crNumber}
```

**Response:**
```json
{
  "success": true,
  "message": "Commercial registration check completed",
  "data": {
    "commercialRegistrationNumber": "CR1234567",
    "exists": false
  }
}
```

### Update Company Rating

Add a rating/review to a company.

```http
POST /api/companies/{companyId}/rating
```

**Request Body:**
```json
{
  "rating": 4.5
}
```

### Delete Company Profile

Deactivate a company profile.

```http
DELETE /api/companies/{companyId}
```

---

## Health Check

### Server Health

Check if the server is running and healthy.

```http
GET /health
```

**Response:**
```json
{
  "success": true,
  "message": "Shift Backend API is running",
  "timestamp": "2024-01-15T10:30:00Z",
  "environment": "development",
  "version": "1.0.0"
}
```

---

## Error Handling

### Validation Errors (400)

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    {
      "field": "phoneNumber",
      "message": "Phone number must be between 8 and 15 digits",
      "value": "123"
    }
  ]
}
```

### Not Found (404)

```json
{
  "success": false,
  "message": "User not found"
}
```

### Conflict (409)

```json
{
  "success": false,
  "message": "Phone number already registered",
  "data": {
    "userId": "existing123",
    "userType": "seeker"
  }
}
```

### Rate Limit (429)

```json
{
  "success": false,
  "status": "error",
  "message": "Too many requests from this IP, please try again later."
}
```

### Internal Server Error (500)

```json
{
  "success": false,
  "status": "error",
  "message": "Something went wrong!"
}
```

---

## Data Models

### User Model

```json
{
  "id": "string",
  "phoneNumber": "string",
  "countryCode": "string",
  "userType": "seeker|company",
  "isPhoneVerified": "boolean",
  "onboardingCompleted": "boolean",
  "profileCompleted": "boolean",
  "isActive": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "lastLoginAt": "timestamp"
}
```

### Seeker Model

```json
{
  "id": "string",
  "userId": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "dateOfBirth": "date",
  "gender": "male|female|other",
  "nationality": "string",
  "profilePhoto": "url",
  "address": "object",
  "wilayat": "string",
  "governorate": "string",
  "experienceLevel": "entry|intermediate|senior",
  "industries": "array",
  "roles": "array",
  "skills": "array",
  "languages": "array",
  "education": "array",
  "employmentType": "array",
  "availabilityShifts": "object",
  "expectedSalary": "object",
  "cvFile": "url",
  "profileCompletionStep": "number",
  "isProfileComplete": "boolean",
  "isVerified": "boolean",
  "isActive": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### Company Model (Updated with Frontend Structure)

```json
{
  "id": "string",
  "userId": "string",
  "companyName": "string",
  "crNumber": "string",
  "adminDetails": {
    "fullName": "string",
    "role": "string",
    "phone": "string",
    "email": "string"
  },
  "brands": [
    {
      "name": "string",
      "logo": "url",
      "industry": "string",
      "description": "string"
    }
  ],
  "locations": [
    {
      "address": "string",
      "governorate": "string",
      "wilayat": "string",
      "coordinates": {
        "latitude": "number",
        "longitude": "number"
      },
      "manager": {
        "name": "string",
        "phone": "string",
        "email": "string",
        "verified": "boolean"
      },
      "operatingHours": "object"
    }
  ],
  "teamMembers": [
    {
      "email": "string",
      "role": "string",
      "invitedAt": "timestamp",
      "status": "pending|accepted|declined"
    }
  ],
  "subscriptionPlan": "trial|starter|professional|custom",
  "subscriptionStatus": "trial|active|expired|suspended",
  "trialStartDate": "timestamp",
  "trialEndDate": "timestamp",
  "trialDaysRemaining": "number",
  "trialExpired": "boolean",
  "paymentMethods": [
    {
      "type": "bank|paypal|stripe",
      "name": "string",
      "details": "object",
      "isDefault": "boolean"
    }
  ],
  "paymentHistory": "array",
  "creditBalance": "number",
  "termsAccepted": "boolean",
  "termsAcceptedAt": "timestamp",
  "termsVersion": "string",
  "profileConfirmed": "boolean",
  "confirmedAt": "timestamp",
  "crVerificationStatus": "pending|verified|rejected",
  "isVerified": "boolean",
  "isActive": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
  "companyName": "string",
  "companyNameArabic": "string",
  "commercialRegistrationNumber": "string",
  "primaryIndustry": "string",
  "companyEmail": "string",
  "companyPhone": "string",
  "website": "url",
  "companySize": "startup|small|medium|large",
  "establishedYear": "number",
  "businessDescription": "string",
  "headquarters": "object",
  "operatingGovernorate": "array",
  "companyLogo": "url",
  "coverPhoto": "url",
  "subscriptionPlan": "free|basic|premium|enterprise",
  "isVerified": "boolean",
  "profileCompletionStep": "number",
  "isProfileComplete": "boolean",
  "totalJobsPosted": "number",
  "averageRating": "number",
  "totalReviews": "number",
  "isActive": "boolean",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

## Complete User Flow Examples

### Example 1: Complete Seeker Journey

**Step 1: Phone Registration**
```bash
curl -X POST http://localhost:3000/api/phone/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "92345678",
    "countryCode": "+968",
    "userType": "seeker"
  }'
```
*Response: `userId: "user_abc123"`*

**Step 2: OTP Verification** (Integration Ready)
```bash
curl -X PUT http://localhost:3000/api/phone/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_abc123",
    "verified": true
  }'
```

**Step 3: Onboarding (Industry/Role Preferences)**
```bash
curl -X POST http://localhost:3000/api/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_abc123",
    "userType": "seeker",
    "selectedIndustries": ["hospitality", "retail"],
    "selectedRoles": ["waiter", "cashier"],
    "experienceLevel": "intermediate",
    "referralSource": "social_media",
    "referralDetails": "Instagram ad campaign"
  }'
```

**Step 4: Create Seeker Profile**
```bash
curl -X POST http://localhost:3000/api/seekers \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_abc123",
    "firstName": "Ahmed",
    "lastName": "Al-Rashid",
    "email": "ahmed@gmail.com",
    "dateOfBirth": "1995-03-15",
    "gender": "male",
    "governorate": "Muscat",
    "experienceLevel": "intermediate",
    "industries": ["hospitality", "retail"],
    "roles": ["waiter", "cashier"]
  }'
```
*Response: `seekerId: "seeker_abc123"`*

**Step 5: Complete Profile Steps (1-5)**
```bash
# Step 1: Personal Information
curl -X PUT http://localhost:3000/api/seekers/seeker_abc123/step/1 \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ahmed",
    "lastName": "Al-Rashid",
    "email": "ahmed@gmail.com",
    "profilePhoto": "https://storage.firebase.com/profiles/ahmed.jpg"
  }'

# Step 2: Location
curl -X PUT http://localhost:3000/api/seekers/seeker_abc123/step/2 \
  -H "Content-Type: application/json" \
  -d '{
    "governorate": "Muscat",
    "wilayat": "Bausher",
    "transportationAvailable": true
  }'

# Continue with steps 3-5...
```

### Example 2: Complete Company Journey

**Step 1: Phone Registration**
```bash
curl -X POST http://localhost:3000/api/phone/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "24123456",
    "countryCode": "+968",
    "userType": "company"
  }'
```
*Response: `userId: "user_xyz456"`*

**Step 2: OTP Verification**
```bash
curl -X PUT http://localhost:3000/api/phone/verify \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_xyz456",
    "verified": true
  }'
```

**Step 3: Company Onboarding**
```bash
curl -X POST http://localhost:3000/api/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_xyz456",
    "userType": "company",
    "selectedIndustries": ["retail", "hospitality"],
    "hiringNeeds": "regular_staff",
    "typicalHiringRoles": ["waiter", "cashier", "manager"],
    "referralSource": "business_network",
    "referralDetails": "Recommended by partner company"
  }'
```

**Step 4: Create Company Profile**
```bash
curl -X POST http://localhost:3000/api/companies \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_xyz456",
    "companyName": "Al-Rashid Trading LLC",
    "commercialRegistrationNumber": "CR1234567",
    "primaryIndustry": "retail",
    "companyEmail": "info@alrashid.om",
    "companyPhone": "24123456"
  }'
```
*Response: `companyId: "company_xyz456"`*

**Step 5: Complete Company Profile Steps (1-6)**
```bash
# Step 1: Basic Information
curl -X PUT http://localhost:3000/api/companies/company_xyz456/step/1 \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "Al-Rashid Trading LLC",
    "commercialRegistrationNumber": "CR1234567",
    "establishedYear": 2010
  }'

# Continue with steps 2-6...
```

### Data Relationships Summary

**Phone Registration** → **Onboarding** → **Profile Creation**

```
user_abc123 (Seeker)
├── Phone: +968 92345678
├── Onboarding: [hospitality, retail] + [waiter, cashier]
└── Profile: seeker_abc123 (inherits industries/roles)

user_xyz456 (Company)  
├── Phone: +968 24123456
├── Onboarding: [retail, hospitality] + hiring needs
└── Profile: company_xyz456 (inherits industries/hiring roles)
```

**For Recommendation Engine:**
- Seeker preferences (industries/roles) match Company hiring needs
- Stored referral data for analytics
- Complete profile data for intelligent matching

---

This API documentation covers all current endpoints. For additional features or questions, please contact the development team.