const fs = require('fs');
let code = fs.readFileSync('src/lib/workspace-auth.ts', 'utf-8');

code = code.replace(
  "import firebaseConfig from '../../firebase-applet-config.json';",
  `
const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0071021977",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:243504849678:web:e425c22b46ed71ac142d5f",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "", // Provided via Hostinger Env Variables
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0071021977.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0071021977.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "243504849678",
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || "243504849678-p6lq1vh55cncj2155km1l6bjpamisvsf.apps.googleusercontent.com"
};
`
);

fs.writeFileSync('src/lib/workspace-auth.ts', code);
