import AsyncStorage from '@react-native-async-storage/async-storage';

// Default to your current PC Wi-Fi IP
export const DEFAULT_SERVER_URL = 'http://192.168.29.186:3000';

const SERVER_URL_KEY = 'talq_server_url';

export const getServerUrl = async () => {
  try {
    const saved = await AsyncStorage.getItem(SERVER_URL_KEY);
    return saved || DEFAULT_SERVER_URL;
  } catch {
    return DEFAULT_SERVER_URL;
  }
};

export const setServerUrl = async (url) => {
  try {
    await AsyncStorage.setItem(SERVER_URL_KEY, url.trim().replace(/\/+$/, ''));
  } catch (e) {
    console.error('Failed to save server URL', e);
  }
};
