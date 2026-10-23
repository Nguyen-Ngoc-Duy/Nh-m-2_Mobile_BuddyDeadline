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

export default function RegisterScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const register = async () => {
    if (!name.trim() || !email.trim() || !password || !confirm) {
      notify('Thông báo', 'Vui lòng nhập đầy đủ thông tin.');
      return;
    }
    if (password.length < 6) {
      notify('Thông báo', 'Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (password !== confirm) {
      notify('Thông báo', 'Mật khẩu nhập lại không khớp.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { name: name.trim() } },
    });
    setLoading(false);

    if (error) {
      notify('Lỗi đăng ký', error.message);
      return;
    }

    if (!data.session) {
      notify('Kiểm tra email', 'Hãy xác nhận email rồi đăng nhập.');
      router.replace('/explore');
    }
    // Có session: _layout tự chuyển sang /home
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
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.back}>←</Text>
        </Pressable>

        <Text style={styles.title}>Tạo tài khoản mới ✨</Text>

        <Text style={styles.subtitle}>
          Đăng ký để bắt đầu quản lý deadline
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Họ và tên"
          placeholderTextColor="#7FAF9F"
          value={name}
          onChangeText={setName}
        />

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
          placeholder="Nhập mật khẩu (từ 6 ký tự)"
          placeholderTextColor="#7FAF9F"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          placeholder="Nhập lại mật khẩu"
          placeholderTextColor="#7FAF9F"
          value={confirm}
          onChangeText={setConfirm}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />

        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={register}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Đang đăng ký...' : 'Đăng ký'}
          </Text>
        </Pressable>

        <View style={styles.loginRow}>
          <Text style={styles.gray}>Đã có tài khoản? </Text>
          <Pressable onPress={() => router.replace('/explore')}>
            <Text style={styles.green}>Đăng nhập</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4FBF8' },
  content: { paddingHorizontal: 24, paddingTop: 12 },

  backButton: { width: 44, height: 44, justifyContent: 'center' },
  back: { fontSize: 30, color: '#245747' },

  title: {
    textAlign: 'center',
    fontSize: 24,
    fontWeight: '700',
    color: '#245747',
    marginTop: 4,
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 28,
    fontSize: 14,
    color: '#65AA96',
  },

  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    fontSize: 15,
    color: '#245747',
  },

  button: {
    height: 52,
    backgroundColor: '#35B979',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 18,
  },
  gray: { color: '#84928E', fontSize: 14 },
  green: { color: '#20A96D', fontSize: 14, fontWeight: '600' },
});