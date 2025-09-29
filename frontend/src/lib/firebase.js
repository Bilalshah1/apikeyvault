import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  // You'll need to replace these with your actual Firebase config values
  apiKey: "AIzaSyAJaIvNpVunKop5kYbAEv-dFLBfdB2ZgO0",
  authDomain: "apikeyvault-b1ac8.firebaseapp.com",
  projectId: "apikeyvault-b1ac8",
  storageBucket: "apikeyvault-b1ac8.firebasestorage.app",
  messagingSenderId: "124220431624",
  appId: "1:124220431624:web:85762bbd2bafee6c4c60bd",
  measurementId: "G-WQ88ECMPBG"
};

// Initialize Firebase (guard against re-initialization during hot reload)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);
export default app;
