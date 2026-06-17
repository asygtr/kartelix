const canVibrate = () =>
  typeof navigator !== 'undefined' && 'vibrate' in navigator;

export const useHaptic = () => ({
  light:   () => canVibrate() && navigator.vibrate(8),
  medium:  () => canVibrate() && navigator.vibrate(18),
  heavy:   () => canVibrate() && navigator.vibrate([20, 40, 20]),
  success: () => canVibrate() && navigator.vibrate([8, 30, 8]),
  error:   () => canVibrate() && navigator.vibrate([20, 60, 20]),
});
