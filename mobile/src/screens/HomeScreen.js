import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { getAvatarColor, getInitials } from '../utils/avatar';
import ServerModal from '../components/ServerModal';

const CHANNELS = ['General', 'Tech', 'Gaming', 'Music', 'Random'];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const {
    isConnected,
    friends,
    friendRequests,
    searchResults,
    refreshFriends,
    refreshRequests,
    searchUsers,
    sendFriendRequest,
    respondFriendRequest,
  } = useSocket();

  const [refreshing, setRefreshing] = useState(false);
  const [expandedFriends, setExpandedFriends] = useState({}); // { [friendId]: boolean }
  const [friendsModalVisible, setFriendsModalVisible] = useState(false);
  const [modalTab, setModalTab] = useState('addFriends'); // 'myFriends' | 'addFriends' | 'requests'
  const [searchQuery, setSearchQuery] = useState('');
  const [sentRequests, setSentRequests] = useState(new Set());
  const [showServerModal, setShowServerModal] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    refreshFriends();
    refreshRequests();
    setTimeout(() => setRefreshing(false), 800);
  };

  const toggleFriendAccordion = (friendId) => {
    setExpandedFriends((prev) => ({
      ...prev,
      [friendId]: !prev[friendId],
    }));
  };

  // Joins the exact same room ID format as the website sidebar
  const handleOpenChannel = (friend, channel) => {
    const dmRoomId =
      'dm_' +
      [String(user.id), String(friend.id)].sort().join('_') +
      '_' +
      channel.toLowerCase();

    navigation.navigate('Chat', {
      room: dmRoomId,
      title: `@${friend.username} - #${channel}`,
      targetUser: friend.username,
      channel: channel,
      isOnline: !!friend.isOnline,
    });
  };

  const handleSendFriendReq = (receiverId) => {
    sendFriendRequest(receiverId);
    setSentRequests((prev) => new Set(prev).add(receiverId));
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  const onlineFriends = friends.filter((f) => f.isOnline);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* ── TOP LOGO / BRAND ── */}
      <View style={styles.topHeader}>
        <View style={styles.brandRow}>
          <Text style={styles.brandEmoji}>🗣️</Text>
          <Text style={styles.brandTitle}>Talq</Text>
        </View>

        <TouchableOpacity
          style={styles.serverBtn}
          onPress={() => setShowServerModal(true)}
        >
          <Ionicons name="wifi" size={14} color="#a3a3a3" />
        </TouchableOpacity>
      </View>

      {/* ── MAIN SIDEBAR-STYLE SCROLL ── */}
      <ScrollView
        style={styles.mainScroll}
        contentContainerStyle={styles.mainScrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        }
      >
        {/* ── SECTION 1: NAVIGATION ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NAVIGATION</Text>

          <TouchableOpacity
            style={styles.navItem}
            onPress={() => {
              setModalTab('addFriends');
              setFriendsModalVisible(true);
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="people-outline" size={18} color="#ffffff" style={styles.navIcon} />
            <Text style={styles.navItemText}>Friends</Text>

            {friendRequests.length > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{friendRequests.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ── SECTION 2: DIRECT MESSAGES WITH ACCORDION CHANNELS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DIRECT MESSAGES</Text>

          {friends.length === 0 ? (
            <TouchableOpacity
              style={styles.noFriendsBox}
              onPress={() => {
                setModalTab('addFriends');
                setFriendsModalVisible(true);
              }}
            >
              <Text style={styles.noFriendsText}>
                No friends yet. Tap to add friends!
              </Text>
            </TouchableOpacity>
          ) : (
            friends.map((f) => {
              const isExpanded = !!expandedFriends[f.id];
              return (
                <View key={String(f.id)} style={styles.friendGroup}>
                  {/* Friend Header Row */}
                  <TouchableOpacity
                    style={styles.friendHeader}
                    onPress={() => toggleFriendAccordion(f.id)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.friendHeaderLeft}>
                      <View
                        style={[
                          styles.avatarXs,
                          { backgroundColor: getAvatarColor(f.username) },
                        ]}
                      >
                        <Text style={styles.avatarXsText}>
                          {getInitials(f.username)}
                        </Text>
                        <View
                          style={[
                            styles.miniOnlineDot,
                            { backgroundColor: f.isOnline ? '#22c55e' : '#525252' },
                          ]}
                        />
                      </View>
                      <Text style={styles.friendHeaderText}>{f.username}</Text>
                    </View>

                    <Text style={styles.chevronText}>
                      {isExpanded ? '▲' : '▼'}
                    </Text>
                  </TouchableOpacity>

                  {/* Accordion Channels Dropdown */}
                  {isExpanded && (
                    <View style={styles.channelsContainer}>
                      {CHANNELS.map((ch) => (
                        <TouchableOpacity
                          key={ch}
                          style={styles.channelItem}
                          onPress={() => handleOpenChannel(f, ch)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.channelHash}>#</Text>
                          <Text style={styles.channelName}>{ch}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* ── SECTION 3: ONLINE USERS ── */}
        <View style={styles.section}>
          <View style={styles.onlineHeaderRow}>
            <Text style={styles.sectionLabel}>ONLINE</Text>
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{onlineFriends.length + 1}</Text>
            </View>
          </View>

          {/* Current User "(you)" */}
          <View style={styles.onlineUserItem}>
            <View
              style={[
                styles.avatarSm,
                { backgroundColor: getAvatarColor(user?.username || '') },
              ]}
            >
              <Text style={styles.avatarSmText}>
                {getInitials(user?.username || '')}
              </Text>
              <View style={styles.userStatusDot} />
            </View>
            <Text style={styles.onlineUserName}>
              {user?.username} <Text style={styles.youText}>(you)</Text>
            </Text>
          </View>

          {/* Online Friends */}
          {onlineFriends.map((f) => (
            <TouchableOpacity
              key={String(f.id)}
              style={styles.onlineUserItem}
              onPress={() => toggleFriendAccordion(f.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.avatarSm,
                  { backgroundColor: getAvatarColor(f.username) },
                ]}
              >
                <Text style={styles.avatarSmText}>{getInitials(f.username)}</Text>
                <View style={styles.userStatusDot} />
              </View>
              <Text style={styles.onlineUserName}>{f.username}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* ── FOOTER: CURRENT USER PROFILE & ACTIONS ── */}
      <View style={styles.sidebarFooter}>
        <View style={styles.footerLeft}>
          <View
            style={[
              styles.avatarLg,
              { backgroundColor: getAvatarColor(user?.username || '') },
            ]}
          >
            <Text style={styles.avatarLgText}>
              {getInitials(user?.username || '')}
            </Text>
          </View>
          <View>
            <Text style={styles.footerName}>{user?.username}</Text>
            <View style={styles.footerStatusRow}>
              <View
                style={[
                  styles.footerDot,
                  { backgroundColor: isConnected ? '#ffffff' : '#eab308' },
                ]}
              />
              <Text style={styles.footerStatusText}>
                {isConnected ? 'Online' : 'Connecting…'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.footerActions}>
          <TouchableOpacity
            style={styles.footerIconBtn}
            onPress={handleLogout}
            title="Log out"
          >
            <Ionicons name="log-out-outline" size={20} color="#a3a3a3" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── FRIENDS & USERS MODAL (MATCHING WEBSITE MODAL) ── */}
      <Modal
        visible={friendsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFriendsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { paddingBottom: Math.max(insets.bottom, 20) },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Friends & Users</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setFriendsModalVisible(false)}
              >
                <Ionicons name="close" size={20} color="#a3a3a3" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalTabs}>
              <TouchableOpacity
                style={[
                  styles.modalTabBtn,
                  modalTab === 'myFriends' && styles.modalTabBtnActive,
                ]}
                onPress={() => setModalTab('myFriends')}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    modalTab === 'myFriends' && styles.modalTabTextActive,
                  ]}
                >
                  My Friends
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTabBtn,
                  modalTab === 'addFriends' && styles.modalTabBtnActive,
                ]}
                onPress={() => setModalTab('addFriends')}
              >
                <Text
                  style={[
                    styles.modalTabText,
                    modalTab === 'addFriends' && styles.modalTabTextActive,
                  ]}
                >
                  Find Users
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTabBtn,
                  modalTab === 'requests' && styles.modalTabBtnActive,
                ]}
                onPress={() => setModalTab('requests')}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text
                    style={[
                      styles.modalTabText,
                      modalTab === 'requests' && styles.modalTabTextActive,
                    ]}
                  >
                    Requests
                  </Text>
                  {friendRequests.length > 0 && (
                    <View style={styles.modalBadge}>
                      <Text style={styles.modalBadgeText}>{friendRequests.length}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              {modalTab === 'myFriends' && (
                <FlatList
                  data={friends}
                  keyExtractor={(item) => String(item.id)}
                  ListEmptyComponent={
                    <View style={styles.modalEmpty}>
                      <Text style={styles.modalEmptyText}>No friends added yet.</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.modalUserRow}>
                      <View style={styles.modalUserLeft}>
                        <View
                          style={[
                            styles.avatarSm,
                            { backgroundColor: getAvatarColor(item.username) },
                          ]}
                        >
                          <Text style={styles.avatarSmText}>
                            {getInitials(item.username)}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.modalUserName}>{item.username}</Text>
                          <Text style={styles.modalSubtext}>
                            {item.isOnline ? 'Online' : 'Offline'}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.modalActionBtn}
                        onPress={() => {
                          setFriendsModalVisible(false);
                          handleOpenChannel(item, 'General');
                        }}
                      >
                        <Text style={styles.modalActionBtnText}>Chat</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />
              )}

              {modalTab === 'addFriends' && (
                <View style={{ flex: 1 }}>
                  <View style={styles.modalSearchRow}>
                    <TextInput
                      style={styles.modalSearchInput}
                      placeholder="Search for users..."
                      placeholderTextColor="#525252"
                      value={searchQuery}
                      onChangeText={(t) => {
                        setSearchQuery(t);
                        searchUsers(t);
                      }}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.modalSearchBtn}
                      onPress={() => searchUsers(searchQuery)}
                    >
                      <Text style={styles.modalSearchBtnText}>Search</Text>
                    </TouchableOpacity>
                  </View>

                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => String(item.id)}
                    ListEmptyComponent={
                      <View style={styles.modalEmpty}>
                        <Text style={styles.modalEmptyText}>
                          {searchQuery
                            ? 'No users found matching query.'
                            : 'Type a username above to search.'}
                        </Text>
                      </View>
                    }
                    renderItem={({ item }) => {
                      const isSent = sentRequests.has(item.id);
                      return (
                        <View style={styles.modalUserRow}>
                          <View style={styles.modalUserLeft}>
                            <View
                              style={[
                                styles.avatarSm,
                                { backgroundColor: getAvatarColor(item.username) },
                              ]}
                            >
                              <Text style={styles.avatarSmText}>
                                {getInitials(item.username)}
                              </Text>
                            </View>
                            <View>
                              <Text style={styles.modalUserName}>{item.username}</Text>
                              <Text style={styles.modalSubtext}>
                                ID: {String(item.id).substring(0, 8)}...
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              styles.modalActionBtn,
                              isSent && styles.modalActionBtnSent,
                            ]}
                            onPress={() => handleSendFriendReq(item.id)}
                            disabled={isSent}
                          >
                            <Text
                              style={[
                                styles.modalActionBtnText,
                                isSent && styles.modalActionBtnTextSent,
                              ]}
                            >
                              {isSent ? 'Sent' : 'Add Friend'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    }}
                  />
                </View>
              )}

              {modalTab === 'requests' && (
                <FlatList
                  data={friendRequests}
                  keyExtractor={(item) => String(item.request_id)}
                  ListEmptyComponent={
                    <View style={styles.modalEmpty}>
                      <Text style={styles.modalEmptyText}>No pending friend requests.</Text>
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.modalUserRow}>
                      <View style={styles.modalUserLeft}>
                        <View
                          style={[
                            styles.avatarSm,
                            { backgroundColor: getAvatarColor(item.sender_username) },
                          ]}
                        >
                          <Text style={styles.avatarSmText}>
                            {getInitials(item.sender_username)}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.modalUserName}>{item.sender_username}</Text>
                          <Text style={styles.modalSubtext}>Wants to be friends</Text>
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', gap: 6 }}>
                        <TouchableOpacity
                          style={[styles.modalActionBtn, { backgroundColor: '#ffffff' }]}
                          onPress={() =>
                            respondFriendRequest(item.request_id, 'accepted')
                          }
                        >
                          <Text style={[styles.modalActionBtnText, { color: '#000000' }]}>
                            Accept
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.modalActionBtn,
                            { backgroundColor: '#262626' },
                          ]}
                          onPress={() =>
                            respondFriendRequest(item.request_id, 'rejected')
                          }
                        >
                          <Text style={[styles.modalActionBtnText, { color: '#a3a3a3' }]}>
                            Decline
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </View>
      </Modal>

      <ServerModal
        visible={showServerModal}
        onClose={() => setShowServerModal(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandEmoji: {
    fontSize: 22,
  },
  brandTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  serverBtn: {
    padding: 6,
  },
  mainScroll: {
    flex: 1,
  },
  mainScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  section: {
    marginTop: 18,
  },
  sectionLabel: {
    color: '#737373',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  navIcon: {
    marginRight: 10,
  },
  navItemText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
    flex: 1,
  },
  navBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 1,
  },
  navBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  noFriendsBox: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  noFriendsText: {
    color: '#525252',
    fontSize: 13,
  },
  friendGroup: {
    marginBottom: 4,
  },
  friendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  friendHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarXs: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  miniOnlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  avatarXsText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  friendHeaderText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '500',
  },
  chevronText: {
    color: '#737373',
    fontSize: 10,
  },
  channelsContainer: {
    marginTop: 2,
    marginBottom: 6,
    paddingLeft: 38,
  },
  channelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginBottom: 2,
    gap: 8,
  },
  channelHash: {
    color: '#737373',
    fontSize: 15,
    fontWeight: '600',
  },
  channelName: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '500',
  },
  onlineHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  countBadge: {
    backgroundColor: '#262626',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  countBadgeText: {
    color: '#a3a3a3',
    fontSize: 10,
    fontWeight: '700',
  },
  onlineUserItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 12,
  },
  avatarSm: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarSmText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  userStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22c55e',
    position: 'absolute',
    bottom: -1,
    right: -1,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  onlineUserName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  youText: {
    color: '#737373',
    fontSize: 12,
  },
  sidebarFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    backgroundColor: '#000000',
  },
  footerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatarLg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLgText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  footerName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  footerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerStatusText: {
    color: '#737373',
    fontSize: 11,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerIconBtn: {
    padding: 6,
  },
  /* ── Modal Styles ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#0a0a0a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    maxHeight: '85%',
    minHeight: '60%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#171717',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTabs: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderRadius: 12,
    padding: 3,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 9,
  },
  modalTabBtnActive: {
    backgroundColor: '#262626',
  },
  modalTabText: {
    color: '#a3a3a3',
    fontSize: 13,
    fontWeight: '600',
  },
  modalTabTextActive: {
    color: '#ffffff',
  },
  modalBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  modalBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  modalBody: {
    flex: 1,
  },
  modalSearchRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modalSearchInput: {
    flex: 1,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
  },
  modalSearchBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSearchBtnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 13,
  },
  modalUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalUserLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalUserName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  modalSubtext: {
    color: '#525252',
    fontSize: 12,
  },
  modalActionBtn: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  modalActionBtnSent: {
    backgroundColor: '#262626',
  },
  modalActionBtnText: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 12,
  },
  modalActionBtnTextSent: {
    color: '#a3a3a3',
  },
  modalEmpty: {
    paddingVertical: 36,
    alignItems: 'center',
  },
  modalEmptyText: {
    color: '#525252',
    fontSize: 13,
  },
});
