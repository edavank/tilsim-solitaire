import { Audio } from 'expo-av';
import { Vibration } from 'react-native';

let soundEnabled = true;
let vibrationEnabled = true;
const sounds = {};

export function setSoundEnabled(v) { soundEnabled = v; }
export function getSoundEnabled() { return soundEnabled; }
export function setVibrationEnabled(v) { vibrationEnabled = v; }
export function getVibrationEnabled() { return vibrationEnabled; }

// Haptic patterns
const HAPTIC = {
  tap: [0, 10],
  correct: [0, 30, 50, 30],
  wrong: [0, 50, 30, 50, 30, 50],
  flip: [0, 15],
  complete: [0, 50, 80, 50, 80, 50, 80, 100],
  draw: [0, 12],
  win: [0, 80, 100, 80, 100, 80],
  lose: [0, 100, 50, 100],
  unlock: [0, 30, 40, 30],
  coin: [0, 20, 30, 20],
};

// Sound file mapping
const SOUND_FILES = {
  tap: require('../../assets/sounds/tap.mp3'),
  flip: require('../../assets/sounds/flip.mp3'),
  correct: require('../../assets/sounds/correct.mp3'),
  wrong: require('../../assets/sounds/wrong.wav'),
  draw: require('../../assets/sounds/draw.wav'),
  complete: require('../../assets/sounds/complete.wav'),
  win: require('../../assets/sounds/win.wav'),
  unlock: require('../../assets/sounds/unlock.mp3'),
  coin: require('../../assets/sounds/coin.mp3'),
  lose: require('../../assets/sounds/lose.mp3'),
};

export async function loadSounds() {
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    // Pre-load all sounds
    for (const [key, file] of Object.entries(SOUND_FILES)) {
      try {
        const { sound } = await Audio.Sound.createAsync(file, { shouldPlay: false, volume: 0.7 });
        sounds[key] = sound;
      } catch (e) {
        // Skip if sound file can't be loaded
      }
    }
  } catch (e) {
    // Audio not available (web or some devices)
  }
}

export function playHaptic(event) {
  if (!vibrationEnabled) return;
  const pattern = HAPTIC[event] || HAPTIC.tap;
  Vibration.vibrate(pattern);
}

export async function playSound(event) {
  // Always play haptic
  playHaptic(event);
  
  // Play audio if enabled
  if (!soundEnabled) return;
  try {
    const sound = sounds[event];
    if (sound) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
    }
  } catch (e) {
    // Silently fail
  }
}

export async function unloadSounds() {
  for (const key in sounds) {
    try { await sounds[key].unloadAsync(); } catch (e) {}
  }
}
