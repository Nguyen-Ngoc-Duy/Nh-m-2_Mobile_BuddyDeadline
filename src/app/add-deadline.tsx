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
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { WheelPicker } from '@/components/wheel-picker';
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

// Nhắc nhở
const PRESET_REMINDERS = ['Không', '5 phút', '10 phút', '30 phút', '1 giờ', '1 ngày'];
const CUSTOM = 'Tùy chỉnh';
const UNITS = ['phút', 'giờ', 'ngày'];

// Chọn giờ (thanh xoay)
const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

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

// Đọc giá trị nhắc nhở đã lưu ("10 phút trước", "Không", "45 phút trước"...)
function parseStoredReminder(value: string): {
  choice: string;
  amount: string;
  unit: string;
} {
  const v = (value || '').replace(/\s*trước\s*$/i, '').trim();

  if (!v || v === 'Không') return { choice: 'Không', amount: '', unit: 'phút' };
  if (PRESET_REMINDERS.includes(v)) return { choice: v, amount: '', unit: 'phút' };

  const m = v.match(/^(\d+)\s*(phút|giờ|ngày)$/i);
  if (m) return { choice: CUSTOM, amount: m[1], unit: m[2].toLowerCase() };

  return { choice: 'Không', amount: '', unit: 'phút' };
}

