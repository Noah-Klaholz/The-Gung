export interface AudioSettings {
  master: number;
  music: number;
  sfx: number;
}

export interface AppSettings {
  audio: AudioSettings;
}

export const SETTINGS_STORAGE_KEY = "the-gung-settings";

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  master: 1,
  music: 0.1,
  sfx: 0.7,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  audio: DEFAULT_AUDIO_SETTINGS,
};

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(0, Math.min(1, value));
}

function normalizeAudioSettings(value: Partial<AudioSettings> | undefined): AudioSettings {
  return {
    master: clampVolume(value?.master ?? DEFAULT_AUDIO_SETTINGS.master),
    music: clampVolume(value?.music ?? DEFAULT_AUDIO_SETTINGS.music),
    sfx: clampVolume(value?.sfx ?? DEFAULT_AUDIO_SETTINGS.sfx),
  };
}

export function loadAppSettings(): AppSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APP_SETTINGS;
  }

  const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) return DEFAULT_APP_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      audio: normalizeAudioSettings(parsed.audio),
    };
  } catch {
    return DEFAULT_APP_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(
    SETTINGS_STORAGE_KEY,
    JSON.stringify({
      audio: normalizeAudioSettings(settings.audio),
    }),
  );
}
