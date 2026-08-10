require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const path      = require('path');
const jwt       = require('jsonwebtoken');

const { 
  verifyUser, createUser, saveMessage, getRoomHistory,
  getAllUsers, sendFriendRequest, getFriendRequests, respondFriendRequest, getFriends
} = require('./database');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*' },
});

const JWT_SECRET = process.env.JWT_SECRET || 'talq-super-secret-jwt-key-2025';
const JWT_EXPIRY = '7d';

// ── Middleware ───────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── REST: Login ──────────────────────────────────────────
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await verifyUser(username, password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log(`[AUTH] ${user.username} logged in`);
    return res.json({ token, username: user.username, id: user.id });
  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── REST: Signup ─────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  try {
    const user = await createUser(username, password);

    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    );

    console.log(`[AUTH] ${user.username} signed up`);
    return res.json({ token, username: user.username, id: user.id });
  } catch (err) {
    if (err.message === 'Username already exists') {
      return res.status(409).json({ error: 'Username is already taken.' });
    }
    console.error('[AUTH] Signup error:', err.message);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ── Root Route ───────────────────────────────────────────
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ── Socket.IO Auth Middleware ────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) {
    return next(new Error('AUTH_REQUIRED'));
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.username = payload.username;
    socket.userId   = payload.id;
    next();
  } catch {
    next(new Error('AUTH_INVALID'));
  }
});

// ── Track Connected Users ────────────────────────────────
const users = {};

function getRoomUsers(room) {
  return Object.values(users).filter(u => u.room === room);
}

// ── Socket.IO Events ─────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.username} connected (${socket.id})`);

  // User joins a room
  socket.on('join', ({ room }) => {
    // Leave previous room if any
    if (socket.room) {
      socket.leave(socket.room);
      delete users[socket.id];
      io.to(socket.room).emit('userList', getRoomUsers(socket.room));
    }

    socket.room = room || 'General';
    socket.join(socket.room);
    console.log(`[DEBUG] ${socket.username} joined room ${socket.room}`);

    users[socket.id] = {
      username: socket.username,
      room: socket.room,
      id: socket.id,
      userId: socket.userId,
    };

    // Send DB message history to this user
    getRoomHistory(socket.room, 50).then(history => {
      socket.emit('history', history);
    }).catch(err => console.error('[DB] history error:', err.message));

    // Notify others in the room
    socket.to(socket.room).emit('userEvent', {
      type: 'join',
      username: socket.username,
      timestamp: new Date().toISOString(),
    });

    // Broadcast updated user list
    io.to(socket.room).emit('userList', getRoomUsers(socket.room));

    console.log(`[>] ${socket.username} joined room: ${socket.room}`);
  });

  // Handle chat messages
  socket.on('chatMessage', ({ message, room }) => {
    if (!socket.username) return;

    const msgData = {
      id: Date.now() + Math.random().toString(36).substr(2, 5),
      username: socket.username,
      message,
      room: room || socket.room || 'General',
      timestamp: new Date().toISOString(),
    };

    // Persist to DB (async, don't block broadcast)
    saveMessage(msgData).catch(err => console.error('[DB] saveMessage error:', err.message));

    // Broadcast to room
    io.to(msgData.room).emit('chatMessage', msgData);
    console.log(`[DEBUG] ${msgData.username} sent message to room ${msgData.room}`);
    console.log(`[MSG] [${msgData.room}] ${msgData.username}: ${msgData.message}`);
  });

  // Typing indicators
  socket.on('typing', ({ room }) => {
    socket.to(room || socket.room).emit('typing', { username: socket.username });
  });

  socket.on('stopTyping', ({ room }) => {
    socket.to(room || socket.room).emit('stopTyping', { username: socket.username });
  });

  // ── Friends & Users Events ───────────────────────────────
  socket.on('getUsers', async () => {
    try {
      const allUsers = await getAllUsers(socket.userId);
      socket.emit('allUsers', allUsers);
    } catch(err) { console.error('[DB] getUsers error:', err.message); }
  });

  socket.on('sendFriendRequest', async ({ receiverId }) => {
    try {
      await sendFriendRequest(socket.userId, receiverId);
      const receiverSocket = Object.values(users).find(u => u.userId === receiverId);
      if (receiverSocket) {
        io.to(receiverSocket.id).emit('friendRequestUpdate');
      }
      socket.emit('friendRequestSent');
    } catch(err) { console.error('[DB] sendFriendRequest error:', err.message); }
  });

  socket.on('getFriendRequests', async () => {
    try {
      const requests = await getFriendRequests(socket.userId);
      socket.emit('friendRequests', requests);
    } catch(err) { console.error('[DB] getFriendRequests error:', err.message); }
  });

  socket.on('respondFriendRequest', async ({ requestId, status }) => {
    try {
      const senderId = await respondFriendRequest(requestId, socket.userId, status);
      socket.emit('friendRequestUpdate');
      socket.emit('friendsUpdate');
      if (senderId) {
        const senderSocket = Object.values(users).find(u => u.userId === senderId);
        if (senderSocket) {
          io.to(senderSocket.id).emit('friendRequestUpdate');
          io.to(senderSocket.id).emit('friendsUpdate');
        }
      }
    } catch(err) { console.error('[DB] respondFriendRequest error:', err.message); }
  });

  socket.on('getFriends', async () => {
    try {
      const friends = await getFriends(socket.userId);
      socket.emit('friendsList', friends);
    } catch(err) { console.error('[DB] getFriends error:', err.message); }
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (socket.username && socket.room) {
      delete users[socket.id];
      socket.to(socket.room).emit('userEvent', {
        type: 'leave',
        username: socket.username,
        timestamp: new Date().toISOString(),
      });
      io.to(socket.room).emit('userList', getRoomUsers(socket.room));
      console.log(`[-] ${socket.username} disconnected`);
    }
  });
});

// ── Start Server ─────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Talq server running at http://localhost:${PORT}\n`);
});
