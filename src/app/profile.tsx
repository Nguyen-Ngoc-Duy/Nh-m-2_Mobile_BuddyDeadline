import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { confirmAction, notify } from '@/lib/notify';
import { rescheduleAll, setupNotifications } from '@/lib/reminders';
import { supabase } from '@/lib/supabase';
import {
  addCategory as addCategoryRemote,
  listCategories,
  removeCategory,
} from '@/storage/categories';
import { listDeadlines } from '@/storage/deadlines';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [editing, setEditing] = useState(false);
  const [showCategories, setShowCategories] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');

  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [remindBefore, setRemindBefore] = useState('30 phút');

  const loadProfile = useCallback(async () => {
    try {
      const [{ data: { user } }, cats, savedNotification, savedReminder] =
        await Promise.all([
          supabase.auth.getUser(),
          listCategories(),
          AsyncStorage.getItem('notification_enabled'),
          AsyncStorage.getItem('remind_before'),
        ]);

      const currentName = user?.user_metadata?.name ?? '';
      const currentEmail = user?.email ?? '';

      setName(currentName);
      setEmail(currentEmail);
      setEditName(currentName);
      setEditEmail(currentEmail);
      setCategories(cats);

      if (savedNotification !== null) {
        setNotificationEnabled(savedNotification === 'true');
      }
      if (savedReminder) setRemindBefore(savedReminder);
    } catch (error) {
      console.error('Không thể tải hồ sơ:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const saveProfile = async () => {
    const trimmedName = editName.trim();

    if (!trimmedName) {
      notify('Thiếu thông tin', 'Vui lòng nhập họ tên.');
      return;
    }

    const { error } = await supabase.auth.updateUser({
      data: { name: trimmedName },
    });

    if (error) {
      notify('Lỗi', error.message);
      return;
    }

    setName(trimmedName);
    setEditing(false);
    notify('Thành công', 'Đã cập nhật thông tin cá nhân.');
  };

  const addCategory = async () => {
    const value = newCategory.trim();

    if (!value) {
      notify('Thông báo', 'Vui lòng nhập tên danh mục.');
      return;
    }

    if (categories.some(item => item.toLowerCase() === value.toLowerCase())) {
      notify('Thông báo', 'Danh mục này đã tồn tại.');
      return;
    }

    try {
      await addCategoryRemote(value);
      setCategories(await listCategories());
      setNewCategory('');
    } catch (error: any) {
      notify('Lỗi', error?.message ?? 'Không thể lưu danh mục.');
    }
  };

  const deleteCategory = (category: string) => {
    confirmAction(
      'Xóa danh mục',
      `Bạn có chắc muốn xóa "${category}" khỏi danh sách danh mục?`,
      async () => {
        try {
          await removeCategory(category);
          setCategories(await listCategories());
        } catch (error: any) {
          notify('Lỗi', error?.message ?? 'Không thể xóa danh mục.');
        }
      }
    );
  };

  const saveNotificationSettings = async (enabled: boolean, reminder: string) => {
    try {
      await AsyncStorage.multiSet([
        ['notification_enabled', String(enabled)],
        ['remind_before', reminder],
      ]);
      setNotificationEnabled(enabled);
      setRemindBefore(reminder);

      // Áp dụng ngay: đặt lại (hoặc hủy) toàn bộ lịch nhắc
      rescheduleAll(await listDeadlines()).catch(console.error);
    } catch {
      notify('Lỗi', 'Không thể lưu cài đặt thông báo.');
    }
  };

  // Thông báo thử sau 5 giây để kiểm tra rung và âm thanh
  const testNotification = async () => {
    if (Platform.OS === 'web') {
      notify('Thông báo', 'Thông báo chỉ hoạt động trên ứng dụng điện thoại.');
      return;
    }

    try {
      const granted = await setupNotifications();
      if (!granted) {
        notify(
          'Chưa có quyền',
          'Hãy bật quyền thông báo cho ứng dụng trong Cài đặt của điện thoại.'
        );
        return;
      }

      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Thông báo thử',
          body: 'Điện thoại có rung và phát âm thanh không?',
          sound: 'default',
          vibrate: [0, 400, 250, 400],
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: 5,
          channelId: 'deadline-reminders',
        },
      });

      notify('Đã đặt thử', 'Hãy khóa màn hình hoặc thoát app, thông báo sẽ đến sau 5 giây.');
    } catch (error: any) {
      notify('Lỗi', error?.message ?? 'Không thể gửi thông báo thử.');
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: 90 + insets.bottom },
          ]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Cá nhân</Text>

          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {name.trim() ? name.trim().charAt(0).toUpperCase() : '👤'}
              </Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{name || 'Người dùng'}</Text>
              <Text style={styles.profileEmail}>{email || 'Chưa có email'}</Text>
            </View>
          </View>

          {/* CHỈNH SỬA THÔNG TIN */}
          <Pressable
            style={styles.menuItem}
            onPress={() => {
              setEditName(name);
              setEditEmail(email);
              setEditing(!editing);
            }}
          >
            <Text style={styles.menuIcon}>♙</Text>
            <Text style={styles.menuText}>Chỉnh sửa thông tin</Text>
            <Text style={styles.chevron}>{editing ? '⌄' : '›'}</Text>
          </Pressable>

          {editing && (
            <View style={styles.expandedCard}>
              <Text style={styles.label}>Họ và tên</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Nhập họ và tên"
                placeholderTextColor="#8AA99B"
              />

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, { opacity: 0.6 }]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Nhập email"
                placeholderTextColor="#8AA99B"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={false}
              />

              <View style={styles.actionRow}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.cancelText}>Hủy</Text>
                </Pressable>

                <Pressable style={styles.primaryButton} onPress={saveProfile}>
                  <Text style={styles.primaryText}>Lưu thay đổi</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* DANH MỤC */}
          <Pressable
            style={styles.menuItem}
            onPress={() => setShowCategories(!showCategories)}
          >
            <Text style={styles.menuIcon}>📁</Text>
            <Text style={styles.menuText}>Quản lý danh mục</Text>
            <Text style={styles.chevron}>{showCategories ? '⌄' : '›'}</Text>
          </Pressable>

          {showCategories && (
            <View style={styles.expandedCard}>
              <Text style={styles.sectionHeading}>Danh mục hiện có</Text>

              {categories.map(category => (
                <View key={category} style={styles.categoryRow}>
                  <Text style={styles.categoryText}>{category}</Text>

                  <Pressable
                    onPress={() => deleteCategory(category)}
                    accessibilityLabel={`Xóa ${category}`}
                  >
                    <Text style={styles.deleteText}>Xóa</Text>
                  </Pressable>
                </View>
              ))}

              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="Tên danh mục mới"
                placeholderTextColor="#8AA99B"
                value={newCategory}
                onChangeText={setNewCategory}
                onSubmitEditing={addCategory}
              />

              <Pressable style={styles.primaryButton} onPress={addCategory}>
                <Text style={styles.primaryText}>+ Thêm danh mục</Text>
              </Pressable>
            </View>
          )}

          {/* THÔNG BÁO */}
          <Pressable
            style={styles.menuItem}
            onPress={() => setShowNotifications(!showNotifications)}
          >
            <Text style={styles.menuIcon}>🔔</Text>
            <Text style={styles.menuText}>Cài đặt thông báo</Text>
            <Text style={styles.chevron}>{showNotifications ? '⌄' : '›'}</Text>
          </Pressable>

          {showNotifications && (
            <View style={styles.expandedCard}>
              <View style={styles.switchRow}>
                <View style={styles.switchInfo}>
                  <Text style={styles.sectionHeading}>Nhắc nhở deadline</Text>
                  <Text style={styles.helperText}>
                    Điện thoại sẽ rung và phát âm thanh khi gần đến hạn
                  </Text>
                </View>

                <Switch
                  value={notificationEnabled}
                  onValueChange={value =>
                    saveNotificationSettings(value, remindBefore)
                  }
                  trackColor={{ false: '#D8E3DD', true: '#9BE0BE' }}
                  thumbColor={notificationEnabled ? '#35B979' : '#FFFFFF'}
                />
              </View>

              <Text style={styles.label}>Nhắc trước thời hạn (mặc định)</Text>

              {['10 phút', '30 phút', '1 giờ', '1 ngày'].map(option => (
                <Pressable
                  key={option}
                  style={styles.optionRow}
                  onPress={() =>
                    saveNotificationSettings(notificationEnabled, option)
                  }
                >
                  <Text style={styles.optionText}>{option}</Text>
                  <Text
                    style={[
                      styles.radio,
                      remindBefore === option && styles.radioSelected,
                    ]}
                  >
                    {remindBefore === option ? '●' : '○'}
                  </Text>
                </Pressable>
              ))}

              <Pressable style={styles.testButton} onPress={testNotification}>
                <Text style={styles.testText}>🔔 Thử thông báo (sau 5 giây)</Text>
              </Pressable>

              <Text style={styles.helperText}>
                Mỗi deadline nhắc trước hạn theo thời gian bạn ghi ở ô "Nhắc
                nhở" (ví dụ "15 phút trước"). Nếu để trống sẽ dùng mức mặc
                định ở trên, và nhắc thêm một lần đúng giờ hạn. Thông báo chỉ
                hoạt động trên ứng dụng điện thoại (APK).
              </Text>
            </View>
          )}

          {/* ĐĂNG XUẤT */}
          <Pressable style={styles.menuItem} onPress={logout}>
            <Text style={styles.menuIcon}>⇥</Text>
            <Text style={styles.menuText}>Đăng xuất</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <View
        style={[
          styles.bottomNav,
          { height: 62 + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <Pressable style={styles.navItem} onPress={() => router.replace('/home')}>
          <Text style={styles.navIcon}>⌂</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/deadlines')}>
          <Text style={styles.navIcon}>☰</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/add-deadline')}>
          <Text style={styles.navIcon}>⊞</Text>
        </Pressable>
        <View style={[styles.navItem, styles.navActive]}>
          <Text style={[styles.navIcon, styles.navIconActive]}>♙</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: '#F4FBF8' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18 },

  pageTitle: {
    textAlign: 'center',
    fontSize: 20,
    fontWeight: '700',
    color: '#245747',
    marginBottom: 20,
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 14,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B9E5D5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 26, fontWeight: '700', color: '#245747' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#245747' },
  profileEmail: { fontSize: 13, color: '#84928E', marginTop: 4 },

  menuItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 9,
  },
  menuIcon: { width: 32, fontSize: 18, color: '#245747' },
  menuText: { flex: 1, fontSize: 15, color: '#31594C' },
  chevron: { fontSize: 20, color: '#568878', paddingHorizontal: 4 },

  expandedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 11,
  },
  label: { fontSize: 13, color: '#31594C', marginTop: 8, marginBottom: 6 },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 10,
    paddingHorizontal: 14,
    color: '#245747',
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    fontSize: 15,
  },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryButton: {
    minHeight: 46,
    paddingHorizontal: 16,
    backgroundColor: '#35B979',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
  cancelButton: {
    minHeight: 46,
    paddingHorizontal: 18,
    backgroundColor: '#EDF5F1',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 14, color: '#568878' },

  testButton: {
    minHeight: 46,
    marginTop: 14,
    backgroundColor: '#E4F7ED',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  testText: { fontSize: 14, fontWeight: '600', color: '#20875B' },

  sectionHeading: { fontSize: 15, fontWeight: '600', color: '#245747' },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF5F1',
  },
  categoryText: { fontSize: 15, color: '#31594C' },
  deleteText: {
    fontSize: 14,
    color: '#E53935',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  switchInfo: { flex: 1 },
  helperText: { fontSize: 12, color: '#84928E', marginTop: 8, lineHeight: 18 },
  optionRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EDF5F1',
  },
  optionText: { fontSize: 15, color: '#31594C' },
  radio: { fontSize: 20, color: '#AAB9B1' },
  radioSelected: { color: '#35B979' },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5EEE9',
    flexDirection: 'row',
    alignItems: 'center',
  },
  navItem: {
    flex: 1,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navActive: { backgroundColor: '#F0FAF5' },
  navIcon: { fontSize: 28, color: '#4D9D7D' },
  navIconActive: { color: '#35B979' },
});