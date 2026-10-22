import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

// Các màn hình không cần đăng nhập
const PUBLIC = ['', 'explore', 'register', 'reset-password'];

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const segments = useSegments();
  const router = useRouter();

  // Lấy phiên đăng nhập hiện có và theo dõi thay đổi
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  // Chuyển hướng theo trạng thái đăng nhập
  useEffect(() => {
    if (!ready) return;

    const current = (segments[0] as string) ?? '';
    const isPublic = PUBLIC.includes(current);

    if (!session && !isPublic) {
      router.replace('/explore');
    } else if (
      session &&
      (current === 'explore' || current === 'register' || current === '')
    ) {
      router.replace('/home');
    }
  }, [session, ready, segments]);

  return <Stack screenOptions={{ headerShown: false }} />;
}