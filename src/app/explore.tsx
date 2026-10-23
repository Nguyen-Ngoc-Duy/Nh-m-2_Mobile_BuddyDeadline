import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async () => {
    if (!email.trim() || !password.trim()) {
      notify('Thông báo', 'Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);

    if (error) {
      notify('Đăng nhập', error.message);
    }
    // Thành công: _layout tự chuyển sang /home
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 24 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Chào mừng trở lại! 👋</Text>

        <Text style={styles.subtitle}>
          Đăng nhập để quản lý deadline của bạn
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập email của bạn"
          placeholderTextColor="#7FAF9F"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#7FAF9F"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          onPress={() => router.push('/reset-password')}
          style={styles.forgot}
        >
          <Text style={styles.forgotText}>Quên mật khẩu?</Text>
        </Pressable>

        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={login}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </Text>
        </Pressable>

        <View style={styles.registerRow}>
          <Text style={styles.grayText}>Chưa có tài khoản? </Text>
          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.greenText}>Đăng ký ngay</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4FBF8' },
  content: { paddingHorizontal: 28, paddingTop: 56 },

  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#245747',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 36,
    fontSize: 14,
    color: '#65AA96',
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 14,
    fontSize: 15,
    color: '#245747',
  },

  forgot: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    marginBottom: 18,
  },
  forgotText: { color: '#20A96D', fontSize: 14, fontWeight: '600' },

  button: {
    height: 52,
    backgroundColor: '#35B979',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  grayText: { color: '#84928E', fontSize: 14 },
  greenText: { color: '#20A96D', fontSize: 14, fontWeight: '600' },
});