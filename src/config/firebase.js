const admin = require('firebase-admin');
const path = require('path');

class FirebaseConfig {
  constructor() {
    this.db = null;
    this.auth = null;
    this.storage = null;
  }

  /**
   * Initialize Firebase Admin SDK
   */
  async initialize() {
    try {
      // Initialize Firebase Admin SDK
      if (!admin.apps.length) {
        // For production, use service account key file
        // For development, you can use the Firebase emulator or service account
      const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64
  ? JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64, "base64").toString("utf8"))
  : require("../../config/firebase-service-account.json");

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL || 'https://shipt-ed0e2-default-rtdb.firebaseio.com/',
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'shipt-ed0e2',
          projectId: process.env.FIREBASE_PROJECT_ID || 'shipt-ed0e2'
        });

        console.log('🔥 Firebase Admin SDK initialized successfully');
      }

      // Initialize services
      this.db = admin.firestore();
      this.auth = admin.auth();
      this.storage = admin.storage();

      // Configure Firestore settings
      this.db.settings({
        ignoreUndefinedProperties: true
      });

      return {
        db: this.db,
        auth: this.auth,
        storage: this.storage,
        admin
      };
    } catch (error) {
      console.error('❌ Firebase initialization error:', error);
      throw new Error('Failed to initialize Firebase: ' + error.message);
    }
  }

  /**
   * Get Firestore database instance
   */
  getDb() {
    if (!this.db) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.db;
  }

  /**
   * Get Firebase Auth instance
   */
  getAuth() {
    if (!this.auth) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.auth;
  }

  /**
   * Get Firebase Storage instance
   */
  getStorage() {
    if (!this.storage) {
      throw new Error('Firebase not initialized. Call initialize() first.');
    }
    return this.storage;
  }

  /**
   * Get server timestamp
   */
  getServerTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  /**
   * Get array union helper
   */
  arrayUnion(...elements) {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  }

  /**
   * Get array remove helper
   */
  arrayRemove(...elements) {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  }

  /**
   * Get increment helper
   */
  increment(value = 1) {
    return admin.firestore.FieldValue.increment(value);
  }
}

// Create singleton instance
const firebaseConfig = new FirebaseConfig();

module.exports = firebaseConfig;