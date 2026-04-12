import { Vibration } from 'react-native';

let vibrationEnabled = true;

export function setVibrationEnabled(v) { vibrationEnabled = v; }
export function getVibrationEnabled() { return vibrationEnabled; }

const PATTERNS = {
  tap: [0, 10],
  correct: [0, 30, 50, 30],
  wrong: [0, 50, 30, 50, 30, 50],
  flip: [0, 15],
  complete: [0, 50, 80, 50, 80, 50, 80, 100],
  draw: [0, 12],
};

export function playHaptic(event) {
  if (!vibrationEnabled) return;
  const pattern = PATTERNS[event];
  if (pattern) Vibration.vibrate(pattern);
}
