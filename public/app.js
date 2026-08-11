/* ─────────────────────────────────────────────────────────
   Talq — Client-side Application
   Auth (JWT) + Socket.io real-time chat
   ───────────────────────────────────────────────────────── */

(() => {
  'use strict';

  // ── DOM References ──────────────────────────────────────
  const joinScreen        = document.getElementById('joinScreen');
  const chatApp           = document.getElementById('chatApp');
  const joinForm          = document.getElementById('joinForm');
  const usernameInput     = document.getElementById('usernameInput');
  const passwordInput     = document.getElementById('passwordInput');
  const passwordConfirmGroup = document.getElementById('passwordConfirmGroup');
  const passwordConfirmInput = document.getElementById('passwordConfirmInput');
  const passwordToggle    = document.getElementById('passwordToggle');
  const eyeOpen           = document.getElementById('eyeOpen');
  const eyeClosed         = document.getElementById('eyeClosed');
  const dmList            = document.getElementById('dmList');
  const loginError        = document.getElementById('loginError');
  const joinBtn           = document.getElementById('joinBtn');
  const joinBtnText       = document.getElementById('joinBtnText');
  const joinBtnArrow      = document.getElementById('joinBtnArrow');
  const joinBtnSpinner    = document.getElementById('joinBtnSpinner');
  const toggleAuthBtn     = document.getElementById('toggleAuthBtn');
  const toggleTextSpan    = document.getElementById('toggleTextSpan');
  const joinTitle         = document.querySelector('.join-title');
  const joinSubtitle      = document.querySelector('.join-subtitle');
  const messagesInner     = document.getElementById('messagesInner');
  const messageForm       = document.getElementById('messageForm');
  const messageInput      = document.getElementById('messageInput');
  const sendBtn           = document.getElementById('sendBtn');
  const typingBar         = document.getElementById('typingBar');
  const userListEl        = document.getElementById('userList');
  const onlineCount       = document.getElementById('onlineCount');
  const currentRoomName   = document.getElementById('currentRoomName');
  const headerSubtitle    = document.getElementById('headerSubtitle');
  const currentUserName   = document.getElementById('currentUserName');
  const currentUserAvatar = document.getElementById('currentUserAvatar');
  const roomListEl        = document.getElementById('roomList');
  const connectionIndicator = document.getElementById('connectionIndicator');
  const connectionText    = document.getElementById('connectionText');
  const logoutBtn         = document.getElementById('logoutBtn');
  const menuBtn           = document.getElementById('menuBtn');
  const sidebar           = document.getElementById('sidebar');
  const emojiBtn          = document.getElementById('emojiBtn');
  const emojiPicker       = document.getElementById('emojiPicker');
  const toast             = document.getElementById('toast');
  const themeToggleBtn    = document.getElementById('themeToggleBtn');
  const iconMoon          = document.getElementById('iconMoon');
  const iconSun           = document.getElementById('iconSun');

  const navFriendsBtn     = document.getElementById('navFriendsBtn');
  const friendsDashboard  = document.getElementById('friendsDashboard');
  const chatHeader        = document.getElementById('chatHeader');
  const messagesArea      = document.getElementById('messagesArea');

  const chatFooter        = document.getElementById('chatFooter');
  const dashOnlineList    = document.getElementById('dashOnlineList');
  const dashOfflineList   = document.getElementById('dashOfflineList');
  const dashOnlineCount   = document.getElementById('dashOnlineCount');
  const dashOfflineCount  = document.getElementById('dashOfflineCount');
  const friendsModal      = document.getElementById('friendsModal');
  const closeFriendsModal = document.getElementById('closeFriendsModal');
  const tabBtns           = document.querySelectorAll('.tab-btn');
  const tabContents       = document.querySelectorAll('.tab-content');
  const friendsList       = document.getElementById('friendsList');
  const allUsersList      = document.getElementById('allUsersList');
  const requestsList      = document.getElementById('requestsList');
  const reqBadge          = document.getElementById('reqBadge');

  // ── Theme Toggle ─────────────────────────────────────────
  const html = document.documentElement;
  applyTheme(localStorage.getItem('talq-theme') || 'dark');

  themeToggleBtn.addEventListener('click', () => {
    applyTheme(html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  });

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('talq-theme', theme);
    iconMoon.style.display = theme === 'dark' ? '' : 'none';
    iconSun.style.display  = theme === 'dark' ? 'none' : '';
  }

  // ── State ────────────────────────────────────────────────
  let socket;
  let myUsername  = '';
  let myUserId = '';
  let currentRoom = null;
  let typingTimer = null;
  let isTyping    = false;
  let typingUsers = new Set();

  // ── Avatar Colors ────────────────────────────────────────
  const avatarColors = [
    'linear-gradient(135deg,#7c3aed,#3b82f6)',
    'linear-gradient(135deg,#ec4899,#8b5cf6)',
    'linear-gradient(135deg,#f59e0b,#ef4444)',
    'linear-gradient(135deg,#10b981,#3b82f6)',
    'linear-gradient(135deg,#06b6d4,#6366f1)',
    'linear-gradient(135deg,#f97316,#eab308)',
    'linear-gradient(135deg,#84cc16,#22c55e)',
    'linear-gradient(135deg,#e879f9,#f43f5e)',
  ];

  function getAvatarColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
  }

  function getInitials(name) { return name.slice(0, 2).toUpperCase(); }

  // ── Toast ────────────────────────────────────────────────
  let toastTimer;
  function showToast(msg, duration = 3000) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), duration);
  }

  // ── Password Visibility Toggle ───────────────────────────
  passwordToggle.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    eyeOpen.style.display   = isHidden ? 'none' : '';
    eyeClosed.style.display = isHidden ? '' : 'none';
  });

  // Clear error on typing
  usernameInput.addEventListener('input', clearLoginError);
  passwordInput.addEventListener('input', clearLoginError);

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove('hidden');
    loginError.classList.add('shake');
    setTimeout(() => loginError.classList.remove('shake'), 500);
  }

  function clearLoginError() {
    loginError.textContent = '';
    loginError.classList.add('hidden');
  }

  function setLoginLoading(loading) {
    joinBtn.disabled = loading;
    joinBtnText.textContent = loading ? 'Signing in…' : 'Sign In';
    joinBtnArrow.style.display   = loading ? 'none' : '';
    joinBtnSpinner.classList.toggle('hidden', !loading);
    if (loading) joinBtnSpinner.classList.add('spin');
    else joinBtnSpinner.classList.remove('spin');
  }

  // ── Auth Mode Toggle ─────────────────────────────────────
  let isSignup = false;
  toggleAuthBtn.addEventListener('click', (e) => {
    e.preventDefault();
    isSignup = !isSignup;
    if (isSignup) {
      joinTitle.textContent = 'Create an account';
      joinSubtitle.textContent = 'Sign up to get started';
      joinBtnText.textContent = 'Sign Up';
      toggleAuthBtn.textContent = 'Sign in';
      toggleTextSpan.textContent = 'Already have an account? ';
      passwordConfirmGroup.classList.remove('hidden');
      passwordConfirmInput.setAttribute('required', 'true');
    } else {
      joinTitle.textContent = 'Welcome back';
      joinSubtitle.textContent = 'Sign in to start chatting';
      joinBtnText.textContent = 'Sign In';
      toggleAuthBtn.textContent = 'Sign up';
      toggleTextSpan.textContent = 'Don\'t have an account? ';
      passwordConfirmGroup.classList.add('hidden');
      passwordConfirmInput.removeAttribute('required');
    }
    clearLoginError();
  });

  // ── Auto-login if token exists ───────────────────────────
  window.addEventListener('DOMContentLoaded', () => {
    const savedToken    = localStorage.getItem('talq-token');
    const savedUsername = localStorage.getItem('talq-username');
    const savedUserId   = localStorage.getItem('talq-userId');
    if (savedToken && savedUsername && savedUserId && savedUserId !== 'null') {
      myUsername = savedUsername;
      myUserId = savedUserId;
      launchChat(savedToken);
    } else {
      // Force re-login if any data is missing
      localStorage.removeItem('talq-token');
      localStorage.removeItem('talq-username');
      localStorage.removeItem('talq-userId');
      usernameInput.focus();
    }
  });

  // ── Login / Signup Form Submit ───────────────────────────
  joinForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;
    const confirmPassword = passwordConfirmInput.value;

    if (!username || !password) return;

    if (isSignup && password !== confirmPassword) {
      showLoginError('Passwords do not match.');
      return;
    }

    clearLoginError();
    setLoginLoading(true);

    const endpoint = isSignup ? '/api/signup' : '/api/login';

    try {
      const res  = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        showLoginError(data.error || 'Authentication failed. Please try again.');
        return;
      }

      // Persist token and ID
      localStorage.setItem('talq-token',    data.token);
      localStorage.setItem('talq-username', data.username);
      localStorage.setItem('talq-userId',   data.id);
      myUsername = data.username;
      myUserId = data.id;

      // Start without a default room so they pick a DM channel
      currentRoom = null;
      currentRoomName.textContent = 'Welcome! Select a channel.';
      messagesInner.innerHTML = '';

      launchChat(data.token);
    } catch {
      showLoginError('Network error. Is the server running?');
    } finally {
      setLoginLoading(false);
    }
  });

  // ── Launch Chat UI ───────────────────────────────────────
  function launchChat(token) {
    currentRoom = null;

    // Update sidebar user info
    currentUserName.textContent    = myUsername;
    currentUserAvatar.textContent  = getInitials(myUsername);
    currentUserAvatar.style.background = getAvatarColor(myUsername);

    // Switch screens
    joinScreen.classList.add('hidden');
    chatApp.classList.remove('hidden');

    document.title = `Talq — ${myUsername}`;

    switchView('friends');

    initSocket(token);
  }

  // ── Socket.io ────────────────────────────────────────────
  function initSocket(token) {
    // Disconnect any previous socket
    if (socket) { socket.disconnect(); socket = null; }

    socket = io({ auth: { token } });
    
    socket.on('connect', () => {
      setConnectionStatus(true);
      if (currentRoom) {
        socket.emit('join', { room: currentRoom });
      }
      
      // Load friends and requests on initial connect to populate sidebar & badge
      socket.emit('getFriends');
      socket.emit('getFriendRequests');
    });

    socket.on('connect_error', (err) => {
      setConnectionStatus(false);
      if (err.message === 'AUTH_REQUIRED' || err.message === 'AUTH_INVALID') {
        // Token expired/invalid — force logout
        doLogout();
        showLoginError('Session expired. Please sign in again.');
      }
    });

    socket.on('disconnect', () => {
      setConnectionStatus(false);
      showToast('⚠️ Connection lost. Reconnecting…');
    });

    socket.on('reconnect', () => {
      setConnectionStatus(true);
      socket.emit('join', { room: currentRoom });
      showToast('✅ Reconnected!');
    });

    socket.on('history', (msgs) => {
      msgs.forEach(msg => renderMessage(msg, false));
      scrollToBottom();
    });

    socket.on('chatMessage', (msg) => {
      const isOwn = msg.username === myUsername;
      renderMessage(msg, !isOwn);
      if (!isOwn) typingUsers.delete(msg.username);
      updateTypingBar();
      scrollToBottom();
      if (!isOwn && document.hidden) showToast(`💬 ${msg.username}: ${msg.message.slice(0, 40)}`);
    });

    socket.on('userEvent', ({ type, username }) => {
      renderEvent(type === 'join' ? `${username} joined the room` : `${username} left the room`);
      scrollToBottom();
    });

    socket.on('userList', (users) => renderUserList(users));

    socket.on('typing', ({ username }) => {
      if (username !== myUsername) { typingUsers.add(username); updateTypingBar(); }
    });

    socket.on('stopTyping', ({ username }) => {
      typingUsers.delete(username); updateTypingBar();
    });

    // ── Friends Events ──
    socket.on('allUsers', renderAllUsers);
    socket.on('searchResults', renderAllUsers);
    socket.on('friendRequests', renderFriendRequests);
    socket.on('friendsList', renderFriendsList);

    socket.on('friendRequestUpdate', () => {
      socket.emit('getFriendRequests');
      showToast('You have a new friend request update!');
    });
    
    socket.on('onlineStatusChanged', (data) => {
      socket.emit('getFriends');
    });

    socket.on('friendsUpdate', () => {
      socket.emit('getFriends');
    });

    socket.on('friendRequestSent', () => {
      showToast('Friend request sent!');
    });
  }

  function setConnectionStatus(connected) {
    connectionIndicator.className = 'connection-indicator ' + (connected ? 'connected' : 'disconnected');
    connectionText.textContent = connected ? 'Connected' : 'Disconnected';
  }

  // ── Render Message ───────────────────────────────────────
  function renderMessage(msg, animate = true) {
    const welcomeMsg = document.getElementById('welcomeMsg');
    if (welcomeMsg) welcomeMsg.style.display = 'none';

    const isOwn   = msg.username === myUsername;
    const group   = document.createElement('div');
    group.className = `msg-group ${isOwn ? 'own' : 'other'}`;
    if (!animate) group.style.animation = 'none';

    const time     = formatTime(msg.timestamp);
    const initials = getInitials(msg.username);
    const color    = getAvatarColor(msg.username);
    const escaped  = escapeHtml(msg.message).replace(/\n/g, '<br>');

    group.innerHTML = `
      <div class="msg-meta">
        <div class="msg-avatar" style="background:${color}">${initials}</div>
        ${isOwn ? '' : `<span class="msg-username">${escapeHtml(msg.username)}</span>`}
        <span class="msg-time">${time}</span>
      </div>
      <div class="msg-bubble">${escaped}</div>
    `;
    messagesInner.appendChild(group);
  }

  function renderEvent(text) {
    const el = document.createElement('div');
    el.className = 'event-msg';
    el.textContent = text;
    messagesInner.appendChild(el);
  }

  // ── User List ────────────────────────────────────────────
  function renderUserList(users) {
    userListEl.innerHTML = '';
    onlineCount.textContent = users.length;
    headerSubtitle.textContent = `${users.length} member${users.length !== 1 ? 's' : ''} online`;

    users.forEach(u => {
      const li = document.createElement('li');
      li.className = 'user-item';
      const color = getAvatarColor(u.username);
      li.innerHTML = `
        <div class="user-avatar-sm" style="background:${color}">${getInitials(u.username)}</div>
        <span>${escapeHtml(u.username)}${u.username === myUsername ? ' (you)' : ''}</span>
      `;
      userListEl.appendChild(li);
    });
  }

  // ── Typing Indicator ─────────────────────────────────────
  function updateTypingBar() {
    const names = [...typingUsers];
    if (!names.length) { typingBar.innerHTML = ''; return; }

    const label = names.length === 1
      ? `${names[0]} is typing`
      : names.length === 2
      ? `${names[0]} and ${names[1]} are typing`
      : `${names.length} people are typing`;

    typingBar.innerHTML = `
      <div class="typing-dots"><span></span><span></span><span></span></div>
      <span>${label}…</span>
    `;
  }

  // ── Message Input ────────────────────────────────────────
  messageInput.addEventListener('input', () => {
    const val = messageInput.value;
    sendBtn.disabled = !val.trim();
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';

    if (val && !isTyping) {
      isTyping = true;
      socket && socket.emit('typing', { room: currentRoom });
    }
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      isTyping = false;
      socket && socket.emit('stopTyping', { room: currentRoom });
    }, 2000);
  });

  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!sendBtn.disabled) messageForm.dispatchEvent(new Event('submit'));
    }
  });

  messageForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message || !socket) return;

    socket.emit('chatMessage', { message, room: currentRoom });
    messageInput.value = '';
    messageInput.style.height = 'auto';
    sendBtn.disabled = true;
    isTyping = false;
    clearTimeout(typingTimer);
    socket.emit('stopTyping', { room: currentRoom });
    messageInput.focus();
  });

  // ── Room Joining (Shared) ────────────────────────────────
  function joinRoom(room, displayName) {
    if (room === currentRoom) return;

    currentRoom = room;
    switchView('chat');
    document.querySelector(`.room-item[data-room="${room}"]`)?.classList.add('active');

    currentRoomName.textContent = displayName;
    headerSubtitle.textContent = 'Switching room…';
    typingUsers.clear();
    updateTypingBar();

    messagesInner.innerHTML = '<div class="welcome-msg" id="welcomeMsg"><div class="welcome-icon">👋</div><p>Welcome! Say something to start the conversation.</p></div>';

    socket && socket.emit('join', { room });
    closeSidebarFn();
    showToast(`📍 Joined ${displayName}`);
  }


  function switchView(view) {
    document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
    
    if (view === 'friends') {
      friendsDashboard.classList.remove('hidden');
      chatHeader.classList.add('hidden');
      messagesArea.classList.add('hidden');
      typingBar.classList.add('hidden');
      chatFooter.classList.add('hidden');
      if (navFriendsBtn) navFriendsBtn.classList.add('active');
    } else {
      friendsDashboard.classList.add('hidden');
      chatHeader.classList.remove('hidden');
      messagesArea.classList.remove('hidden');
      typingBar.classList.remove('hidden');
      chatFooter.classList.remove('hidden');
    }
  }

  if (navFriendsBtn) {
    navFriendsBtn.addEventListener('click', () => {
      currentRoom = null;
      switchView('friends');
    });
  }

  // ── Room Selection (Global) ──────────────────────────────
  document.querySelectorAll('#roomList .room-item').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.add('active');
      const room = el.getAttribute('data-room');
      joinRoom(room, room);
    });
  });

  // ── Room Selection (DMs) ─────────────────────────────────
  dmList.addEventListener('click', (e) => {
    const li = e.target.closest('.room-item');
    if (!li) return;
    li.classList.add('active');
    
    const friendId = li.getAttribute('data-friend-id');
    const friendName = li.getAttribute('data-friend-name');
    const dmRoomId = 'dm_' + [myUserId, friendId].sort().join('_');
    
    joinRoom(dmRoomId, '@' + friendName);
  });

  // ── Emoji Picker ─────────────────────────────────────────
  emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('hidden');
  });

  emojiPicker.addEventListener('click', (e) => {
    const emoji = e.target.textContent;
    if (!emoji) return;
    const pos = messageInput.selectionStart;
    const val = messageInput.value;
    messageInput.value = val.slice(0, pos) + emoji + val.slice(pos);
    messageInput.dispatchEvent(new Event('input'));
    messageInput.focus();
    messageInput.selectionStart = messageInput.selectionEnd = pos + emoji.length;
    emojiPicker.classList.add('hidden');
  });

  document.addEventListener('click', () => emojiPicker.classList.add('hidden'));

  // ── Sidebar Toggle ────────────────────────────────────────
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  document.body.appendChild(overlay);

  function openSidebarFn()   { sidebar.classList.add('open'); overlay.classList.add('show'); }
  function closeSidebarFn()  { sidebar.classList.remove('open'); overlay.classList.remove('show'); }
  function toggleSidebarFn() { sidebar.classList.contains('open') ? closeSidebarFn() : openSidebarFn(); }

  menuBtn.addEventListener('click', toggleSidebarFn);
  overlay.addEventListener('click', closeSidebarFn);

  // ── Logout ────────────────────────────────────────────────
  logoutBtn.addEventListener('click', () => {
    if (confirm('Sign out of Talq?')) doLogout();
  });

  function doLogout() {
    socket && socket.disconnect();
    socket = null;

    localStorage.removeItem('talq-token');
    localStorage.removeItem('talq-username');
    localStorage.removeItem('talq-userId');
    myUsername  = '';
    myUserId = '';
    currentRoom = null;
    typingUsers.clear();

    messagesInner.innerHTML = '<div class="welcome-msg" id="welcomeMsg"><div class="welcome-icon">👋</div><p>Welcome! Say something to start the conversation.</p></div>';
    document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
    document.querySelector('.room-item[data-room="General"]')?.classList.add('active');

    chatApp.classList.add('hidden');
    joinScreen.classList.remove('hidden');
    usernameInput.value  = '';
    passwordInput.value  = '';
    passwordInput.type   = 'password';
    eyeOpen.style.display   = '';
    eyeClosed.style.display = 'none';
    clearLoginError();
    document.title = 'Talq — Sign In';

    setTimeout(() => usernameInput.focus(), 100);
  }

  // ── Helpers ───────────────────────────────────────────────
  function scrollToBottom() {
    const area = document.getElementById('messagesArea');
    area.scrollTo({ top: area.scrollHeight, behavior: 'smooth' });
  }

  function formatTime(iso) {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ── Friends Modal Logic ─────────────────────────────────

  const openAddFriendModalDash = document.getElementById('openAddFriendModalDash');
  const openAddFriendModalTop = document.getElementById('openAddFriendModalTop');

  function openFriendsModal() {
    friendsModal.classList.remove('hidden');
    // Switch to the 'Find Users' tab automatically
    document.querySelector('.tab-btn[data-tab="addFriends"]').click();
  }

  if (openAddFriendModalDash) {
    openAddFriendModalDash.addEventListener('click', openFriendsModal);
  }
  if (openAddFriendModalTop) {
    openAddFriendModalTop.addEventListener('click', openFriendsModal);
  }

  closeFriendsModal.addEventListener('click', () => {
    friendsModal.classList.add('hidden');
  });

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active', 'hidden'));
      tabContents.forEach(c => c.classList.add('hidden'));

      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab).classList.remove('hidden');
      document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
  });

  function renderAllUsers(users) {
    allUsersList.innerHTML = '';
    if (!users.length) {
      allUsersList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No other users found.</p>';
      return;
    }
    users.forEach(u => {
      const li = document.createElement('li');
      li.className = 'user-list-item';
      li.innerHTML = `
        <div class="user-info-large">
          <div class="user-avatar-sm" style="background:${getAvatarColor(u.username)}">${getInitials(u.username)}</div>
          <div class="user-info-text">
            <h4>${escapeHtml(u.username)}</h4>
            <p>ID: ${u.id.substring(0, 8)}...</p>
          </div>
        </div>
        <button class="action-btn" onclick="sendFriendReq('${u.id}', this)">Add Friend</button>
      `;
      allUsersList.appendChild(li);
    });
  }

  const userSearchBtn = document.getElementById('userSearchBtn');
  const userSearchInput = document.getElementById('userSearchInput');
  if (userSearchBtn && userSearchInput) {
    userSearchBtn.addEventListener('click', () => {
      const query = userSearchInput.value.trim();
      if (socket && query) {
        socket.emit('searchUsers', { query });
      } else {
        renderAllUsers([]);
      }
    });

    userSearchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        userSearchBtn.click();
      }
    });
  }

  window.sendFriendReq = function(receiverId, btn) {
    if (socket) socket.emit('sendFriendRequest', { receiverId });
    if (btn) {
      btn.textContent = 'Sent';
      btn.disabled = true;
      btn.style.opacity = '0.5';
      btn.style.cursor = 'default';
    }
  };

  function renderFriendRequests(requests) {
    requestsList.innerHTML = '';
    reqBadge.textContent = requests.length;
    reqBadge.classList.toggle('hidden', requests.length === 0);

    if (!requests.length) {
      requestsList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">No pending requests.</p>';
      return;
    }
    requests.forEach(req => {
      const li = document.createElement('li');
      li.className = 'user-list-item';
      li.innerHTML = `
        <div class="user-info-large">
          <div class="user-avatar-sm" style="background:${getAvatarColor(req.sender_username)}">${getInitials(req.sender_username)}</div>
          <div class="user-info-text">
            <h4>${escapeHtml(req.sender_username)}</h4>
            <p>Wants to be friends</p>
          </div>
        </div>
        <div style="display:flex;gap:6px;">
          <button class="action-btn" onclick="respondReq('${req.request_id}', 'accepted')">Accept</button>
          <button class="action-btn danger" onclick="respondReq('${req.request_id}', 'rejected')">Reject</button>
        </div>
      `;
      requestsList.appendChild(li);
    });

    if (dashOnlineCount) dashOnlineCount.textContent = onlineCount;
    if (dashOfflineCount) dashOfflineCount.textContent = offlineCount;

    document.querySelectorAll('.dash-friend-item .dm-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const friendId = btn.getAttribute('data-friend-id');
        const friendName = btn.getAttribute('data-friend-name');
        const dmRoomId = 'dm_' + [myUserId, friendId].sort().join('_');
        joinRoom(dmRoomId, '@' + friendName);
      });
    });
  }

  window.respondReq = function(requestId, status) {

    if (socket) socket.emit('respondFriendRequest', { requestId, status });
  };

  function renderFriendsList(friends) {
    if (friendsList) friendsList.innerHTML = '';
    if (dashOnlineList) dashOnlineList.innerHTML = '';
    if (dashOfflineList) dashOfflineList.innerHTML = '';
    dmList.innerHTML = '';
    let onlineCount = 0;
    let offlineCount = 0;

    if (!friends.length) {
      if (dashOfflineList) {
        dashOfflineList.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:20px;">You have no friends yet.</p>';
      }
      return;
    }
    
    friends.forEach(f => {
      // 1. Dashboard Item
      const dLi = document.createElement('li');
      dLi.className = 'dash-friend-item';
      dLi.innerHTML = `
        <div class="user-info-large">
          <div class="user-avatar-sm" style="background:${getAvatarColor(f.username)}">${getInitials(f.username)}
            ${f.isOnline ? '<span class="status-dot online"></span>' : '<span class="status-dot offline"></span>'}
          </div>
          <div class="user-info-text dash-friend-info">
            <h4>${escapeHtml(f.username)}</h4>
            <p class="${f.isOnline ? 'text-online' : 'text-offline'}">${f.isOnline ? 'Online' : 'Offline'}</p>
          </div>
        </div>
        <div class="dash-friend-actions">
          <button class="icon-btn dm-btn" data-friend-id="${f.id}" data-friend-name="${f.username}" title="Message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          </button>
        </div>
      `;
      
      if (f.isOnline) {
        if (dashOnlineList) dashOnlineList.appendChild(dLi);
        onlineCount++;
      } else {
        if (dashOfflineList) dashOfflineList.appendChild(dLi);
        offlineCount++;
      }

      // Optional Modal Item
      if (friendsList) {
        const li = document.createElement('li');
        li.className = 'user-list-item';
        li.innerHTML = `
          <div class="user-info-large">
            <div class="user-avatar-sm" style="background:${getAvatarColor(f.username)}">${getInitials(f.username)}</div>
            <div class="user-info-text">
              <h4>${escapeHtml(f.username)}</h4>
              <p>ID: ${f.id.substring(0, 8)}...</p>
            </div>
          </div>
        `;
        friendsList.appendChild(li);
      }

      // 2. Sidebar DM Accordion
      const friendGroup = document.createElement('div');
      friendGroup.className = 'friend-group';

      const friendHeader = document.createElement('div');
      friendHeader.className = 'friend-header';
      friendHeader.innerHTML = `
        <div class="user-avatar-xs" style="background:${getAvatarColor(f.username)}; color:white; width:20px; height:20px; font-size:10px; display:flex; align-items:center; justify-content:center; border-radius:50%;">${getInitials(f.username)}</div>
        <span>${escapeHtml(f.username)}</span>
        <span class="chevron" style="margin-left:auto; transition: transform 0.2s;">▼</span>
      `;

      const channelsContainer = document.createElement('div');
      channelsContainer.className = 'friend-channels';

      const channels = ['General', 'Tech', 'Gaming', 'Music', 'Random'];
      
      let hasActiveChannel = false;
      channels.forEach(ch => {
        const expectedRoomId = 'dm_' + [myUserId, f.id].sort().join('_') + '_' + ch.toLowerCase();
        const chEl = document.createElement('div');
        chEl.className = 'friend-channel-item';
        if (currentRoom === expectedRoomId) {
          chEl.classList.add('active');
          hasActiveChannel = true;
        }
        chEl.innerHTML = `<span class="room-icon">#</span><span>${ch}</span>`;
        
        chEl.addEventListener('click', () => {
          document.querySelectorAll('.friend-channel-item').forEach(el => el.classList.remove('active'));
          chEl.classList.add('active');
          joinRoom(expectedRoomId, `@${f.username} - #${ch}`);
        });
        
        channelsContainer.appendChild(chEl);
      });

      if (hasActiveChannel) {
        friendHeader.classList.add('expanded');
        channelsContainer.classList.add('open');
        friendHeader.querySelector('.chevron').style.transform = 'rotate(-180deg)';
      }

      friendHeader.addEventListener('click', () => {
        const isOpen = channelsContainer.classList.contains('open');
        if (isOpen) {
          channelsContainer.classList.remove('open');
          friendHeader.classList.remove('expanded');
          friendHeader.querySelector('.chevron').style.transform = 'rotate(0deg)';
        } else {
          channelsContainer.classList.add('open');
          friendHeader.classList.add('expanded');
          friendHeader.querySelector('.chevron').style.transform = 'rotate(-180deg)';
        }
      });

      friendGroup.appendChild(friendHeader);
      friendGroup.appendChild(channelsContainer);
      dmList.appendChild(friendGroup);
    });
  }

})();
