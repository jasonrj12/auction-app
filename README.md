# Bidly - Real-Time Auction Platform

A modern, real-time auction web application built with React, Vite, Tailwind CSS, Firebase, and optional Supabase Realtime integration.

## Features

- **Real-Time Bidding**: Instant updates when new bids are placed.
- **User Authentication**: Secure email & password authentication powered by Firebase Auth.
- **User Profiles**: Profile management with display name, avatar, and contact details.
- **Auction Management**: Create listings with image attachments, starting bids, and countdown timers.
- **Admin Dashboard**: Manage user roles, active auctions, and listing moderation.
- **Responsive UI**: Clean and modern interface styled with Tailwind CSS.

## Tech Stack

- **Frontend**: React 18, Vite, React Router 6, Tailwind CSS
- **Backend & Auth**: Firebase Auth, Cloud Firestore, Firebase Storage
- **Live Bids Feed**: Supabase Realtime (optional fallback / feed)

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jasonrj12/auction-app.git
   cd auction-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Fill in your Firebase configuration keys:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id

   # Optional: Supabase configuration for live bid streaming
   VITE_SUPABASE_URL=
   VITE_SUPABASE_ANON_KEY=
   VITE_CURRENCY=LKR
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Build for production:
   ```bash
   npm run build
   ```

## License

MIT
