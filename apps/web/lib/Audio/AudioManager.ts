import { Howl, Howler } from "howler";
import { createLogger } from "../logger";
import { type AudioSettings } from "../settings";

const log = createLogger("AudioManager");

type SoundCategory = "music" | "sfx";

export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl>;
  private categories: Map<string, SoundCategory>;

  private masterVolume = 1;
  private musicVolume = 0.1;
  private sfxVolume = 0.7;
  private audioUnlocked = false;

  private constructor() {
    this.sounds = new Map();
    this.categories = new Map();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public async initAfterUserGesture(): Promise<void> {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
  }

  private normalizeUrl(url: string): string {
    return url.trim().startsWith("/") ? url.trim() : `/${url.trim()}`;
  }

  /*
   * This function plays a sound based on a URL from Next.js public assets (/audio/...)
   */
  public play(url: string) {
    const normalized = this.normalizeUrl(url);

    const path = normalized.replace(/^\/+/, "").toLowerCase();
    const category: SoundCategory =
      path.startsWith("audio/music/") || path.startsWith("music/")
        ? "music"
        : "sfx";

    if (!this.sounds.get(normalized)) {
      this.loadSound(normalized, normalized, category, category === "music");
    }

    this.playSound(normalized);
  }

  public loadSound(
    name: string,
    src: string,
    category: SoundCategory = "sfx",
    loop = false,
  ): void {
    const baseVolume = category == "music" ? this.musicVolume : this.sfxVolume;
    const sound = new Howl({
      src,
      loop,
      volume: baseVolume * this.masterVolume,
    });

    this.sounds.set(name, sound);
    this.categories.set(name, category);
  }

  public playSound(name: string): void {
    if (!this.audioUnlocked) {
      log.debug("playSound ignored: audio still locked", { name });
      return;
    }

    const sound = this.sounds.get(name);
    if (!sound) {
      log.error(`Sound with name "${name}" not found.`);
      return;
    }

    const category = this.categories.get(name) ?? "sfx";

    if (category === "music") {
      if (sound.playing()) return;

      // Stop any other currently playing music before starting this one
      for (const [otherName, otherSound] of this.sounds.entries()) {
        if (otherName === name) continue;
        const otherCategory = this.categories.get(otherName) ?? "sfx";
        if (otherCategory === "music" && otherSound.playing()) {
          otherSound.stop();
        }
      }
    }

    sound.play();
  }

  public stopSound(name: string): void {
    const sound = this.sounds.get(name);
    if (!sound) {
      console.error(`Sound with name "${name}" not found.`);
      return;
    }
    sound.stop();
  }

  /**
   * Pause or resume a loaded sound by URL.
   * paused=true  -> pause
   * paused=false -> resume
   */
  public setPausedByUrl(url: string, paused: boolean): void {
    const normalized = this.normalizeUrl(url);
    const sound = this.sounds.get(normalized);

    if (!sound) {
      log.error(`Sound with url "${normalized}" not found.`);
      return;
    }

    if (paused) {
      if (sound.playing()) sound.pause();
      return;
    }

    const category = this.categories.get(normalized) ?? "sfx";
    if (category === "music") {
      // Keep only one music track active
      for (const [otherName, otherSound] of this.sounds.entries()) {
        if (otherName === normalized) continue;
        const otherCategory = this.categories.get(otherName) ?? "sfx";
        if (otherCategory === "music" && otherSound.playing()) {
          otherSound.stop();
        }
      }
    }

    if (!sound.playing()) {
      sound.play(); // resumes from paused position when paused
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.refreshPerSoundVolumes();
  }

  public setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.refreshPerSoundVolumes("music");
  }

  public setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.refreshPerSoundVolumes("sfx");
  }

  public getAudioSettings(): AudioSettings {
    return {
      master: this.masterVolume,
      music: this.musicVolume,
      sfx: this.sfxVolume,
    };
  }

  private refreshPerSoundVolumes(filter?: SoundCategory): void {
    for (const [name, sound] of this.sounds.entries()) {
      const category = this.categories.get(name) ?? "sfx";
      if (filter && category !== filter) continue;

      const base = category === "music" ? this.musicVolume : this.sfxVolume;
      sound.volume(base * this.masterVolume);
    }
  }
}
