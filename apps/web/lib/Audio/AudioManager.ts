import { Howl, Howler } from 'howler';

type SoundCategory = "music" | "sfx";

export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl>;
  private categories: Map<string, SoundCategory>;

  private masterVolume = 1;
  private musicVolume = 0.5;
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

    try {
      if (Howler.ctx?.state !== "running") {
        await Howler.ctx.resume();
      }
    } catch {
      // keep locked if resume fails
      return;
    }

    this.audioUnlocked = true;
  }

  public loadSound(name: string, src: string, category: SoundCategory = "sfx", loop = false): void {
    const baseVolume = category == "music" ? this.musicVolume : this.sfxVolume;
    const sound = new Howl({ src, loop, volume: baseVolume * this.masterVolume });

    this.sounds.set(name, sound);
    this.categories.set(name, category);
  }

  public playSound(name: string): void {
    if(!this.audioUnlocked) return; // Autoplay guard: Most browsers block autoplay until first user gesture

    const sound = this.sounds.get(name);
    if (!sound) {
      console.error(`Sound with name "${name}" not found.`);
      return;
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

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.refreshPerSoundVolumes();
  }

  public setMusicVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.refreshPerSoundVolumes("music");
  }

  public setSfxVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.refreshPerSoundVolumes("sfx");
  }

  private refreshPerSoundVolumes(filter?: SoundCategory): void {
    for (const [ name, sound ] of this.sounds.entries()) {
      const category = this.categories.get(name) ?? "sfx";
      if (filter && category !== filter) continue;

      const base = category === "music" ? this.musicVolume : this.sfxVolume;
      sound.volume(base * this.masterVolume);
    }
  }


}