import { BlurView } from 'expo-blur';
import { ReactNode } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface BottomSheetPanelProps {
  children: ReactNode;
  showHandle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function BottomSheetPanel({
  children,
  showHandle = true,
  style,
}: BottomSheetPanelProps) {
  return (
    <View style={[styles.panel, style]}>
      <BlurView intensity={55} pointerEvents="none" style={StyleSheet.absoluteFill} tint="light" />
      <View style={styles.content}>
        {showHandle ? <View style={styles.handle} /> : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.45)',
    backgroundColor: 'rgba(255,255,255,0.55)',
    overflow: 'hidden',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.14,
    shadowRadius: 30,
    elevation: 16,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
  },
  handle: {
    alignSelf: 'center',
    width: 46,
    height: 5,
    borderRadius: 999,
    marginBottom: 14,
    backgroundColor: 'rgba(17,17,17,0.14)',
  },
});
