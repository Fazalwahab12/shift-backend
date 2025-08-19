#!/usr/bin/env node

/**
 * Shift Backend Setup Script
 * Helps initialize the project and check requirements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SetupScript {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.requiredFiles = [
      '.env',
      'src/config/firebase-service-account.json'
    ];
    this.requiredEnvVars = [
      'FIREBASE_PROJECT_ID',
      'FIREBASE_DATABASE_URL',
      'FIREBASE_STORAGE_BUCKET'
    ];
  }

  /**
   * Main setup process
   */
  async run() {
    console.log('🚀 Shift Backend Setup Script');
    console.log('==============================\n');

    try {
      this.checkNodeVersion();
      this.checkNpmVersion();
      this.createEnvFile();
      this.checkFirebaseConfig();
      this.installDependencies();
      this.runHealthCheck();
      this.showNextSteps();
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Check Node.js version
   */
  checkNodeVersion() {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    console.log(`📋 Checking Node.js version: ${nodeVersion}`);
    
    if (majorVersion < 18) {
      throw new Error('Node.js version 18 or higher is required');
    }
    
    console.log('✅ Node.js version is compatible\n');
  }

  /**
   * Check npm version
   */
  checkNpmVersion() {
    try {
      const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
      console.log(`📋 Checking npm version: ${npmVersion}`);
      console.log('✅ npm is available\n');
    } catch (error) {
      throw new Error('npm is not installed or not available in PATH');
    }
  }

  /**
   * Create .env file from example
   */
  createEnvFile() {
    const envPath = path.join(this.projectRoot, '.env');
    const envExamplePath = path.join(this.projectRoot, '.env.example');
    
    console.log('📋 Checking environment configuration...');
    
    if (!fs.existsSync(envPath)) {
      if (fs.existsSync(envExamplePath)) {
        fs.copyFileSync(envExamplePath, envPath);
        console.log('✅ Created .env file from .env.example');
        console.log('⚠️  Please update the .env file with your Firebase configuration');
      } else {
        console.log('⚠️  .env.example not found, please create .env manually');
      }
    } else {
      console.log('✅ .env file already exists');
    }
    console.log('');
  }

  /**
   * Check Firebase configuration
   */
  checkFirebaseConfig() {
    console.log('📋 Checking Firebase configuration...');
    
    const firebaseConfigPath = path.join(this.projectRoot, 'src/config/firebase-service-account.json');
    
    if (!fs.existsSync(firebaseConfigPath)) {
      console.log('⚠️  Firebase service account key not found');
      console.log('   Please download your Firebase service account key and save it as:');
      console.log(`   ${firebaseConfigPath}`);
      console.log('   Or set FIREBASE_SERVICE_ACCOUNT environment variable');
    } else {
      console.log('✅ Firebase service account key found');
    }
    
    // Check environment variables
    require('dotenv').config({ path: path.join(this.projectRoot, '.env') });
    
    const missingVars = this.requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.log('⚠️  Missing required environment variables:');
      missingVars.forEach(varName => {
        console.log(`   - ${varName}`);
      });
    } else {
      console.log('✅ All required environment variables are set');
    }
    console.log('');
  }

  /**
   * Install dependencies
   */
  installDependencies() {
    console.log('📋 Installing dependencies...');
    
    try {
      execSync('npm install', { 
        cwd: this.projectRoot,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      console.log('✅ Dependencies installed successfully\n');
    } catch (error) {
      throw new Error('Failed to install dependencies');
    }
  }

  /**
   * Run basic health check
   */
  runHealthCheck() {
    console.log('📋 Running health check...');
    
    try {
      // Try to require main modules
      require(path.join(this.projectRoot, 'src/config/database.js'));
      require(path.join(this.projectRoot, 'src/server.js'));
      
      console.log('✅ All modules can be loaded successfully\n');
    } catch (error) {
      console.log('⚠️  Health check failed:', error.message);
      console.log('   This might be due to missing environment configuration\n');
    }
  }

  /**
   * Show next steps
   */
  showNextSteps() {
    console.log('🎉 Setup Complete!');
    console.log('=================\n');
    
    console.log('Next steps:');
    console.log('1. Update your .env file with Firebase configuration');
    console.log('2. Add your Firebase service account key');
    console.log('3. Start the development server:');
    console.log('   npm run dev\n');
    
    console.log('Useful commands:');
    console.log('- npm run dev     : Start development server');
    console.log('- npm start       : Start production server');
    console.log('- npm test        : Run tests');
    console.log('- npm run lint    : Check code style');
    console.log('- npm run format  : Format code\n');
    
    console.log('Documentation:');
    console.log('- README.md                    : Project overview');
    console.log('- docs/API_DOCUMENTATION.md   : Complete API docs');
    console.log('- .env.example                 : Environment variables reference\n');
    
    console.log('Health check endpoint:');
    console.log('- http://localhost:3000/health\n');
    
    console.log('API overview:');
    console.log('- http://localhost:3000/api\n');
  }
}

// Run setup if called directly
if (require.main === module) {
  const setup = new SetupScript();
  setup.run().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = SetupScript;