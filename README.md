# 🗣️ Talq — Real-Time Chat Application

Talq is a blazing-fast, real-time chat application built with **Node.js, Express, Socket.io, and Supabase (PostgreSQL)**. It features secure JWT authentication, room-based chatting, typing indicators, and real-time user presence.

## Features

- **Real-time Messaging:** Powered by Socket.io for instant message delivery.
- **Room-based Chat:** Organize conversations into channels (General, Tech, Gaming, Music, Random).
- **Secure Authentication:** JWT-based login with bcrypt password hashing.
- **Database Persistence:** Messages and users are securely stored in a Supabase PostgreSQL database.
- **Rich UI/UX:** 
  - Typing indicators
  - Real-time online user list
  - Emoji picker
  - Dark/Light mode toggle
  - Responsive design for mobile and desktop

## Tech Stack

- **Frontend:** HTML, Vanilla CSS (Custom design system), Vanilla JavaScript
- **Backend:** Node.js, Express
- **Real-time Engine:** Socket.io
- **Database:** Supabase (PostgreSQL), `pg` driver
- **Security:** `jsonwebtoken` (JWT), `bcryptjs`

## Local Setup

### Prerequisites
- Node.js installed (v18+)
- A Supabase project (for the PostgreSQL database)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd chatapp
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Use the Connection Pooler URL from Supabase for best compatibility
   DATABASE_URL=postgresql://user:password@pooler.supabase.com:6543/postgres?pgbouncer=true
   JWT_SECRET=your_super_secret_jwt_key
   PORT=3000
   ```

4. **Initialize the Database**
   Run the following SQL in your Supabase SQL Editor to create the necessary tables and seed initial users (`srinand` and `deeya` with passwords `srinand123` and `deeya123`):

   ```sql
   CREATE TABLE IF NOT EXISTS users (
     id            SERIAL PRIMARY KEY,
     username      TEXT   NOT NULL UNIQUE,
     password_hash TEXT   NOT NULL,
     created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
   );

   CREATE TABLE IF NOT EXISTS messages (
     id        TEXT PRIMARY KEY,
     username  TEXT NOT NULL,
     room      TEXT NOT NULL,
     message   TEXT NOT NULL,
     timestamp TIMESTAMPTZ NOT NULL
   );

   CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room, timestamp);

   INSERT INTO users (username, password_hash) VALUES
     ('srinand', '$2b$10$gaRLdJI/UDBWYNPOCLmDauUHXsfNVc/wnvkCYTuw6Kk0Y8RiGPCoq'),
     ('deeya',   '$2b$10$hjMTE1yiNXbXiEh0rPwPI.3TaIRzYvvyDvGXkuYU0XTIXRc0Ye6py')
   ON CONFLICT (username) DO NOTHING;
   ```

5. **Start the server**
   ```bash
   npm run dev
   ```
   The app will be running at `http://localhost:3000`.

## Deployment (Render)

This app is optimized for deployment on platforms that support WebSockets, such as **Render**.

1. Connect your GitHub repository to Render as a **Web Service**.
2. Set the **Build Command** to `npm install`.
3. Set the **Start Command** to `npm start`.
4. Add your `DATABASE_URL` and `JWT_SECRET` as Environment Variables in Render.
   > **Note:** Ensure your Supabase `DATABASE_URL` uses the **Connection Pooler** string (usually port `6543`) since Render environments may not fully support the IPv6 direct connection.
