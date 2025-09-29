# Firebase Setup Instructions

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter your project name (e.g., "api-key-vault")
4. Follow the setup wizard

## 2. Enable Authentication

1. In your Firebase project, go to "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" authentication

## 3. Get Firebase Configuration

1. In your Firebase project, go to "Project settings" (gear icon)
2. Scroll down to "Your apps" section
3. Click "Web" icon to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

## 4. Update Firebase Configuration

Replace the placeholder values in `src/lib/firebase.js` with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-actual-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-actual-sender-id",
  appId: "your-actual-app-id"
};
```

## 5. Install Dependencies

Make sure you have Firebase installed:

```bash
npm install firebase
```

## 6. Run the Application

```bash
npm run dev
```

## Features Included

- ✅ User registration with email/password
- ✅ User login with email/password
- ✅ Protected dashboard route
- ✅ User logout functionality
- ✅ Form validation
- ✅ Error handling
- ✅ Responsive design with Tailwind CSS

## Pages

- `/` - Home page with navigation to signup/login
- `/signup` - User registration page
- `/login` - User login page
- `/dashboard` - Protected dashboard (requires authentication)

## Security Notes

- Password validation (minimum 6 characters)
- Email validation
- Password confirmation matching
- Protected routes that redirect unauthenticated users
- Secure Firebase authentication
