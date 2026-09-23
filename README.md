# 🗣️ Talq — Modern Real-Time Chat & Direct Messaging Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8-010101?logo=socketdotio&logoColor=white)](https://socket.io/)
[![PostgreSQL](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Expo](https://img.shields.io/badge/Expo-React_Native-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Talq** is a full-stack, real-time messaging application featuring both a responsive web client and a cross-platform React Native / Expo mobile app. Powered by **Node.js, Express, Socket.io, and Supabase (PostgreSQL)**, Talq supports public channels, private 1-on-1 direct messaging (DMs), friend requests, live online presence, typing indicators, and automated message cleanup.

---

## ✨ Features

### 💬 Messaging & Channels
- **Real-Time Communication:** Instant message delivery and receipt powered by Socket.io.
- **Public Channels / Rooms:** Default topical channels (`#general`, `#tech`, `#gaming`, `#music`, `#random`).
- **1-on-1 Direct Messaging (DMs):** Start private, encrypted-session conversations with friends.
- **Message History:** Persistent conversation history stored in Supabase PostgreSQL, loaded instantly on join.
- **Live Typing Indicators:** Real-time feedback showing when friends or room members are typing.

### 👥 Social & Presence
- **Friend Request System:** Search users by username, send friend requests, and accept/decline invites.
- **Friends List:** Quick access to all your connections.
- **Live Presence & Status:** Real-time green/grey online indicator for friends across web and mobile.

### 🛡️ Authentication & Security
- **User Registration & Login:** Custom auth flow with username and password.
- **Bcrypt Hashing:** Passwords hashed with `bcryptjs` (salt rounds: 10).
- **JWT Authorization:** Stateless authentication using JSON Web Tokens (`jsonwebtoken`), verified on both REST endpoints and Socket.io handshakes.

### 🧹 Auto Maintenance
- **Automated Data Retention:** Background cleanup routine running hourly and on server boot to delete messages older than 7 days, preventing database bloat.

### 📱 Cross-Platform Clients
- **Modern Web App:** Clean dark/light glassmorphic UI, responsive across desktop and mobile browsers, emoji picker, and custom scrollbars.
- **React Native Mobile App:** Built with Expo SDK 57, React Native 0.86, and React Navigation. Configurable server IP/domain, native safe-area handling, and EAS build configuration for Android APK builds.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Node.js, Express.js, HTTP, CORS |
| **Real-time** | Socket.IO |
| **Database** | Supabase (PostgreSQL), `pg` connection pooler |
| **Auth & Security**| JWT (`jsonwebtoken`), `bcryptjs` |
| **Web Frontend** | Vanilla HTML5, Modern CSS3 (Variables, Flexbox/Grid, Glassmorphism), Vanilla JavaScript |
| **Mobile App** | React Native, Expo (SDK 57), React Navigation Stack, AsyncStorage |
| **Build & Deploy** | Render (Web Service), EAS Build (Android APK / iOS) |

---

## 📂 Project Structure

```text
chatapp/
├── mobile/                   # React Native (Expo) Mobile Application
│   ├── assets/               # App icons, splash screens, adaptive icons
│   ├── src/
│   │   ├── components/       # UI components (UserAvatar, etc.)
│   │   ├── context/          # AuthContext & SocketContext
│   │   ├── screens/          # LoginScreen, SignupScreen, HomeScreen, ChatScreen
│   │   ├── utils/            # Helpers
│   │   └── config.js         # Dynamic server URL configuration
│   ├── app.json              # Expo application configuration & bundle IDs
│   ├── App.js                # App entry point & Navigation stack
│   ├── eas.json              # EAS build profiles (development, preview APK, production)
│   └── package.json
│
├── public/                   # Web Client Frontend
│   ├── index.html            # Main markup (Auth views, Channels, Chat & DMs)
│   ├── style.css             # Glassmorphic responsive styling & themes
│   └── app.js                # Web frontend state, DOM, and Socket.io client
│
├── database.js               # PostgreSQL pool & query functions (Auth, Messages, Friends)
├── server.js                 # Express HTTP server & Socket.io event handling
├── seed.js                   # Database initialization and sample user seeding
├── package.json              # Backend dependencies & scripts
├── .env.example              # Sample environment variables
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)
- A free [Supabase](https://supabase.com/) account (or any PostgreSQL instance)
- (Optional for Mobile) [Expo Go](https://expo.dev/go) app on your Android or iOS device

---

### 1. Backend & Web App Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/rxxkie-git/talq.git
   cd talq
   ```

2. **Install backend dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory:
   ```env
   # Database connection string (Use Supabase Session / Transaction Pooler for best results)
   DATABASE_URL=postgresql://postgres.yourprojectref:yourpassword@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true

   # JWT secret & Port
   JWT_SECRET=your_super_secret_jwt_key_here
   PORT=3000
   ```

4. **Initialize the Database:**
   You can run the included database seeder to create tables and pre-populate test users:
   ```bash
   node seed.js
   ```
   *(Alternatively, run the SQL schema in [Database Schema](#-database-schema) below inside your Supabase SQL Editor).*

5. **Start the server:**
   ```bash
   # Development mode (with nodemon)
   npm run dev

   # Production mode
   npm start
   ```

6. Open `http://localhost:3000` in your browser.

---

### 2. Mobile App Setup (React Native / Expo)

1. **Navigate to the mobile directory and install dependencies:**
   ```bash
   cd mobile
   npm install
   ```

2. **Configure Backend URL:**
   - Open `mobile/src/config.js` and set `DEFAULT_SERVER_URL` to your machine's local Wi-Fi IP (e.g. `http://192.168.1.100:3000`) or your hosted backend URL (e.g. `https://your-app.onrender.com`).
   - *Note: You can also change the backend server URL directly from the settings icon on the Mobile Login screen!*

3. **Start the Expo development server:**
   ```bash
   npx expo start
   ```

4. **Run on device:**
   - Scan the QR code using the **Expo Go** app on Android or the Camera app on iOS.
   - Or press `a` for Android Emulator / `i` for iOS Simulator.

---

## 🗄️ Database Schema

The database uses PostgreSQL with `gen_random_uuid()` for IDs. The following schema is maintained in `seed.js`:

```sql
-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  room TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room, timestamp);

-- Friend Requests Table
CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  receiver_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(sender_id, receiver_id)
);

-- Friends Table
CREATE TABLE IF NOT EXISTS friends (
  user_id1 TEXT REFERENCES users(id) ON DELETE CASCADE,
  user_id2 TEXT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id1, user_id2)
);
```

---

## 📦 Building Standalone Mobile App (APK / iOS)

The mobile project is configured with **EAS Build**:

1. **Install EAS CLI:**
   ```bash
   npm install -g eas-cli
   ```

2. **Log in to Expo:**
   ```bash
   eas login
   ```

3. **Build an Android APK (Preview profile):**
   ```bash
   cd mobile
   eas build --platform android --profile preview
   ```
   Once built, EAS will provide a direct download link for the installable `.apk` file.

---

## 🌐 Deployment (Render)

This application is optimized for deployment on platforms supporting WebSockets, such as **Render**:

1. Connect your GitHub repository to Render as a **Web Service**.
2. **Environment:** Node
3. **Build Command:** `npm install`
4. **Start Command:** `npm start`
5. **Environment Variables:**
   - `DATABASE_URL`: Your Supabase connection string (*Use the connection pooler URL on port `6543` for IPv4 compatibility*).
   - `JWT_SECRET`: A secure random secret string.
   - `NODE_ENV`: `production`

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/rxxkie-git/talq/issues).

---

## 📝 License

This project is licensed under the [MIT License](LICENSE).
