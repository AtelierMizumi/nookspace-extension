// Web Audio API Ambient Synthesizer & Stream Player
// Creates relaxation and focus sounds directly in the browser with 0 external dependencies.

export type SoundType = 'rain' | 'waves' | 'cafe' | 'white_noise' | 'lofi';

export interface SoundPreset {
  id: SoundType;
  label: string;
  icon: string;
  description: string;
}

export const SOUND_PRESETS: SoundPreset[] = [
  { id: 'rain', label: 'Mưa rào (Gentle Rain)', icon: '🌧️', description: 'Tiếng mưa rơi êm dịu giúp tăng tập trung' },
  { id: 'waves', label: 'Sóng biển (Ocean Waves)', icon: '🌊', description: 'Tiếng sóng vỗ bờ nhịp nhàng thư thái' },
  { id: 'cafe', label: 'Quán Cafe (Coffee Shop)', icon: '☕', description: 'Không gian quán cafe tạo cảm hứng sáng tạo' },
  { id: 'white_noise', label: 'Tiếng ồn trắng (White Noise)', icon: '⚡', description: 'Khử tiếng ồn môi trường xung quanh' },
  { id: 'lofi', label: 'Lofi Chill Beats', icon: '🎧', description: 'Nhạc không lời thư giãn lofi' },
];

class AmbientAudioService {
  private audioCtx: AudioContext | null = null;
  private noiseNode: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private isRunning = false;
  private currentSound: SoundType = 'rain';
  private lofiAudio: HTMLAudioElement | null = null;

  private initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  play(sound: SoundType, volume: number = 75) {
    this.stop();
    this.initContext();
    this.currentSound = sound;
    this.isRunning = true;

    if (sound === 'lofi') {
      this.playLofi(volume);
      return;
    }

    if (!this.audioCtx) return;

    const ctx = this.audioCtx;
    this.gainNode = ctx.createGain();
    this.gainNode.gain.setValueAtTime((volume / 100) * 0.15, ctx.currentTime);
    this.gainNode.connect(ctx.destination);

    // Create 5-second buffer of pink noise
    const bufferSize = ctx.sampleRate * 5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    noiseSource.loop = true;

    if (sound === 'rain') {
      // Gentle rain: lowpass filter around 800Hz
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(900, ctx.currentTime);
      noiseSource.connect(filter);
      filter.connect(this.gainNode);
    } else if (sound === 'waves') {
      // Waves: lowpass filter with slow sine LFO
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(450, ctx.currentTime);

      const waveGain = ctx.createGain();
      const osc = ctx.createOscillator();
      osc.frequency.setValueAtTime(0.18, ctx.currentTime); // ~5.5s wave period
      const oscGain = ctx.createGain();
      oscGain.gain.setValueAtTime(0.5, ctx.currentTime);
      osc.connect(oscGain);
      oscGain.connect(waveGain.gain);
      osc.start();

      noiseSource.connect(filter);
      filter.connect(waveGain);
      waveGain.connect(this.gainNode);
    } else if (sound === 'cafe') {
      // Cafe murmur: bandpass around 600Hz
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(600, ctx.currentTime);
      filter.Q.setValueAtTime(1.2, ctx.currentTime);
      noiseSource.connect(filter);
      filter.connect(this.gainNode);
    } else {
      // White noise: flat gentle filter
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3000, ctx.currentTime);
      noiseSource.connect(filter);
      filter.connect(this.gainNode);
    }

    noiseSource.start();
    this.noiseNode = noiseSource;
  }

  private playLofi(volume: number) {
    try {
      if (!this.lofiAudio) {
        this.lofiAudio = new Audio('https://stream.zeno.fm/f3wvbbqmdg8uv');
        this.lofiAudio.crossOrigin = 'anonymous';
      }
      this.lofiAudio.volume = Math.max(0, Math.min(1, volume / 100));
      this.lofiAudio.play().catch(() => {
        // Fallback to rain if stream blocked
        this.play('rain', volume);
      });
    } catch {
      this.play('rain', volume);
    }
  }

  setVolume(volume: number) {
    const clamped = Math.max(0, Math.min(100, volume));
    if (this.gainNode && this.audioCtx) {
      this.gainNode.gain.setValueAtTime((clamped / 100) * 0.15, this.audioCtx.currentTime);
    }
    if (this.lofiAudio) {
      this.lofiAudio.volume = clamped / 100;
    }
  }

  stop() {
    this.isRunning = false;
    if (this.noiseNode) {
      try {
        (this.noiseNode as AudioBufferSourceNode).stop();
        this.noiseNode.disconnect();
      } catch {}
      this.noiseNode = null;
    }
    if (this.lofiAudio) {
      try {
        this.lofiAudio.pause();
        this.lofiAudio.currentTime = 0;
      } catch {}
    }
  }

  getIsRunning() {
    return this.isRunning;
  }

  getCurrentSound() {
    return this.currentSound;
  }
}

export const ambientAudioService = new AmbientAudioService();
