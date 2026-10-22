import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const resetPassword = async () => {
    if (!email.trim()) {
      notify('Thông báo', 'Vui lòng nhập email.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    setLoading(false);

    if (error) {
      notify('Lỗi', error.message);
      return;
    }

    notify('Đã gửi', 'Hãy kiểm tra email để đặt lại mật khẩu.');
    router.replace('/explore');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.back}>←</Text>
        </Pressable>

        <Text style={styles.title}>Đặt lại mật khẩu</Text>

        <Text style={styles.subtitle}>
          Nhập email để nhận liên kết đặt lại mật khẩu
        </Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập email của bạn"
          placeholderTextColor="#7FAF9F"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Pressable
          style={[styles.button, loading && { opacity: 0.6 }]}
          onPress={resetPassword}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Đang gửi...' : 'Gửi email đặt lại'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF8',
  },

  content: {
    padding: 24,
    paddingTop: 35,
  },

  back: {
    fontSize: 28,
    color: '#245747',
    marginBottom: 15,
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
    marginBottom: 30,
    color: '#65AA96',
    fontSize: 12,
  },

  input: {
    height: 44,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    marginBottom: 13,
    color: '#245747',
  },

  button: {
    height: 44,
    backgroundColor: '#35B979',
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});