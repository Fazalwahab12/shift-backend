# Shift Backend API

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A professional Node.js backend API for the **Shift** job marketplace mobile application in Oman. Built with Express.js and Firebase/Firestore, this API manages user registration, onboarding, and profile management for both job seekers and companies.

## 🚀 Features

- **Phone Number Registration** - Oman-specific phone number validation and storage
- **User Onboarding** - Industry and role preference management
- **Job Seeker Profiles** - Complete 5-step profile creation and management
- **Company Profiles** - Comprehensive 6-step company profile system
- **Search & Discovery** - Advanced search for both seekers and companies
- **File Management** - Profile photos, logos, and CV upload support
- **Rate Limiting** - Built-in protection against API abuse
- **Validation & Security** - Comprehensive input validation and security measures
- **Error Handling** - Professional error handling and logging
- **Documentation** - Complete API documentation with examples

## 🛠 Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js 4.18+
- **Database**: Firebase Firestore
- **Authentication**: Firebase Admin SDK (ready for future implementation)
- **Storage**: Firebase Storage (for file uploads)
- **Validation**: express-validator + Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Logging**: Morgan + Custom logging
- **Development**: Nodemon, ESLint, Prettier

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (version 18.0 or higher)
- [npm](https://www.npmjs.com/) (version 8.0 or higher)
- [Firebase Project](https://console.firebase.google.com/) with Firestore enabled
- Firebase Admin SDK service account key

## 🔧 Installation

### 1. Clone the Repository

```bash
cd shift-backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use an existing one
3. Enable Firestore Database
4. Enable Firebase Storage
5. Generate a service account key:
   - Go to Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save the JSON file as `firebase-service-account.json` in the `src/config/` directory

### 4. Environment Configuration

Create a `.env` file in the root directory:

```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com/
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com

# Optional: JSON string of service account (for production)
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}

# CORS Origins (comma-separated)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,exp://192.168.1.100:8081

# Rate Limiting (optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. Firebase Service Account

Place your Firebase service account JSON file at:
```
src/config/firebase-service-account.json
```

**Security Note**: Never commit this file to version control. Add it to `.gitignore`.

## 🚀 Running the Application

### Development Mode

```bash
npm run dev
```

The server will start on `http://localhost:3000` with auto-reload enabled.

### Production Mode

```bash
npm start
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
npm run lint:fix
```

### Code Formatting

```bash
npm run format
```

## 📚 API Documentation

### Quick Start

Check if the server is running:
```bash
curl http://localhost:3000/health
```

Get API overview:
```bash
curl http://localhost:3000/api
```

### Main Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Server health check |
| `GET /api` | API overview and documentation |
| `POST /api/phone/register` | Register phone number |
| `POST /api/onboarding` | Create/update onboarding data |
| `POST /api/seekers` | Create seeker profile |
| `POST /api/companies` | Create company profile |

### Complete API Documentation

Detailed API documentation with examples is available at:
- **File**: `docs/API_DOCUMENTATION.md`
- **Online**: [API Documentation](docs/API_DOCUMENTATION.md)

## 🏗 Project Structure

```
shift-backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Database configuration
│   │   ├── firebase.js          # Firebase setup
│   │   └── firebase-service-account.json
│   ├── controllers/
│   │   ├── phoneController.js   # Phone management
│   │   ├── onboardingController.js # Onboarding logic
│   │   ├── seekerController.js  # Seeker profiles
│   │   └── companyController.js # Company profiles
│   ├── middleware/
│   │   ├── errorHandler.js      # Error handling
│   │   ├── security.js          # Security middleware
│   │   └── validation.js        # Input validation
│   ├── models/
│   │   ├── User.js              # User model
│   │   ├── Seeker.js            # Seeker model
│   │   ├── Company.js           # Company model
│   │   └── OnboardingData.js    # Onboarding model
│   ├── routes/
│   │   ├── phoneRoutes.js       # Phone endpoints
│   │   ├── onboardingRoutes.js  # Onboarding endpoints
│   │   ├── seekerRoutes.js      # Seeker endpoints
│   │   └── companyRoutes.js     # Company endpoints
│   ├── services/               # Business logic services
│   ├── utils/                  # Utility functions
│   └── server.js               # Main server file
├── docs/
│   └── API_DOCUMENTATION.md    # Complete API docs
├── tests/                      # Test files
├── .env                        # Environment variables
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies
└── README.md                   # This file
```

## 🔒 Security Features

- **Rate Limiting**: Multiple tiers of rate limiting to prevent abuse
- **Input Validation**: Comprehensive validation using express-validator
- **CORS Protection**: Configurable CORS with origin whitelisting
- **Security Headers**: Helmet.js for security headers
- **Request Sanitization**: Input sanitization and XSS protection
- **Error Handling**: Secure error responses (no sensitive data exposure)
- **IP Filtering**: Optional IP whitelisting for admin endpoints

## 🔥 Firebase Integration

### Firestore Collections

| Collection | Purpose |
|------------|---------|
| `users` | Basic user information and phone registration |
| `seekers` | Job seeker profiles and preferences |
| `companies` | Company profiles and information |
| `onboarding_data` | User onboarding preferences |
| `phone_registrations` | Phone verification records |

### Firebase Storage

- Profile photos: `profiles/seekers/`
- Company logos: `profiles/companies/logos/`
- Company covers: `profiles/companies/covers/`
- CVs: `documents/cvs/`
- Documents: `documents/`

## 🧪 Testing

### Manual Testing with curl

**Register a phone number:**
```bash
curl -X POST http://localhost:3000/api/phone/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "92345678",
    "countryCode": "+968",
    "userType": "seeker"
  }'
```

**Create onboarding data:**
```bash
curl -X POST http://localhost:3000/api/onboarding \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_PREVIOUS_RESPONSE",
    "userType": "seeker",
    "selectedIndustries": ["hospitality", "retail"],
    "selectedRoles": ["waiter", "cashier"],
    "experienceLevel": "intermediate",
    "referralSource": "social_media"
  }'
```

**Create seeker profile:**
```bash
curl -X POST http://localhost:3000/api/seekers \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_FROM_REGISTRATION",
    "firstName": "Ahmed",
    "lastName": "Al-Rashid",
    "email": "ahmed@example.com",
    "dateOfBirth": "1995-03-15",
    "gender": "male",
    "governorate": "Muscat",
    "experienceLevel": "intermediate"
  }'
```

### Using Postman

Import the API endpoints into Postman:
1. Create a new collection
2. Add the base URL: `http://localhost:3000`
3. Import the endpoints from the API documentation

## 📊 Monitoring & Logging

### Logs

The application provides comprehensive logging:
- **Request Logs**: All incoming requests with timestamps
- **Response Logs**: Response status codes and timing
- **Error Logs**: Detailed error information for debugging
- **Security Logs**: Rate limiting and security violations

### Health Monitoring

Monitor the application health:
```bash
curl http://localhost:3000/health
```

Response includes:
- Server status
- Environment information
- Timestamp
- Version

## 🚀 Deployment

### Environment Setup

1. **Production Environment Variables**:
```env
NODE_ENV=production
PORT=3000
FIREBASE_PROJECT_ID=your-production-project-id
FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

2. **Firebase Production Project**:
   - Create a separate Firebase project for production
   - Configure Firestore security rules
   - Set up proper IAM permissions
   - Enable necessary APIs

### Deployment Options

#### Option 1: Traditional VPS/Server
```bash
# Install dependencies
npm ci --production

# Start with PM2
npm install -g pm2
pm2 start src/server.js --name shift-backend

# Or start directly
npm start
```

#### Option 2: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

#### Option 3: Cloud Platforms
- **Google Cloud Run**: Direct deployment from Firebase
- **AWS Elastic Beanstalk**: Node.js platform
- **Heroku**: Node.js buildpack
- **DigitalOcean App Platform**: Node.js app

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure production Firebase project
- [ ] Set up proper CORS origins
- [ ] Configure production database
- [ ] Set up monitoring and logging
- [ ] Configure SSL/HTTPS
- [ ] Set up backup strategy
- [ ] Configure rate limiting for production load
- [ ] Set up health check endpoints
- [ ] Configure error tracking (Sentry, etc.)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

This project uses ESLint and Prettier for code formatting:
```bash
npm run lint:fix
npm run format
```

### Commit Guidelines

Follow conventional commit format:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test changes
- `chore:` - Build process or auxiliary tool changes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

1. **Documentation**: Check `docs/API_DOCUMENTATION.md`
2. **Issues**: Create an issue on GitHub
3. **Email**: Contact the development team

## 🔮 Roadmap

### Phase 1 (Current)
- [x] Phone registration system
- [x] User onboarding flow
- [x] Seeker profile management
- [x] Company profile management
- [x] Basic search functionality

### Phase 2 (Upcoming)
- [ ] Job posting system
- [ ] Application management
- [ ] Notification system
- [ ] Real-time chat
- [ ] Advanced search filters
- [ ] Payment integration

### Phase 3 (Future)
- [ ] AI-powered job matching
- [ ] Video interviews
- [ ] Skills assessment
- [ ] Analytics dashboard
- [ ] Mobile app push notifications

## 🙏 Acknowledgments

- **Express.js** - Fast, unopinionated web framework
- **Firebase** - Comprehensive app development platform
- **Node.js Community** - Amazing ecosystem and tools
- **Oman Tech Community** - Local support and feedback

---

**Built with ❤️ for the Oman job market**

*Shift - Connecting talent with opportunity in Oman* 🇴🇲