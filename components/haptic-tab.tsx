import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

const triggerTabHaptic = () => {
  if (process.env.EXPO_OS !== 'ios') {
    return;
  }

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
    // Haptics are optional and may be unavailable in an out-of-date dev client.
  });
};

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        triggerTabHaptic();
        props.onPressIn?.(ev);
      }}
    />
  );
}
