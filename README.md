# Jackie Jeans — Smart Fit Onboarding

A mobile-first onboarding experience with two flows:

- **Manual Quiz** (`/quiz`) — guided form, one question at a time
- **AI Voice Quiz** (`/voice`) — speak your answers, AI guides you through

## Tech Stack

- Next.js 16 + TypeScript + Tailwind CSS 4
- Web Speech API (browser-native) for voice — no API key needed
- Google Fonts (Cormorant Garamond + Inter)

## Local Setup

```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Or push to GitHub and import at vercel.com — zero config needed.

## Voice Quiz Notes

- Works best in **Chrome** on desktop or Android
- Safari on iOS has limited Web Speech API support — use Chrome on iPhone
- Allow microphone permission when prompted
- Tap the mic button to speak, tap again to stop

## Structure

```
app/
  page.tsx          ← Landing / choose flow
  quiz/page.tsx     ← Manual Fit Quiz (10 questions)
  voice/page.tsx    ← AI Voice Quiz
  globals.css       ← Design tokens + animations
lib/
  quizData.ts       ← All question options, types
```

## Flow

Both flows end with a redirect to `https://jackie-jeans.vercel.app/`
with the fit profile encoded as a URL param (`?fit=...`).
