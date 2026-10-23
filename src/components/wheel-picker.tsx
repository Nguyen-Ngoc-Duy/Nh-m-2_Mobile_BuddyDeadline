import { useEffect, useRef } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const ITEM_HEIGHT = 44;
const VISIBLE = 5; // số dòng nhìn thấy, dòng giữa là dòng được chọn

type Props = {
  items: string[];
  value: string;
  onChange: (value: string) => void;
};

export function WheelPicker({ items, value, onChange }: Props) {
  const ref = useRef<ScrollView>(null);

  // Cuộn tới giá trị hiện tại khi vừa mở
  useEffect(() => {
    const index = Math.max(0, items.indexOf(value));
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: index * ITEM_HEIGHT, animated: false });
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(y / ITEM_HEIGHT)));
    if (items[i] !== value) onChange(items[i]);
  };

  return (
    <View style={styles.wrap}>
      {/* Dải làm nổi dòng đang chọn */}
      <View pointerEvents="none" style={styles.band} />

      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * Math.floor(VISIBLE / 2) }}
      >
        {items.map((item, i) => (
          <Pressable
            key={item}
            style={styles.item}
            onPress={() => {
              ref.current?.scrollTo({ y: i * ITEM_HEIGHT, animated: true });
              onChange(item);
            }}
          >
            <Text style={[styles.text, item === value && styles.textActive]}>
              {item}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 90,
    height: ITEM_HEIGHT * VISIBLE,
    overflow: 'hidden',
  },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: ITEM_HEIGHT * Math.floor(VISIBLE / 2),
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: '#E4F7ED',
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 20, color: '#9BB5AA' },
  textActive: { fontSize: 24, fontWeight: '700', color: '#245747' },
});