import AsyncStorage from '@react-native-async-storage/async-storage';
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

import { confirmAction, notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';
import {
  addCategory as addCategoryRemote,
  listCategories,
  removeCategory,
} from '@/storage/categories';

export default function ProfileScreen() {
  const router = useRouter();

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

  // Chỉ cho đổi tên (đổi email cần xác nhận lại qua Supabase)
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

  const saveNotificationSettings = async (
    enabled: boolean,
    reminder: string
  ) => {
    try {
      await AsyncStorage.multiSet([
        ['notification_enabled', String(enabled)],
        ['remind_before', reminder],
      ]);
      setNotificationEnabled(enabled);
      setRemindBefore(reminder);
    } catch {
      notify('Lỗi', 'Không thể lưu cài đặt thông báo.');
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) notify('Lỗi', 'Không thể đăng xuất. Vui lòng thử lại.');
    // _layout tự đưa về màn đăng nhập
  };

  const goTo = (path: '/home' | '/deadlines' | '/add-deadline') => {
    router.push(path);
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.pageTitle}>Cá nhân</Text>

          {/* THÔNG TIN TÀI KHOẢN */}
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

          {/* QUẢN LÝ DANH MỤC */}
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
                    accessibilityRole="button"
                    accessibilityLabel={`Xóa ${category}`}
                  >
                    <Text style={styles.deleteText}>Xóa</Text>
                  </Pressable>
                </View>
              ))}

              <TextInput
                style={[styles.input, { marginTop: 10 }]}
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

          {/* CÀI ĐẶT THÔNG BÁO */}
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
                    Bật hoặc tắt tùy chọn nhắc nhở
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

              <Text style={styles.label}>Nhắc trước thời hạn</Text>

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

              <Text style={styles.helperText}>
                Lưu ý: Đây là cài đặt tùy chọn. Để nhận thông báo thực tế, ứng
                dụng cần tích hợp thêm hệ thống gửi thông báo.
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

      {/* THANH ĐIỀU HƯỚNG */}
      <View style={styles.bottomNav}>
        <Pressable style={styles.navItem} onPress={() => router.replace('/home')}>
          <Text style={styles.navIcon}>⌂</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => goTo('/deadlines')}>
          <Text style={styles.navIcon}>☰</Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => goTo('/add-deadline')}>
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

  container: {
    flex: 1,
    backgroundColor: '#F4FBF8',
  },

  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 25,
    paddingBottom: 85,
  },

  pageTitle: {
    textAlign: 'center',
    fontSize: 17,
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
    borderRadius: 11,
    padding: 12,
    marginBottom: 10,
    gap: 12,
  },

  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#B9E5D5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarText: {
    fontSize: 23,
    fontWeight: '700',
    color: '#245747',
  },

  profileInfo: { flex: 1 },

  profileName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#245747',
  },

  profileEmail: {
    fontSize: 10,
    color: '#84928E',
    marginTop: 4,
  },

  menuItem: {
    minHeight: 39,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 9,
    paddingHorizontal: 10,
    marginBottom: 7,
  },

  menuIcon: {
    width: 26,
    fontSize: 15,
    color: '#245747',
  },

  menuText: {
    flex: 1,
    fontSize: 11,
    color: '#31594C',
  },

  chevron: {
    fontSize: 17,
    color: '#568878',
    paddingHorizontal: 3,
  },

  expandedCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 10,
    padding: 12,
    marginBottom: 9,
  },

  label: {
    fontSize: 11,
    color: '#31594C',
    marginTop: 8,
    marginBottom: 6,
  },

  input: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#245747',
    backgroundColor: '#FFFFFF',
    marginBottom: 9,
    fontSize: 12,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },

  primaryButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    backgroundColor: '#35B979',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  cancelButton: {
    minHeight: 38,
    paddingHorizontal: 15,
    backgroundColor: '#EDF5F1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelText: {
    fontSize: 11,
    color: '#568878',
  },

  sectionHeading: {
    fontSize: 12,
    fontWeight: '600',
    color: '#245747',
  },

  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF5F1',
  },

  categoryText: {
    fontSize: 12,
    color: '#31594C',
  },

  deleteText: {
    fontSize: 11,
    color: '#E53935',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },

  switchInfo: { flex: 1 },

  helperText: {
    fontSize: 10,
    color: '#84928E',
    marginTop: 5,
    lineHeight: 15,
  },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF5F1',
  },

  optionText: {
    fontSize: 12,
    color: '#31594C',
  },

  radio: {
    fontSize: 17,
    color: '#AAB9B1',
  },

  radioSelected: {
    color: '#35B979',
  },

  bottomNav: {
    height: 58,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5EEE9',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  navItem: {
    flex: 1,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navActive: {
    backgroundColor: '#F0FAF5',
  },

  navIcon: {
    fontSize: 24,
    color: '#4D9D7D',
  },

  navIconActive: {
    color: '#35B979',
  },
});