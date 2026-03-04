import { Howl, Howler } from 'howler';

export class AudioManager {
  private static instance: AudioManager;
  private sounds: Map<string, Howl>;

  private constructor() {
    this.sounds = new Map();
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public loadSound(name: string, src: string): void {
    if (this.sounds.has(name)) {
      console.warn(`Sound with name "${name}" already exists. Overwriting.`);
    }
    const sound = new Howl({ src });
    this.sounds.set(name, sound);
  }

  public playSound(name: string): void {
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

  public setVolume(volume: number): void {
    Howler.volume(volume);
  }
}