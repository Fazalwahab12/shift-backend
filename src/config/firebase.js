const admin = require("firebase-admin");
const path = require("path");

class FirebaseConfig {
  constructor() {
    this.db = null;
    this.auth = null;
    this.storage = null;
  }

  async initialize() {
    try {
      if (!admin.apps.length) {
        const serviceAccountPath = path.resolve(__dirname, "../../config/firebase-service-account.json");
        console.log("📂 Loading service account from:", serviceAccountPath);

        let serviceAccount;
        try {
          serviceAccount = require(serviceAccountPath);
          console.log("✅ Service account loaded, project_id:", serviceAccount.project_id);
        } catch (err) {
          console.error("❌ Failed to load service account JSON:", err);
          throw err;
        }

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL:
            process.env.FIREBASE_DATABASE_URL ||
            `https://${serviceAccount.project_id}.firebaseio.com`,
          storageBucket:
            process.env.FIREBASE_STORAGE_BUCKET ||
            `${serviceAccount.project_id}.appspot.com`,
          projectId: serviceAccount.project_id,
        });

        console.log("🔥 Firebase Admin SDK initialized with JSON file");
      }

      this.db = admin.firestore();
      this.auth = admin.auth();
      this.storage = admin.storage();

      this.db.settings({ ignoreUndefinedProperties: true });

      // Test Firestore access
      try {
        const testDoc = await this.db.collection("debug").doc("test").get();
        console.log("🔍 Firestore test read success:", testDoc.exists);
      } catch (firestoreError) {
        console.error("❌ Firestore test read failed:", firestoreError);
      }

      return { db: this.db, auth: this.auth, storage: this.storage, admin };
    } catch (error) {
      console.error("❌ Firebase initialization error:", error);
      throw new Error("Failed to initialize Firebase: " + error.message);
    }
  }

  getDb() {
    if (!this.db) throw new Error("Firebase not initialized. Call initialize() first.");
    return this.db;
  }

  getAuth() {
    if (!this.auth) throw new Error("Firebase not initialized. Call initialize() first.");
    return this.auth;
  }

  getStorage() {
    if (!this.storage) throw new Error("Firebase not initialized. Call initialize() first.");
    return this.storage;
  }

  getServerTimestamp() {
    return admin.firestore.FieldValue.serverTimestamp();
  }

  arrayUnion(...elements) {
    return admin.firestore.FieldValue.arrayUnion(...elements);
  }

  arrayRemove(...elements) {
    return admin.firestore.FieldValue.arrayRemove(...elements);
  }

  increment(value = 1) {
    return admin.firestore.FieldValue.increment(value);
  }
}

const firebaseConfig = new FirebaseConfig();
module.exports = firebaseConfig;
