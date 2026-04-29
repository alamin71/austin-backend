// Firebase Configuration Template
// Copy this to your config/index.ts or .env file

export const firebaseConfig = {
     // Service account path - where your Firebase service account JSON is stored
     service_account_path: process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './config/firebase-service-account.json',
     
     // Firebase database URL
     database_url: process.env.FIREBASE_DATABASE_URL || 'https://your-project.firebaseio.com',
     
     // Firebase project ID
     project_id: process.env.FIREBASE_PROJECT_ID || 'your-project-id',
     
     // For web - VAPID public key (from Firebase Console)
     vapid_key: process.env.FIREBASE_VAPID_KEY || 'your-vapid-public-key',
};

/**
 * SETUP INSTRUCTIONS:
 * 
 * 1. Create Firebase Project:
 *    - Go to https://console.firebase.google.com/
 *    - Create new project
 *    - Enable Cloud Messaging
 * 
 * 2. Get Service Account Key:
 *    - Project Settings → Service Accounts
 *    - Generate New Private Key
 *    - Save as ./config/firebase-service-account.json
 * 
 * 3. Get VAPID Key (for Web):
 *    - Cloud Messaging tab
 *    - Web Push certificates
 *    - Copy Public Key
 * 
 * 4. Update .env:
 *    FIREBASE_SERVICE_ACCOUNT_PATH=./config/firebase-service-account.json
 *    FIREBASE_DATABASE_URL=https://your-project.firebaseio.com
 *    FIREBASE_PROJECT_ID=your-project-id
 *    FIREBASE_VAPID_KEY=your-vapid-public-key
 * 
 * 5. Initialize in server.ts:
 *    import FirebaseHelper from './helpers/firebaseHelper.js';
 *    FirebaseHelper.initialize();
 */
