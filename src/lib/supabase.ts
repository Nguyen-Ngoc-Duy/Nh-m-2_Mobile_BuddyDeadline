import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

// Đang render phía server (Node) khi chạy web: không có window
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

// Storage giả cho server để không gọi localStorage
const serverStorage = {
  getItem: async (_key: string) => null,
  setItem: async (_key: string, _value: string) => {},
  removeItem: async (_key: string) => {},
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: isServer ? serverStorage : AsyncStorage,
      autoRefreshToken: !isServer,
      persistSession: !isServer,
      detectSessionInUrl: false,
    },
  }
);