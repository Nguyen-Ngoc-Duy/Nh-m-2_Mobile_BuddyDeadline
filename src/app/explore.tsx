import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { supabase } from '@/lib/supabase';
import { notify } from '@/lib/notify';

export default function LoginScreen() {
  const router = useRouter();

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
      notify('Đăng nhập', 'Email hoặc mật khẩu chưa đúng.');
    }
    // Thành công: _layout tự chuyển sang /home
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
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
        />

        <TextInput
          style={styles.input}
          placeholder="Nhập mật khẩu"
          placeholderTextColor="#7FAF9F"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
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
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF8',
  },

  content: {
    paddingHorizontal: 28,
    paddingTop: 70,
  },

  title: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#245747',
  },

  subtitle: {
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 36,
    fontSize: 12,
    color: '#65AA96',
  },

  input: {
    height: 42,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 13,
    color: '#245747',
  },

  forgot: {
    alignSelf: 'flex-end',
    marginBottom: 27,
  },

  forgotText: {
    color: '#20A96D',
    fontSize: 11,
    fontWeight: '600',
  },

  button: {
    height: 42,
    backgroundColor: '#35B979',
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },

  grayText: {
    color: '#84928E',
    fontSize: 11,
  },

  greenText: {
    color: '#20A96D',
    fontSize: 11,
    fontWeight: '600',
  },
});