export default function AddDeadlineScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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

  const [reminderChoice, setReminderChoice] = useState('30 phút');
  const [customAmount, setCustomAmount] = useState('');
  const [customUnit, setCustomUnit] = useState('phút');

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [timeOpen, setTimeOpen] = useState(false);
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
        setCategory(current => (cats.includes(current) ? current : cats[0]));
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

        const parsed = parseStoredReminder(item.reminder);
        setReminderChoice(parsed.choice);
        setCustomAmount(parsed.amount);
        setCustomUnit(parsed.unit);

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

  const [curHour, curMinute] = /^\d{2}:\d{2}$/.test(time)
    ? time.split(':')
    : ['18', '00'];

  function pickHour(h: string) {
    setTime(`${h}:${curMinute}`);
    setError('');
  }

  function pickMinute(m: string) {
    setTime(`${curHour}:${m}`);
    setError('');
  }

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

  // Tạo chuỗi nhắc nhở để lưu vào database
  function buildReminder(): string | null {
    if (reminderChoice === 'Không') return 'Không';

    if (reminderChoice === CUSTOM) {
      const n = Number(customAmount);
      if (!customAmount.trim() || !Number.isInteger(n) || n <= 0) return null;
      return `${n} ${customUnit} trước`;
    }

    return `${reminderChoice} trước`;
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
      setError('Vui lòng chọn giờ hợp lệ.');
      return;
    }

    const reminderValue = buildReminder();
    if (reminderValue === null) {
      setError('Nhắc nhở tùy chỉnh: hãy nhập một số nguyên lớn hơn 0.');
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
        reminder: reminderValue,
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 36 + insets.bottom },
        ]}
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

        {/* NGÀY + GIỜ */}
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
                setTimeOpen(false);
                setCalendarOpen(!calendarOpen);
              }}
            >
              <Text style={styles.dateButtonText}>{displayDate(date)}</Text>
              <Text style={styles.calendarIcon}>▦</Text>
            </Pressable>
          </View>

          <View style={{ width: 130 }}>
            <Text style={styles.label}>Giờ đến hạn</Text>
            <Pressable
              style={styles.dateButton}
              onPress={() => {
                setCalendarOpen(false);
                setTimeOpen(!timeOpen);
              }}
            >
              <Text style={styles.dateButtonText}>{time}</Text>
              <Text style={styles.calendarIcon}>◷</Text>
            </Pressable>
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
              {WEEKDAYS.map(day => (
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

        {timeOpen && (
          <View style={styles.calendar}>
            <View style={styles.wheelRow}>
              <WheelPicker items={HOURS} value={curHour} onChange={pickHour} />
              <Text style={styles.wheelColon}>:</Text>
              <WheelPicker items={MINUTES} value={curMinute} onChange={pickMinute} />
            </View>

            <Pressable style={styles.todayButton} onPress={() => setTimeOpen(false)}>
              <Text style={styles.todayText}>Xong ({time})</Text>
            </Pressable>
          </View>
        )}

        {/* DANH MỤC */}
        <Text style={styles.label}>Danh mục</Text>
        <View style={styles.categoryRow}>
          {categories.map(item => (
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

        {/* ƯU TIÊN */}
        <Text style={styles.label}>Mức ưu tiên</Text>
        <View style={styles.priorityRow}>
          {['Cao', 'Trung bình', 'Thấp'].map(item => (
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

        {/* NHẮC NHỞ */}
        <Text style={styles.label}>Nhắc nhở trước hạn</Text>
        <View style={styles.reminderRow}>
          {[...PRESET_REMINDERS, CUSTOM].map(item => (
            <Pressable
              key={item}
              onPress={() => {
                setReminderChoice(item);
                setError('');
              }}
              style={[
                styles.reminderButton,
                reminderChoice === item && styles.reminderActive,
              ]}
            >
              <Text
                style={[
                  styles.reminderText,
                  reminderChoice === item && styles.reminderTextActive,
                ]}
              >
                {item}
              </Text>
            </Pressable>
          ))}
        </View>

        {reminderChoice === CUSTOM && (
          <View style={styles.customBox}>
            <Text style={styles.customLabel}>Nhắc trước</Text>

            <View style={styles.customRow}>
              <TextInput
                style={styles.customInput}
                value={customAmount}
                onChangeText={text => setCustomAmount(text.replace(/[^0-9]/g, ''))}
                placeholder="Ví dụ: 45"
                placeholderTextColor="#7FAF9F"
                keyboardType="number-pad"
                maxLength={4}
              />

              <View style={styles.unitRow}>
                {UNITS.map(u => (
                  <Pressable
                    key={u}
                    onPress={() => setCustomUnit(u)}
                    style={[
                      styles.unitButton,
                      customUnit === u && styles.unitActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.unitText,
                        customUnit === u && styles.unitTextActive,
                      ]}
                    >
                      {u}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <Text style={styles.customHint}>
              {customAmount
                ? `Sẽ nhắc trước ${customAmount} ${customUnit} so với giờ hạn.`
                : 'Nhập một số nguyên lớn hơn 0.'}
            </Text>
          </View>
        )}

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
  container: { flex: 1, backgroundColor: '#F4FBF8' },
  content: { paddingHorizontal: 22, paddingTop: 14 },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F4FBF8',
  },
  text: { color: '#245747', fontSize: 15 },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -6,
  },
  back: { fontSize: 30, color: '#245747' },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#245747' },

  label: { fontSize: 14, color: '#31594C', marginBottom: 7, marginTop: 6 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#31594C',
    marginBottom: 14,
  },
  row: { flexDirection: 'row', gap: 12 },

  dateButton: {
    height: 48,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateButtonText: { color: '#31594C', fontSize: 15 },
  calendarIcon: { color: '#35B979', fontSize: 20 },

  calendar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 14,
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
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#E4F7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#245747', fontSize: 26 },
  monthTitle: { color: '#245747', fontWeight: '700', fontSize: 16 },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    color: '#7B8C84',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: '14.2857%',
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  dayText: { fontSize: 14, color: '#31594C' },
  selectedDay: { backgroundColor: '#35B979' },
  selectedDayText: { color: '#FFFFFF', fontWeight: '700' },
  todayDay: { borderWidth: 1.5, borderColor: '#35B979' },
  todayDayText: { color: '#20875B', fontWeight: '700' },
  todayButton: {
    marginTop: 10,
    backgroundColor: '#E4F7ED',
    borderRadius: 10,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayText: { color: '#20875B', fontSize: 14, fontWeight: '600' },

  wheelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  wheelColon: { fontSize: 28, fontWeight: '700', color: '#245747' },

  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  categoryButton: {
    flexGrow: 1,
    flexBasis: '40%',
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4F1EB',
  },
  categoryActive: { backgroundColor: '#35B979', borderColor: '#35B979' },
  categoryText: { fontSize: 14, color: '#568878' },
  categoryTextActive: { color: '#FFFFFF', fontWeight: '700' },

  priorityRow: { flexDirection: 'row', gap: 9, marginBottom: 14 },
  priorityButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4F1EB',
  },
  priorityActive: { backgroundColor: '#35B979', borderColor: '#35B979' },
  priorityText: { fontSize: 14, color: '#568878' },
  priorityTextActive: { color: '#FFFFFF', fontWeight: '600' },

  reminderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 14,
  },
  reminderButton: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E4F1EB',
  },
  reminderActive: { backgroundColor: '#35B979', borderColor: '#35B979' },
  reminderText: { fontSize: 14, color: '#568878' },
  reminderTextActive: { color: '#FFFFFF', fontWeight: '600' },

  customBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  customLabel: { fontSize: 13, color: '#31594C', marginBottom: 8 },
  customRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  customInput: {
    width: 96,
    height: 46,
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    fontSize: 16,
    color: '#31594C',
    textAlign: 'center',
  },
  unitRow: { flex: 1, flexDirection: 'row', gap: 8 },
  unitButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#F0F7F3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitActive: { backgroundColor: '#35B979' },
  unitText: { fontSize: 14, color: '#568878' },
  unitTextActive: { color: '#FFFFFF', fontWeight: '700' },
  customHint: { fontSize: 12, color: '#84928E', marginTop: 10 },

  error: { color: '#D84336', fontSize: 14, marginBottom: 12 },

  saveButton: {
    minHeight: 52,
    backgroundColor: '#35B979',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  saveText: { color: '#FFFFFF', fontWeight: '700', fontSize: 16 },
  cancelButton: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  cancelText: { color: '#6F8B80', fontSize: 15 },
});