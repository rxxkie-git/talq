import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getAvatarColor, getInitials } from '../utils/avatar';

export default function ChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { room, title, targetUser, channel, isOnline: initialOnline } = route.params;
  const { user } = useAuth();
  const { socket, isConnected, friends } = useSocket();

  // Dynamically track target user's live online status from socket
  const targetFriend = friends.find((f) => f.username === targetUser);
  const isTargetOnline = targetFriend ? !!targetFriend.isOnline : !!initialOnline;

  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    // Join room immediately
    console.log(`[CHAT] Joining room: ${room}`);
    socket.emit('join', { room });

    // Handle historical messages from DB
    const handleHistory = (history) => {
      console.log(`[CHAT] History received for ${room}:`, history?.length);
      setMessages(Array.isArray(history) ? history : []);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    };

    // Handle incoming real-time chat messages
    const handleChatMessage = (msg) => {
      console.log(`[CHAT] Received message in room ${msg.room}:`, msg);
      if (msg.room === room) {
        setMessages((prev) => {
          // Replace matching optimistic temp message if sent by us
          const tempIndex = prev.findIndex(
            (m) =>
              String(m.id).startsWith('temp_') &&
              m.message === msg.message &&
              m.username === msg.username
          );
          if (tempIndex !== -1) {
            const next = [...prev];
            next[tempIndex] = msg;
            return next;
          }
          // Avoid duplicate
          if (prev.some((m) => m.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        });
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      }
    };

    // Re-join on socket reconnection
    const handleReconnect = () => {
      console.log(`[CHAT] Re-joined room on connect: ${room}`);
      socket.emit('join', { room });
    };

    // Typing indicators
    const handleTyping = ({ username }) => {
      if (username !== user?.username) {
        setTypingUsers((prev) => new Set(prev).add(username));
      }
    };

    const handleStopTyping = ({ username }) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(username);
        return next;
      });
    };

    socket.on('history', handleHistory);
    socket.on('chatMessage', handleChatMessage);
    socket.on('connect', handleReconnect);
    socket.on('typing', handleTyping);
    socket.on('stopTyping', handleStopTyping);

    return () => {
      socket.off('history', handleHistory);
      socket.off('chatMessage', handleChatMessage);
      socket.off('connect', handleReconnect);
      socket.off('typing', handleTyping);
      socket.off('stopTyping', handleStopTyping);
      socket.emit('stopTyping', { room });
    };
  }, [socket, room]);

  const handleInputChange = (text) => {
    setInputText(text);

    if (socket) {
      socket.emit('typing', { room });

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stopTyping', { room });
      }, 1500);
    }
  };

  const handleSend = () => {
    const text = inputText.trim();
    if (!text || !socket) return;

    // 1. Optimistic message rendering so user sees bubble instantly
    const optimisticMsg = {
      id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      username: user.username,
      message: text,
      room: room,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);

    // 2. Emit to server
    socket.emit('chatMessage', { message: text, room });
    socket.emit('stopTyping', { room });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setInputText('');
  };

  const formatTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const typingArray = Array.from(typingUsers);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: isKeyboardVisible ? 0 : insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
        style={{ flex: 1 }}
      >
        {/* Chat Header matching Web */}
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#ffffff" />
          </TouchableOpacity>

          <View
            style={[
              styles.headerAvatar,
              { backgroundColor: getAvatarColor(targetUser || title) },
            ]}
          >
            <Text style={styles.headerAvatarText}>
              {getInitials(targetUser || title)}
            </Text>
            <View
              style={[
                styles.headerAvatarStatusDot,
                { backgroundColor: isTargetOnline ? '#22c55e' : '#525252' },
              ]}
            />
          </View>

          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.headerStatusRow}>
              <View
                style={[
                  styles.headerStatusDot,
                  { backgroundColor: isTargetOnline ? '#22c55e' : '#525252' },
                ]}
              />
              <Text
                style={[
                  styles.headerSubtext,
                  isTargetOnline ? styles.textOnline : styles.textOffline,
                ]}
              >
                {isTargetOnline ? 'Online' : 'Offline'}
              </Text>
            </View>
          </View>

          <View style={styles.connectionBadge}>
            <View
              style={[
                styles.connDot,
                { backgroundColor: isConnected ? '#22c55e' : '#eab308' },
              ]}
            />
            <Text style={styles.connText}>
              {isConnected ? 'Connected' : 'Connecting…'}
            </Text>
          </View>
        </View>

        {/* Message Area */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => item.id ? String(item.id) : String(index)}
          contentContainerStyle={styles.messageList}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.welcomeMsgBox}>
              <View style={styles.welcomeIconBox}>
                <Text style={{ fontSize: 28 }}>👋</Text>
              </View>
              <Text style={styles.welcomeMsgTitle}>Welcome!</Text>
              <Text style={styles.welcomeMsgSub}>
                Say something to start the conversation.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwn = item.username === user.username;
            return (
              <View
                style={[
                  styles.msgRow,
                  isOwn ? styles.msgRowOwn : styles.msgRowOther,
                ]}
              >
                {!isOwn && (
                  <View
                    style={[
                      styles.senderAvatar,
                      { backgroundColor: getAvatarColor(item.username) },
                    ]}
                  >
                    <Text style={styles.senderAvatarText}>
                      {getInitials(item.username)}
                    </Text>
                  </View>
                )}

                <View
                  style={[
                    styles.bubble,
                    isOwn ? styles.bubbleOwn : styles.bubbleOther,
                  ]}
                >
                  {!isOwn && (
                    <Text style={styles.senderName}>{item.username}</Text>
                  )}
                  <Text
                    style={[
                      styles.msgBody,
                      isOwn ? styles.msgBodyOwn : styles.msgBodyOther,
                    ]}
                  >
                    {item.message}
                  </Text>
                  <Text
                    style={[
                      styles.msgTime,
                      isOwn ? styles.msgTimeOwn : styles.msgTimeOther,
                    ]}
                  >
                    {formatTime(item.timestamp)}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        {/* Live Typing Bar Popup */}
        {typingArray.length > 0 && (
          <View style={styles.typingBar}>
            <View style={styles.typingDotsContainer}>
              <View style={[styles.typingDot, styles.dot1]} />
              <View style={[styles.typingDot, styles.dot2]} />
              <View style={[styles.typingDot, styles.dot3]} />
            </View>
            <Text style={styles.typingText}>
              {typingArray.join(', ')} {typingArray.length === 1 ? 'is' : 'are'} typing…
            </Text>
          </View>
        )}

        {/* Message Input matching Web */}
        <View style={styles.chatFooter}>
          <View style={styles.inputArea}>
            <TouchableOpacity style={styles.emojiBtn}>
              <Text style={{ fontSize: 18 }}>😊</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="Type a message…"
              placeholderTextColor="#525252"
              value={inputText}
              onChangeText={handleInputChange}
              multiline
              maxLength={500}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendBtn,
              !inputText.trim() && styles.sendBtnDisabled,
            ]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Ionicons name="send" size={16} color="#000000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#050505',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
    gap: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerAvatarText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  headerAvatarStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 1.5,
    borderColor: '#050505',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  headerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  headerStatusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerSubtext: {
    fontSize: 11,
    fontWeight: '500',
  },
  textOnline: {
    color: '#22c55e',
  },
  textOffline: {
    color: '#525252',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    gap: 5,
  },
  connDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  connText: {
    color: '#a3a3a3',
    fontSize: 10,
  },
  messageList: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  welcomeMsgBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  welcomeIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#171717',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  welcomeMsgTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  welcomeMsgSub: {
    color: '#a3a3a3',
    fontSize: 13,
    textAlign: 'center',
  },
  msgRow: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-end',
    gap: 8,
  },
  msgRowOwn: {
    justifyContent: 'flex-end',
  },
  msgRowOther: {
    justifyContent: 'flex-start',
  },
  senderAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  senderAvatarText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  bubble: {
    maxWidth: '78%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleOwn: {
    backgroundColor: '#262626',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#171717',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  senderName: {
    color: '#a3a3a3',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 2,
  },
  msgBody: {
    fontSize: 14,
    lineHeight: 19,
  },
  msgBodyOwn: {
    color: '#ffffff',
  },
  msgBodyOther: {
    color: '#e5e5e5',
  },
  msgTime: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  msgTimeOwn: {
    color: 'rgba(255, 255, 255, 0.5)',
  },
  msgTimeOther: {
    color: '#525252',
  },
  typingBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(23, 23, 23, 0.9)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  typingDotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#ffffff',
    opacity: 0.7,
  },
  typingText: {
    color: '#ffffff',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  chatFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#050505',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    gap: 8,
  },
  inputArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111111',
    borderRadius: 20,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  emojiBtn: {
    marginRight: 6,
    padding: 2,
  },
  textInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 9,
    maxHeight: 90,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#262626',
    opacity: 0.5,
  },
});
