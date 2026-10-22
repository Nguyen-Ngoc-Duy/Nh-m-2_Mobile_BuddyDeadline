import { useRouter } from 'expo-router';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View
} from 'react-native';

export default function Index() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();

  const logoSize = Math.min(width * 0.28, 110);
  
  return (
    <View style={styles.container}>

      <View
        style={[
          styles.content,
          {
            paddingTop: height * 0.10,
          },
        ]}
      >

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

        <Text style={styles.title}>
          Deadline Buddy
        </Text>

        <Text style={styles.subtitle}>
          Quản lý deadline, chủ động tương lai
        </Text>

      </View>

      <Pressable
        style={styles.startButton}
        onPress={() => router.push('/explore')}
      >
        <Text style={styles.startText}>
          Bắt đầu
        </Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF8',
  },

  content: {
    alignItems: 'center',
  },

  logoBox: {
    backgroundColor: '#D9F2E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },

  logo: {
    fontSize: 45,
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#245747',
  },

  subtitle: {
    marginTop: 5,
    fontSize: 11,
    color: '#5EAA92',
  },

  startButton: {
    position: 'absolute',
    bottom: 28,
    left: 28,
    right: 28,
    height: 48,
    borderRadius: 9,
    backgroundColor: '#35B979',
    alignItems: 'center',
    justifyContent: 'center',
  },

  startText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});