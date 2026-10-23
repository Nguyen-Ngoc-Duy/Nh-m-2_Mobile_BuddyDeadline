import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Deadline } from '@/storage/deadlines';

const CHANNEL_ID = 'deadline-reminders';

// Hiện thông báo kèm âm thanh ngay cả khi app đang mở
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Xin quyền và tạo kênh thông báo (có rung + âm thanh)
export async function setupNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Nhắc nhở deadline',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 400, 250, 400],
      sound: 'default',
      lightColor: '#35B979',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;

  if (!granted) {
    const asked = await Notifications.requestPermissionsAsync();
    granted = asked.granted;
  }

  return granted;
}

// "10 phút trước", "2 giờ", "1 ngày" -> số phút. Không hợp lệ -> null
export function parseRemindMinutes(text: string): number | null {
  const m = (text || '').match(/(\d+)\s*(phút|giờ|ngày)/i);
  if (!m) return null;

  const n = Number(m[1]);
  if (!Number.isFinite(n) || n <= 0) return null;

  const unit = m[2].toLowerCase();
  if (unit === 'phút') return n;
  if (unit === 'giờ') return n * 60;
  return n * 60 * 24;
}

// 45 -> "45 phút", 120 -> "2 giờ", 1440 -> "1 ngày"
function describeMinutes(minutes: number): string {
  if (minutes % 1440 === 0) return `${minutes / 1440} ngày`;
  if (minutes % 60 === 0) return `${minutes / 60} giờ`;
  return `${minutes} phút`;
}

// Đặt lại toàn bộ lịch nhắc dựa trên danh sách deadline hiện tại
export async function rescheduleAll(deadlines: Deadline[]) {
  if (Platform.OS === 'web') return;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const enabled = (await AsyncStorage.getItem('notification_enabled')) !== 'false';
  if (!enabled) return;

  const defaultRemind = await AsyncStorage.getItem('remind_before');
  const defaultMinutes = parseRemindMinutes(defaultRemind ?? '30 phút') ?? 30;

  const now = Date.now();

  for (const item of deadlines) {
    if (item.completed) continue;

    const due = new Date(`${item.date}T${item.time}:00`).getTime();
    if (Number.isNaN(due)) continue;

    const reminderText = (item.reminder ?? '').trim();

    // "Không" hoặc rỗng -> không nhắc trước (rỗng dùng mức mặc định cho dữ liệu cũ)
    let minutes: number | null;
    if (reminderText === 'Không') {
      minutes = null;
    } else if (reminderText === '') {
      minutes = defaultMinutes;
    } else {
      minutes = parseRemindMinutes(reminderText) ?? defaultMinutes;
    }

    const times: { at: number; body: string }[] = [];

    if (minutes !== null) {
      times.push({
        at: due - minutes * 60 * 1000,
        body: `Sắp đến hạn lúc ${item.time} (còn ${describeMinutes(minutes)})`,
      });
    }

    times.push({ at: due, body: 'Đã đến giờ hạn!' });

    for (const t of times) {
      if (t.at <= now) continue;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `⏰ ${item.title}`,
          body: t.body,
          sound: 'default',
          vibrate: [0, 400, 250, 400],
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: new Date(t.at),
          channelId: CHANNEL_ID,
        },
      });
    }
  }
}