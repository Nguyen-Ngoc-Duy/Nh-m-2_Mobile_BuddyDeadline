import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { notify } from '@/lib/notify';
import { listCategories } from '@/storage/categories';
import { addDeadline, getDeadline, updateDeadline } from '@/storage/deadlines';

const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

const MONTHS = [
  'Tháng 1', 'Tháng 2', 'Tháng 3', 'Tháng 4',
  'Tháng 5', 'Tháng 6', 'Tháng 7', 'Tháng 8',
  'Tháng 9', 'Tháng 10', 'Tháng 11', 'Tháng 12',
];

const DEFAULT_CATEGORIES = ['Học tập', 'Công việc', 'Cá nhân', 'Gia đình'];

function dateString(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function displayDate(value: string) {
  const p = value.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : value;
}

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const parsed = new Date(y, m - 1, d);
  return (
    parsed.getFullYear() === y &&
    parsed.getMonth() === m - 1 &&
    parsed.getDate() === d
  );
}

export default function AddDeadlineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();

  const editId = Array.isArray(params.id) ? params.id[0] : params.id;
  const isEditing = Boolean(editId);

  const now = new Date();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(dateString(now));
  const [time, setTime] = useState('18:00');
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [category, setCategory] = useState('Học tập');
  const [priority, setPriority] = useState('Cao');
  const [reminder, setReminder] = useState('');

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [loading, setLoading] = useState(Boolean(editId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadAll() {
      let cats = DEFAULT_CATEGORIES;

      try {
        const list = await listCategories();
        if (list.length > 0) cats = list;
      } catch (e) {
        console.error('Không thể tải danh mục:', e);
      }

      if (active) {
        setCategories(cats);
        setCategory((current) => (cats.includes(current) ? current : cats[0]));
      }

      if (!editId) {
        if (active) setLoading(false);
        return;
      }

      try {
        const item = await getDeadline(editId);

        if (!active) return;

        if (!item) {
          setError('Không tìm thấy deadline cần sửa.');
          return;
        }

        setTitle(item.title);
        setDate(item.date);
        setTime(item.time || '18:00');
        setCategory(item.category || cats[0]);
        setPriority(item.priority || 'Cao');
        setReminder(item.reminder === 'Không' ? '' : item.reminder || '');

        // Nếu danh mục cũ không còn trong danh sách thì vẫn hiển thị được
        if (item.category && !cats.includes(item.category)) {
          setCategories([...cats, item.category]);
        }

        if (validDate(item.date)) {
          const parts = item.date.split('-').map(Number);
          setYear(parts[0]);
          setMonth(parts[1] - 1);
        }
      } catch (e: any) {
        console.error(e);
        if (active) setError(e?.message ?? 'Không thể tải deadline.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAll();

    return () => {
      active = false;
    };
  }, [editId]);

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  function renderCalendar() {
    const firstDay = (new Date(year, month, 1).getDay() + 6) % 7;
    const count = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];

    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= count; d++) cells.push(d);
    while (cells.length % 7) cells.push(null);

    return (
      <View style={styles.calendarGrid}>
        {cells.map((day, index) => {
          if (day === null) {
            return <View key={`empty-${index}`} style={styles.dayCell} />;
          }

          const value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const selected = value === date;
          const today = value === dateString(new Date());

          return (
            <Pressable
              key={value}
              style={[
                styles.dayCell,
                selected && styles.selectedDay,
                !selected && today && styles.todayDay,
              ]}
              onPress={() => {
                setDate(value);
                setCalendarOpen(false);
                setError('');
              }}
            >
              <Text
                style={[
                  styles.dayText,
                  selected && styles.selectedDayText,
                  !selected && today && styles.todayDayText,
                ]}
              >
                {day}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  async function saveDeadline() {
    if (saving) return;

    if (!title.trim()) {
      setError('Vui lòng nhập tên deadline.');
      return;
    }

    if (!validDate(date)) {
      setError('Vui lòng chọn ngày hạn hợp lệ.');
      return;
    }

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time.trim())) {
      setError('Giờ phải theo dạng HH:MM, ví dụ 18:00.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        title: title.trim(),
        date,
        time: time.trim(),
        category: category || 'Học tập',
        priority,
        reminder: reminder.trim() || 'Không',
      };

      if (isEditing && editId) {
        await updateDeadline(editId, payload);
      } else {
        await addDeadline(payload);
      }

      notify(
        'Thành công',
        isEditing ? 'Đã cập nhật deadline.' : 'Đã lưu deadline mới.'
      );
      router.replace('/deadlines');
    } catch (e: any) {
      console.error('Lỗi lưu deadline:', e);
      setError(e?.message ?? 'Không thể lưu deadline. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Đang tải deadline...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.back}>←</Text>
          </Pressable>

          <Text style={styles.headerTitle}>
            {isEditing ? 'Chỉnh sửa deadline' : 'Thêm deadline'}
          </Text>
        </View>

        <Text style={styles.label}>Tên deadline</Text>

        <TextInput
          style={styles.input}
          placeholder="Nhập tên deadline"
          placeholderTextColor="#7FAF9F"
          value={title}
          onChangeText={setTitle}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Ngày hạn</Text>

            <Pressable
              style={styles.dateButton}
              onPress={() => {
                if (validDate(date)) {
                  const p = date.split('-').map(Number);
                  setYear(p[0]);
                  setMonth(p[1] - 1);
                }
                setCalendarOpen(!calendarOpen);
              }}
            >
              <Text style={styles.dateButtonText}>{displayDate(date)}</Text>
              <Text style={styles.calendarIcon}>▦</Text>
            </Pressable>
          </View>

          <View style={{ width: 105 }}>
            <Text style={styles.label}>Giờ đến hạn</Text>

            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="18:00"
              placeholderTextColor="#7FAF9F"
              maxLength={5}
            />
          </View>
        </View>

        {calendarOpen && (
          <View style={styles.calendar}>
            <View style={styles.monthHeader}>
              <Pressable onPress={() => changeMonth(-1)} style={styles.arrow}>
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>

              <Text style={styles.monthTitle}>
                {MONTHS[month]} {year}
              </Text>

              <Pressable onPress={() => changeMonth(1)} style={styles.arrow}>
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {WEEKDAYS.map((day) => (
                <Text key={day} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>

            {renderCalendar()}

            <Pressable
              style={styles.todayButton}
              onPress={() => {
                const d = new Date();
                setDate(dateString(d));
                setYear(d.getFullYear());
                setMonth(d.getMonth());
                setCalendarOpen(false);
              }}
            >
              <Text style={styles.todayText}>Chọn hôm nay</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>Danh mục</Text>

        <View style={styles.categoryRow}>
          {categories.map((item) => (
            <Pressable
              key={item}
              onPress={() => {
                setCategory(item);
                setError('');
              }}
              style={[
                styles.categoryButton,
                category === item && styles.categoryActive,
              ]}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === item && styles.categoryTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Mức ưu tiên</Text>

        <View style={styles.priorityRow}>
          {['Cao', 'Trung bình', 'Thấp'].map((item) => (
            <Pressable
              key={item}
              onPress={() => setPriority(item)}
              style={[
                styles.priorityButton,
                priority === item && styles.priorityActive,
              ]}
            >
              <Text
                style={[
                  styles.priorityText,
                  priority === item && styles.priorityTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Nhắc nhở</Text>

        <TextInput
          style={styles.input}
          placeholder="Ví dụ: 10 phút trước"
          placeholderTextColor="#7FAF9F"
          value={reminder}
          onChangeText={setReminder}
        />

        {!!error && <Text style={styles.error}>{error}</Text>}

        <Pressable
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={saveDeadline}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? 'Đang lưu...' : isEditing ? 'Lưu thay đổi' : 'Lưu deadline'}
          </Text>
        </Pressable>

        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Hủy</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF8',
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 35,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4FBF8',
  },

  text: {
    color: '#245747',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },

  backButton: {
    paddingRight: 13,
    paddingVertical: 4,
  },

  back: {
    fontSize: 28,
    color: '#245747',
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#245747',
  },

  label: {
    fontSize: 11,
    color: '#31594C',
    marginBottom: 6,
    marginTop: 5,
  },

  input: {
    height: 43,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    color: '#31594C',
    marginBottom: 14,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  dateButton: {
    height: 43,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  dateButtonText: {
    color: '#568878',
    fontSize: 12,
  },

  calendarIcon: {
    color: '#35B979',
    fontSize: 18,
  },

  calendar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },

  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  arrow: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#E4F7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrowText: {
    color: '#245747',
    fontSize: 25,
  },

  monthTitle: {
    color: '#245747',
    fontWeight: '700',
    fontSize: 14,
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 6,
  },

  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    color: '#7B8C84',
    fontSize: 10,
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: '14.2857%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },

  dayText: {
    fontSize: 12,
    color: '#31594C',
  },

  selectedDay: {
    backgroundColor: '#35B979',
  },

  selectedDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  todayDay: {
    borderWidth: 1,
    borderColor: '#35B979',
  },

  todayDayText: {
    color: '#20875B',
    fontWeight: '700',
  },

  todayButton: {
    marginTop: 10,
    backgroundColor: '#E4F7ED',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },

  todayText: {
    color: '#20875B',
    fontSize: 12,
    fontWeight: '600',
  },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },

  categoryButton: {
    flexGrow: 1,
    flexBasis: '20%',
    minHeight: 38,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4F1EB',
  },

  categoryActive: {
    backgroundColor: '#35B979',
    borderColor: '#35B979',
  },

  categoryText: {
    fontSize: 11,
    color: '#568878',
  },

  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  priorityRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 20,
  },

  priorityButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  priorityActive: {
    backgroundColor: '#35B979',
  },

  priorityText: {
    fontSize: 10,
    color: '#568878',
  },

  priorityTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  error: {
    color: '#D84336',
    fontSize: 12,
    marginBottom: 12,
  },

  saveButton: {
    minHeight: 46,
    backgroundColor: '#35B979',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },

  saveText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  cancelButton: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 7,
  },

  cancelText: {
    color: '#6F8B80',
    fontSize: 12,
  },
});
