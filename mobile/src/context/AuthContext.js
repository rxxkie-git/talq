import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl, setServerUrl, DEFAULT_SERVER_URL } from '../config';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUrl, setUrlState] = useState(DEFAULT_SERVER_URL);

  useEffect(() => {
    loadSavedSession();
  }, []);

  const loadSavedSession = async () => {
    try {
      const savedUrl = await getServerUrl();
      setUrlState(savedUrl);

      const token = await AsyncStorage.getItem('talq_token');
      const username = await AsyncStorage.getItem('talq_username');
      const id = await AsyncStorage.getItem('talq_userId');

      if (token && username && id) {
        setUser({ token, username, id });
      }
    } catch (e) {
      console.error('Failed to load session:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateServerUrl = async (url) => {
    await setServerUrl(url);
    setUrlState(url);
  };

  const login = async (username, password) => {
    const url = await getServerUrl();
    const res = await fetch(`${url}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed');
    }

    await AsyncStorage.setItem('talq_token', data.token);
    await AsyncStorage.setItem('talq_username', data.username);
    await AsyncStorage.setItem('talq_userId', String(data.id));

    setUser({ token: data.token, username: data.username, id: data.id });
    return data;
  };

  const signup = async (username, password) => {
    const url = await getServerUrl();
    const res = await fetch(`${url}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username.trim(), password }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Signup failed');
    }

    await AsyncStorage.setItem('talq_token', data.token);
    await AsyncStorage.setItem('talq_username', data.username);
    await AsyncStorage.setItem('talq_userId', String(data.id));

    setUser({ token: data.token, username: data.username, id: data.id });
    return data;
  };

  const logout = async () => {
    try {
      await AsyncStorage.multiRemove(['talq_token', 'talq_username', 'talq_userId']);
    } catch (e) {
      console.error('Logout storage error:', e);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        serverUrl,
        updateServerUrl,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
