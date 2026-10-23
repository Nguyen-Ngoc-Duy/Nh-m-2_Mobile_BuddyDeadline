import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
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
          autoCorrect={false}
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
    marginBottom: 30,
    color: '#65AA96',
    fontSize: 14,
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

  button: {
    height: 52,
    backgroundColor: '#35B979',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});