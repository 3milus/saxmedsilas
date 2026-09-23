// ============================================================
// Firebase setup shared by the public site (js/main.js) and the
// admin page (js/admin.js). See README.md, section 3.
//
// Paste the values from Firebase Console > Project settings >
// General > "Your apps" (Web app). These values are not secret —
// access is controlled by firestore.rules and storage.rules.
// ============================================================
export const firebaseConfig = {
  apiKey: 'AIzaSyAQRtjQq422lV5UI41IR1tXkTJopEfHVkc',
  authDomain: 'saxmedsilas.firebaseapp.com',
  projectId: 'saxmedsilas',
  storageBucket: 'saxmedsilas.firebasestorage.app',
  messagingSenderId: '646480021473',
  appId: '1:646480021473:web:aa427693ba354c3c1cb4a0',
};

export const isFirebaseConfigured = !Object.values(firebaseConfig).some((value) =>
  String(value).startsWith('TODO')
);

const SDK_BASE = 'https://www.gstatic.com/firebasejs/10.12.2';

export function sdkUrl(name) {
  return `${SDK_BASE}/firebase-${name}.js`;
}

let firebasePromise;

// Loads the Firebase SDK on demand so the page itself never waits on it.
export function loadFirebase() {
  firebasePromise ??= (async () => {
    const [appModule, fs] = await Promise.all([import(sdkUrl('app')), import(sdkUrl('firestore'))]);
    const app = appModule.initializeApp(firebaseConfig);
    return { app, db: fs.getFirestore(app), fs };
  })();
  return firebasePromise;
}
