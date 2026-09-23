import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, serverUrl } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?.token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setSocket(null);
      setIsConnected(false);
      setFriends([]);
      setFriendRequests([]);
      return;
    }

    console.log(`[SOCKET] Connecting to ${serverUrl} as user ${user.username}`);
    const s = io(serverUrl, {
      auth: { token: user.token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      console.log('[SOCKET] Connected with ID:', s.id);
      setIsConnected(true);
      s.emit('getFriends');
      s.emit('getFriendRequests');
    });

    s.on('disconnect', (reason) => {
      console.log('[SOCKET] Disconnected:', reason);
      setIsConnected(false);
    });

    s.on('connect_error', (err) => {
      console.warn('[SOCKET] Connection error:', err.message);
      setIsConnected(false);
    });

    s.on('friendsList', (list) => {
      setFriends(Array.isArray(list) ? list : []);
    });

    s.on('friendRequests', (list) => {
      setFriendRequests(Array.isArray(list) ? list : []);
    });

    s.on('searchResults', (results) => {
      setSearchResults(Array.isArray(results) ? results : []);
    });

    s.on('onlineStatusChanged', () => {
      s.emit('getFriends');
    });

    s.on('friendRequestUpdate', () => {
      s.emit('getFriendRequests');
    });

    s.on('friendsUpdate', () => {
      s.emit('getFriends');
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
    };
  }, [user?.token, serverUrl]);

  const refreshFriends = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('getFriends');
    }
  };

  const refreshRequests = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('getFriendRequests');
    }
  };

  const searchUsers = (query) => {
    if (socketRef.current?.connected && query.trim()) {
      socketRef.current.emit('searchUsers', { query: query.trim() });
    } else {
      setSearchResults([]);
    }
  };

  const sendFriendRequest = (receiverId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('sendFriendRequest', { receiverId });
    }
  };

  const respondFriendRequest = (requestId, status) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('respondFriendRequest', { requestId, status });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        friends,
        friendRequests,
        searchResults,
        refreshFriends,
        refreshRequests,
        searchUsers,
        sendFriendRequest,
        respondFriendRequest,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
