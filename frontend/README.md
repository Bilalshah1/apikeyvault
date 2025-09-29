## API Key Vault – Frontend

A Next.js frontend for API Key Vault with Firebase Authentication and Firebase Hosting deployment.

### Live Site
- Firebase Hosting: [https://YOUR-PROJECT.web.app](https://YOUR-PROJECT.web.app)

### Tech Stack
- Next.js (App Router)
- Firebase Authentication
- Tailwind CSS
- Deployed on Firebase Hosting (static export)

### Prerequisites
- Node.js 18+
- Firebase project and CLI: `npm install -g firebase-tools` and `firebase login`

### Local Setup
```bash
cd frontend
npm install
npm run dev
```

### Configure Firebase Web SDK
Update `src/lib/firebase.js` with your Firebase config (see `FIREBASE_SETUP.md`).

### Build (Static Export)
The project is configured for static export (`next.config.mjs` → `output: 'export'`).
```bash
cd frontend
npm run build   # generates the `out/` directory
```

### Deploy to Firebase Hosting
Make sure `firebase.json` points `public` to `out`.
```bash
cd frontend
firebase init hosting   # pick your project, set public to "out", single-page app: No
firebase deploy --only hosting
```

### Environment & Notes
- No server-side rendering; all pages are statically exported.
- If you later need SSR or API routes, use Firebase’s Next.js framework integration instead of `output: 'export'`.

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
