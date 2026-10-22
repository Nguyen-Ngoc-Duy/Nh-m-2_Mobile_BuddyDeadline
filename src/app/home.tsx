import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { notify } from '@/lib/notify';
import { supabase } from '@/lib/supabase';
import { listDeadlines, type Deadline } from '@/storage/deadlines';

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function getLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: string): string {
  const parts = date.split('-');

  if (parts.length !== 3) return date;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function getWeekday(date: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const weekday = new Date(year, month - 1, day).getDay();

  return DAYS[(weekday + 6) % 7];
}

function getPriorityColor(priority: string): string {
  if (priority === 'Cao') return '#E53935';
  if (priority === 'Thấp') return '#8BC34A';

  return '#4787D8';
}

export default function HomeScreen() {
  const router = useRouter();

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

  // Đọc tên người dùng và deadline từ Supabase.
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

  // Tự tải lại dữ liệu mỗi khi quay về trang chủ.
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Chuyển tháng trước hoặc tháng sau.
  const changeMonth = (amount: number) => {
    const nextMonth = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth() + amount,
      1
    );

    setDisplayMonth(nextMonth);

    // Nếu là tháng hiện tại thì chọn hôm nay, ngược lại chọn ngày 1.
    const now = new Date();
    const isCurrentMonth =
      nextMonth.getFullYear() === now.getFullYear() &&
      nextMonth.getMonth() === now.getMonth();

    setSelectedDate(
      isCurrentMonth ? getLocalDateString(now) : getLocalDateString(nextMonth)
    );
  };

  // Quay lại tháng hiện tại.
  const goToCurrentMonth = () => {
    const now = new Date();

    setDisplayMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(getLocalDateString(now));
  };

  const monthName = `Tháng ${displayMonth.getMonth() + 1}, ${displayMonth.getFullYear()}`;

  const pending = deadlines.filter(item => !item.completed);
  const completed = deadlines.filter(item => item.completed);

  // Deadline của ngày được chọn trên lịch.
  const selectedDeadlines = deadlines
    .filter(item => item.date === selectedDate)
    .sort((a, b) => a.time.localeCompare(b.time));

  // Hai deadline chưa hoàn thành gần nhất.
  const upcoming = pending
    .filter(item => item.date >= todayString)
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    })
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
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
          <Pressable
            onPress={goToCurrentMonth}
            accessibilityRole="button"
            accessibilityLabel="Quay về tháng hiện tại"
          >
            <Text style={styles.monthTitle}>{monthName}</Text>
          </Pressable>

          <View style={styles.monthControls}>
            <Pressable
              style={styles.monthArrowButton}
              onPress={() => changeMonth(-1)}
              accessibilityRole="button"
              accessibilityLabel="Tháng trước"
            >
              <Text style={styles.arrows}>‹</Text>
            </Pressable>

            <Pressable
              style={styles.monthArrowButton}
              onPress={() => changeMonth(1)}
              accessibilityRole="button"
              accessibilityLabel="Tháng sau"
            >
              <Text style={styles.arrows}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* LỊCH CÓ THỂ CHỌN NGÀY */}
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

        {/* DEADLINE TRONG NGÀY ĐANG CHỌN */}
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
            accessibilityRole="button"
            accessibilityLabel="Thêm deadline"
          >
            <Text style={styles.addSmallText}>+ Thêm</Text>
          </Pressable>
        </View>

        {selectedDeadlines.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Chưa có deadline trong ngày này
            </Text>

            <Pressable
              style={styles.emptyAddButton}
              onPress={() => router.push('/add-deadline')}
            >
              <Text style={styles.emptyAddText}>+ Thêm deadline</Text>
            </Pressable>
          </View>
        ) : (
          selectedDeadlines.map(item => (
            <Pressable
              key={item.id}
              style={styles.deadlineCard}
              onPress={() => router.push('/deadlines')}
              accessibilityRole="button"
              accessibilityLabel={`Xem deadline ${item.title}`}
            >
              <View style={styles.deadlineInfo}>
                <Text
                  style={[
                    styles.deadlineTitle,
                    item.completed && styles.completedTitle,
                  ]}
                >
                  {item.title}
                </Text>

                <Text style={styles.category}>
                  {item.category || 'Cá nhân'}
                </Text>

                <Text style={styles.date}>
                  Hạn: {formatDisplayDate(item.date)}
                </Text>
              </View>

              <View style={styles.deadlineRight}>
                <Text
                  style={[
                    styles.priority,
                    { color: getPriorityColor(item.priority) },
                  ]}
                >
                  {item.priority || 'Trung bình'}
                </Text>

                <Text style={styles.time}>{item.time || '18:00'}</Text>

                <Text
                  style={[
                    styles.status,
                    item.completed && styles.completedStatus,
                  ]}
                >
                  {item.completed ? 'Đã hoàn thành' : 'Chưa hoàn thành'}
                </Text>
              </View>
            </Pressable>
          ))
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

        {/* DEADLINE SẮP ĐẾN HẠN */}
        <View style={styles.deadlineHeader}>
          <Text style={styles.sectionTitle}>Sắp đến hạn</Text>

          <Pressable
            onPress={() => router.push('/deadlines')}
            accessibilityRole="button"
            accessibilityLabel="Xem tất cả deadline"
          >
            <Text style={styles.viewAll}>Xem tất cả</Text>
          </Pressable>
        </View>

        {upcoming.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              Chưa có deadline nào sắp đến hạn
            </Text>
          </View>
        ) : (
          upcoming.map(item => (
            <Pressable
              key={item.id}
              style={styles.deadlineCard}
              onPress={() => router.push('/deadlines')}
              accessibilityRole="button"
              accessibilityLabel={`Xem deadline ${item.title}`}
            >
              <View style={styles.deadlineInfo}>
                <Text style={styles.deadlineTitle}>{item.title}</Text>

                <Text style={styles.category}>
                  {item.category || 'Cá nhân'}
                </Text>

                <Text style={styles.date}>
                  Hạn: {formatDisplayDate(item.date)}
                </Text>
              </View>

              <View style={styles.deadlineRight}>
                <Text
                  style={[
                    styles.priority,
                    { color: getPriorityColor(item.priority) },
                  ]}
                >
                  {item.priority || 'Trung bình'}
                </Text>

                <Text style={styles.time}>{item.time || '18:00'}</Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* THANH ĐIỀU HƯỚNG DƯỚI CÙNG */}
      <View style={styles.bottomNav}>
        <Pressable
          style={styles.navItem}
          onPress={() => router.replace('/home')}
          accessibilityRole="button"
          accessibilityLabel="Trang chủ"
        >
          <Text style={[styles.navIcon, styles.navIconActive]}>⌂</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/deadlines')}
          accessibilityRole="button"
          accessibilityLabel="Danh sách deadline"
        >
          <Text style={styles.navIcon}>☰</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/add-deadline')}
          accessibilityRole="button"
          accessibilityLabel="Thêm deadline"
        >
          <Text style={styles.navIcon}>⊞</Text>
        </Pressable>

        <Pressable
          style={styles.navItem}
          onPress={() => router.push('/profile')}
          accessibilityRole="button"
          accessibilityLabel="Hồ sơ cá nhân"
        >
          <Text style={styles.navIcon}>♙</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* =========================
   LỊCH THÁNG
========================= */

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
  const firstDay = new Date(year, month, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const totalDays = new Date(year, month + 1, 0).getDate();

  const totalCells = Math.ceil((offset + totalDays) / 7) * 7;

  const cells: (number | null)[] = Array.from(
    { length: totalCells },
    (_, index) => {
      const day = index - offset + 1;
      return day >= 1 && day <= totalDays ? day : null;
    }
  );

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
            accessibilityLabel={`${day}/${month + 1}/${year}${
              hasDeadline ? ', có deadline' : ''
            }`}
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

/* =========================
   GIAO DIỆN
========================= */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4FBF8',
  },

  scrollContent: {
    paddingBottom: 85,
  },

  header: {
    paddingHorizontal: 18,
    paddingTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  headerText: {
    flex: 1,
  },

  greeting: {
    fontSize: 19,
    fontWeight: '700',
    color: '#245747',
  },

  headerSub: {
    marginTop: 4,
    fontSize: 12,
    color: '#68A991',
  },

  notificationButton: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bell: {
    fontSize: 25,
    color: '#245747',
  },

  monthHeader: {
    paddingHorizontal: 18,
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#245747',
  },

  monthControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  monthArrowButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  arrows: {
    fontSize: 27,
    color: '#4A806D',
  },

  calendar: {
    marginHorizontal: 13,
    marginTop: 14,
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 13,
  },

  weekRow: {
    flexDirection: 'row',
    marginBottom: 5,
  },

  weekText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontSize: 9,
    color: '#75827E',
  },

  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
  },

  dayCircle: {
    width: 27,
    height: 27,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dayText: {
    fontSize: 9,
    color: '#355B4E',
  },

  todayCell: {
    borderWidth: 1,
    borderColor: '#35B979',
  },

  todayText: {
    color: '#245747',
    fontWeight: '700',
  },

  selectedCell: {
    backgroundColor: '#35B979',
  },

  selectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  todaySelectedCell: {
    borderWidth: 2,
    borderColor: '#168A58',
  },

  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E77A62',
    marginTop: 1,
  },

  selectedDot: {
    backgroundColor: '#35B979',
  },

  dotPlaceholder: {
    height: 5,
  },

  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 18,
    marginTop: 8,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  todayLegend: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: '#35B979',
    borderRadius: 5,
  },

  deadlineLegend: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E77A62',
  },

  legendText: {
    fontSize: 9,
    color: '#84928E',
  },

  selectedHeader: {
    marginTop: 2,
    paddingRight: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  selectedHeaderText: {
    flex: 1,
  },

  selectedDate: {
    marginLeft: 18,
    marginTop: 4,
    fontSize: 11,
    color: '#65AA96',
  },

  addSmallButton: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#DDF4E9',
  },

  addSmallText: {
    fontSize: 11,
    color: '#168A58',
    fontWeight: '600',
  },

  sectionTitle: {
    marginLeft: 18,
    marginTop: 20,
    fontSize: 15,
    fontWeight: '700',
    color: '#245747',
  },

  progressRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 14,
  },

  progressCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 11,
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 8,
  },

  redNumber: {
    color: '#E54A2F',
    fontSize: 19,
    fontWeight: '700',
  },

  greenNumber: {
    color: '#8CC63F',
    fontSize: 19,
    fontWeight: '700',
  },

  progressText: {
    color: '#78827F',
    fontSize: 10,
    marginTop: 3,
  },

  deadlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: 18,
  },

  viewAll: {
    marginTop: 20,
    color: '#20A96D',
    fontSize: 10,
  },

  deadlineCard: {
    marginHorizontal: 18,
    marginTop: 7,
    padding: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#B9E5D5',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  deadlineInfo: {
    flex: 1,
  },

  deadlineRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },

  deadlineTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#355B4E',
  },

  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#84928E',
  },

  category: {
    fontSize: 9,
    color: '#7C8985',
    marginTop: 2,
  },

  date: {
    fontSize: 9,
    color: '#55A083',
    marginTop: 4,
  },

  priority: {
    fontSize: 9,
  },

  time: {
    fontSize: 9,
    color: '#66756F',
    marginTop: 5,
  },

  status: {
    fontSize: 9,
    color: '#7B8581',
    marginTop: 5,
  },

  completedStatus: {
    color: '#20A96D',
  },

  emptyCard: {
    marginHorizontal: 18,
    marginTop: 8,
    padding: 22,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    alignItems: 'center',
  },

  emptyText: {
    color: '#8A9692',
    fontSize: 11,
    textAlign: 'center',
  },

  emptyAddButton: {
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#DDF4E9',
    borderRadius: 18,
  },

  emptyAddText: {
    color: '#168A58',
    fontSize: 11,
    fontWeight: '600',
  },

  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 58,
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

  navIcon: {
    fontSize: 25,
    color: '#4D9D7D',
  },

  navIconActive: {
    color: '#35B979',
  },
});