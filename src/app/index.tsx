import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Index() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const logoSize = Math.min(width * 0.32, 130);

  return (
    <View style={styles.container}>
      <View style={[styles.content, { paddingTop: insets.top + height * 0.12 }]}>
        <View
          style={[
            styles.logoBox,
            {
              width: logoSize,
              height: logoSize,
              borderRadius: logoSize * 0.23,
            },
          ]}
        >
          <Text style={styles.logo}>📅</Text>
        </View>

        <Text style={styles.title}>Deadline Buddy</Text>
        <Text style={styles.subtitle}>
          Quản lý deadline, chủ động tương lai
        </Text>
      </View>

      <Pressable
        style={[styles.startButton, { bottom: 28 + insets.bottom }]}
        onPress={() => router.push('/explore')}
      >
        <Text style={styles.startText}>Bắt đầu</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4FBF8' },
  content: { alignItems: 'center' },

  logoBox: {
    backgroundColor: '#D9F2E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  logo: { fontSize: 52 },

  title: { fontSize: 26, fontWeight: '700', color: '#245747' },
  subtitle: { marginTop: 6, fontSize: 14, color: '#5EAA92' },

  startButton: {
    position: 'absolute',
    left: 28,
    right: 28,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#35B979',
    alignItems: 'center',
    justifyContent: 'center',
  },
  startText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});