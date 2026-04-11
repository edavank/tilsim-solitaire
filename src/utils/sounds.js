import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

// Sound enabled flag (loaded from settings)
let soundEnabled = true;
let vibrationEnabled = true;

export function setSoundEnabled(v) { soundEnabled = v; }
export function setVibrationEnabled(v) { vibrationEnabled = v; }

// Haptic patterns for different events
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

// Audio sounds (will be loaded when audio files are added to assets/sounds/)
const sounds = {};

export async function loadSounds() {
  // Placeholder: when audio files are added, load them here
  // Example:
  // try {
  //   const { sound } = await Audio.Sound.createAsync(require('../assets/sounds/tap.mp3'));
  //   sounds.tap = sound;
  // } catch (e) {}
  await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
}

export async function playSound(event) {
  if (!soundEnabled) return;
  try {
    if (sounds[event]) {
      await sounds[event].replayAsync();
    }
  } catch (e) { /* silently fail */ }
  // Always play haptic as fallback
  playHaptic(event);
}

export async function unloadSounds() {
  for (const key in sounds) {
    try { await sounds[key].unloadAsync(); } catch (e) {}
  }
}
