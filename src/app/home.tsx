import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { rescheduleAll } from '@/lib/reminders';
import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';
import { listDeadlines, type Deadline } from '@/storage/deadlines';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(date: string): string {
  const p = date.split('-');
  if (p.length !== 3) return date;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function getWeekday(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return DAYS[(new Date(y, m - 1, d).getDay() + 6) % 7];
}

function getPriorityColor(priority: string): string {
  if (priority === 'Cao') return '#E53935';
  if (priority === 'Thấp') return '#8BC34A';
  return '#4787D8';
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('Bạn');
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);

  const [displayMonth, setDisplayMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const [selectedDate, setSelectedDate] = useState(() =>
    getLocalDateString(new Date())
  );

  const todayString = getLocalDateString(new Date());

  const loadData = useCallback(async () => {
    try {
      const [{ data: { user } }, list] = await Promise.all([
        supabase.auth.getUser(),
        listDeadlines(),
      ]);
      setName(user?.user_metadata?.name || 'Bạn');
      setDeadlines(list);
    } catch (error: any) {
      console.error('Không thể tải dữ liệu:', error);
      notify('Thông báo', error?.message ?? 'Không thể tải dữ liệu deadline.');
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const changeMonth = (amount: number) => {
    const next = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth() + amount,
      1
    );
    setDisplayMonth(next);

    const now = new Date();
    const isCurrent =
      next.getFullYear() === now.getFullYear() &&
      next.getMonth() === now.getMonth();

    setSelectedDate(
      isCurrent ? getLocalDateString(now) : getLocalDateString(next)
    );
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(getLocalDateString(now));
  };

  const monthName = `Tháng ${displayMonth.getMonth() + 1}, ${displayMonth.getFullYear()}`;

  const pending = deadlines.filter(item => !item.completed);
  const completed = deadlines.filter(item => item.completed);

  const selectedDeadlines = deadlines
    .filter(item => item.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Hai deadline chưa xong gần nhất, bỏ những cái đã hiện ở ngày đang chọn
  const upcoming = pending
    .filter(item => item.date >= todayString && item.date !== selectedDate)
    .sort((a, b) => {
      const c = a.date.localeCompare(b.date);
      return c !== 0 ? c : a.time.localeCompare(b.time);
    })
    .slice(0, 2);

  const renderCard = (item: Deadline, showStatus: boolean) => (
    <Pressable
      key={item.id}
      style={styles.deadlineCard}
      onPress={() => router.push('/deadlines')}
      accessibilityRole="button"
      accessibilityLabel={`Xem deadline ${item.title}`}
    >
      <View style={styles.deadlineInfo}>
        <Text
          style={[styles.deadlineTitle, item.completed && styles.completedTitle]}
        >
          {item.title}
        </Text>
        <Text style={styles.category}>{item.category || 'Cá nhân'}</Text>
        <Text style={styles.date}>Hạn: {formatDisplayDate(item.date)}</Text>
      </View>

      <View style={styles.deadlineRight}>
        <Text
          style={[styles.priority, { color: getPriorityColor(item.priority) }]}
        >
          {item.priority || 'Trung bình'}
        </Text>
        <Text style={styles.time}>{item.time || '18:00'}</Text>
        {showStatus && (
          <Text
            style={[styles.status, item.completed && styles.completedStatus]}
          >
            {item.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
          </Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 90 + insets.bottom }}
      >
        {/* LỜI CHÀO */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>Xin chào, {name}! 👋</Text>
            <Text style={styles.headerSub}>Hôm nay có gì cần làm?</Text>
          </View>

          <Pressable
            style={styles.notificationButton}
            onPress={() => router.push('/deadlines')}
            accessibilityRole="button"
            accessibilityLabel="Xem danh sách deadline"
          >
            <Text style={styles.bell}>♧</Text>
          </Pressable>
        </View>

        {/* ĐIỀU HƯỚNG LỊCH */}
        <View style={styles.monthHeader}>
          <Pressable onPress={goToCurrentMonth} accessibilityRole="button">
            <Text style={styles.monthTitle}>{monthName}</Text>
          </Pressable>

          <View style={styles.monthControls}>
            <Pressable
              style={styles.monthArrowButton}
              onPress={() => changeMonth(-1)}
              accessibilityLabel="Tháng trước"
            >
              <Text style={styles.arrows}>‹</Text>
            </Pressable>
            <Pressable
              style={styles.monthArrowButton}
              onPress={() => changeMonth(1)}
              accessibilityLabel="Tháng sau"
            >
              <Text style={styles.arrows}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* LỊCH */}
        <View style={styles.calendar}>
          <View style={styles.weekRow}>
            {DAYS.map(day => (
              <Text key={day} style={styles.weekText}>
                {day}
              </Text>
            ))}
          </View>

          <CalendarMonth
            year={displayMonth.getFullYear()}
            month={displayMonth.getMonth()}
            todayString={todayString}
            selectedDate={selectedDate}
            deadlines={deadlines}
            onSelectDate={setSelectedDate}
          />

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={styles.todayLegend} />
              <Text style={styles.legendText}>Hôm nay</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={styles.deadlineLegend} />
              <Text style={styles.legendText}>Có deadline chưa xong</Text>
            </View>
          </View>
        </View>

        {/* DEADLINE TRONG NGÀY */}
        <View style={styles.selectedHeader}>
          <View style={styles.selectedHeaderText}>
            <Text style={styles.sectionTitle}>Deadline trong ngày</Text>
            <Text style={styles.selectedDate}>
              {getWeekday(selectedDate)}, {formatDisplayDate(selectedDate)}
            </Text>
          </View>

          <Pressable
            style={styles.addSmallButton}
            onPress={() => router.push('/add-deadline')}
            accessibilityLabel="Thêm deadline"
          >
            <Text style={styles.addSmallText}>+ Thêm</Text>
          </Pressable>
        </View>

        {selectedDeadlines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Chưa có deadline trong ngày này</Text>
            <Pressable
              style={styles.emptyAddButton}
              onPress={() => router.push('/add-deadline')}
            >
              <Text style={styles.emptyAddText}>+ Thêm deadline</Text>
            </Pressable>
          </View>
        ) : (
          selectedDeadlines.map(item => renderCard(item, true))
        )}

        {/* TIẾN ĐỘ */}
        <Text style={styles.sectionTitle}>Tiến độ của bạn</Text>

        <View style={styles.progressRow}>
          <View style={styles.progressCard}>
            <Text style={styles.redNumber}>{pending.length}</Text>
            <Text style={styles.progressText}>Cần hoàn thành</Text>
          </View>
          <View style={styles.progressCard}>
            <Text style={styles.greenNumber}>{completed.length}</Text>
            <Text style={styles.progressText}>Đã hoàn thành</Text>
          </View>
        </View>

        {/* SẮP ĐẾN HẠN */}
        <View style={styles.deadlineHeader}>
          <Text style={styles.sectionTitle}>Sắp đến hạn</Text>
          <Pressable
            onPress={() => router.push('/deadlines')}
            accessibilityLabel="Xem tất cả deadline"
          >
            <Text style={styles.viewAll}>Xem tất cả</Text>
          </Pressable>
        </View>

        {upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Không còn deadline nào sắp đến hạn</Text>
          </View>
        ) : (
          upcoming.map(item => renderCard(item, false))
        )}
      </ScrollView>

      {/* THANH ĐIỀU HƯỚNG */}
      <View
        style={[
          styles.bottomNav,
          { height: 62 + insets.bottom, paddingBottom: insets.bottom },
        ]}
      >
        <Pressable style={styles.navItem} onPress={() => router.replace('/home')}>
          <Text style={[styles.navIcon, styles.navIconActive]}>⌂</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/deadlines')}>
          <Text style={styles.navIcon}>☰</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/add-deadline')}>
          <Text style={styles.navIcon}>⊞</Text>
        </Pressable>
        <Pressable style={styles.navItem} onPress={() => router.push('/profile')}>
          <Text style={styles.navIcon}>♙</Text>
        </Pressable>
      </View>
    </View>
  );
}

function CalendarMonth({
  year,
  month,
  todayString,
  selectedDate,
  deadlines,
  onSelectDate,
}: {
  year: number;
  month: number;
  todayString: string;
  selectedDate: string;
  deadlines: Deadline[];
  onSelectDate: (date: string) => void;
}) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((offset + totalDays) / 7) * 7;

  const cells: (number | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - offset + 1;
    return day >= 1 && day <= totalDays ? day : null;
  });

  return (
    <View style={styles.calendarGrid}>
      {cells.map((day, index) => {
        if (day === null) {
          return <View key={`empty-${index}`} style={styles.dayCell} />;
        }

        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateString === todayString;
        const isSelected = dateString === selectedDate;
        const hasDeadline = deadlines.some(
          item => item.date === dateString && !item.completed
        );

        return (
          <Pressable
            key={dateString}
            style={styles.dayCell}
            onPress={() => onSelectDate(dateString)}
            accessibilityRole="button"
            accessibilityLabel={`${day}/${month + 1}/${year}${hasDeadline ? ', có deadline' : ''}`}
            accessibilityState={{ selected: isSelected }}
          >
            <View
              style={[
                styles.dayCircle,
                isToday && styles.todayCell,
                isSelected && styles.selectedCell,
                isToday && isSelected && styles.todaySelectedCell,
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  isToday && styles.todayText,
                  isSelected && styles.selectedText,
                ]}
              >
                {day}
              </Text>
            </View>

            {hasDeadline ? (
              <View style={[styles.dot, isSelected && styles.selectedDot]} />
            ) : (
              <View style={styles.dotPlaceholder} />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4FBF8' },

  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerText: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#245747' },
  headerSub: { marginTop: 4, fontSize: 14, color: '#68A991' },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bell: { fontSize: 28, color: '#245747' },

  monthHeader: {
    paddingHorizontal: 20,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#245747' },
  monthControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthArrowButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrows: { fontSize: 30, color: '#4A806D' },

  calendar: {
    marginHorizontal: 14,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingTop: 14,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 16,
  },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#75827E',
  },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { fontSize: 14, color: '#355B4E' },
  todayCell: { borderWidth: 1.5, borderColor: '#35B979' },
  todayText: { color: '#245747', fontWeight: '700' },
  selectedCell: { backgroundColor: '#35B979' },
  selectedText: { color: '#FFFFFF', fontWeight: '700' },
  todaySelectedCell: { borderWidth: 2, borderColor: '#168A58' },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E77A62',
    marginTop: 2,
  },
  selectedDot: { backgroundColor: '#35B979' },
  dotPlaceholder: { height: 7 },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  todayLegend: {
    width: 11,
    height: 11,
    borderWidth: 1.5,
    borderColor: '#35B979',
    borderRadius: 6,
  },
  deadlineLegend: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#E77A62',
  },
  legendText: { fontSize: 12, color: '#84928E' },

  selectedHeader: {
    marginTop: 4,
    paddingRight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectedHeaderText: { flex: 1 },
  selectedDate: { marginLeft: 20, marginTop: 4, fontSize: 13, color: '#65AA96' },
  addSmallButton: {
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: '#DDF4E9',
  },
  addSmallText: { fontSize: 14, color: '#168A58', fontWeight: '600' },

  sectionTitle: {
    marginLeft: 20,
    marginTop: 22,
    fontSize: 17,
    fontWeight: '700',
    color: '#245747',
  },

  progressRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 14 },
  progressCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 10,
  },
  redNumber: { color: '#E54A2F', fontSize: 26, fontWeight: '700' },
  greenNumber: { color: '#8CC63F', fontSize: 26, fontWeight: '700' },
  progressText: { color: '#78827F', fontSize: 13, marginTop: 4 },

  deadlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 20,
  },
  viewAll: { marginTop: 22, color: '#20A96D', fontSize: 14, fontWeight: '600' },

  deadlineCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  deadlineInfo: { flex: 1 },
  deadlineRight: { alignItems: 'flex-end', marginLeft: 12 },
  deadlineTitle: { fontSize: 15, fontWeight: '600', color: '#355B4E' },
  completedTitle: { textDecorationLine: 'line-through', color: '#84928E' },
  category: { fontSize: 12, color: '#7C8985', marginTop: 3 },
  date: { fontSize: 12, color: '#55A083', marginTop: 5 },
  priority: { fontSize: 13, fontWeight: '600' },
  time: { fontSize: 13, color: '#66756F', marginTop: 5 },
  status: { fontSize: 12, color: '#7B8581', marginTop: 5 },
  completedStatus: { color: '#20A96D' },

  emptyCard: {
    marginHorizontal: 16,
    marginTop: 10,
    padding: 24,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    alignItems: 'center',
  },
  emptyText: { color: '#8A9692', fontSize: 14, textAlign: 'center' },
  emptyAddButton: {
    marginTop: 12,
    minHeight: 40,
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#DDF4E9',
    borderRadius: 20,
  },
  emptyAddText: { color: '#168A58', fontSize: 14, fontWeight: '600' },

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
  navIcon: { fontSize: 28, color: '#4D9D7D' },
  navIconActive: { color: '#35B979' },
});