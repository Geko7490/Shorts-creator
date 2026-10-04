/**
 * Audio and Voice playback manager for AI Shorts
 * Supports both:
 * 1. Experimental Voice -> Web-based experimental speech synthesis system (Male Voice priority)
 * 2. Advanced TTS -> Studio TTS WAV audio files system (Fenrir / Male Voice priority)
 *
 * Ensures words are never cut off, scenes flow naturally, and playback never freezes.
 */

import { VoiceMode } from './types';

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  totalDuration: number;
  currentSceneIndex: number;
  activeSubtitleText: string;
}

export class ShortsAudioPlayer {
  private audioElements: Map<number, HTMLAudioElement> = new Map();
  private sceneDurations: number[] = [];
  private sceneTexts: string[] = [];
  private language: 'tr' | 'en' = 'tr';
  private voiceMode: VoiceMode = 'experimental';
  private currentSceneIndex = 0;
  private isPlaying = false;
  private currentTime = 0;
  private totalDuration = 0;
  private onStateChange: (state: PlaybackState) => void;
  private animFrameId: number | null = null;
  private sceneStartTimes: number[] = [];
  private endTimeoutId: any = null;
  private watchdogTimeoutId: any = null;
  private keepAliveIntervalId: any = null;
  // Retain active utterance globally on class instance to prevent Chrome garbage-collection freeze!
  private activeUtterance: SpeechSynthesisUtterance | null = null;

  constructor(onStateChange: (state: PlaybackState) => void) {
    this.onStateChange = onStateChange;

    // Preload speech synthesis voices
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }

  public setup(
    scenes: Array<{ id: number; text: string; duration: number; audioBase64?: string }>,
    language: 'tr' | 'en',
    voiceMode: VoiceMode = 'experimental'
  ) {
    this.stop();

    // Clean up old audio elements to avoid browser audio pool memory exhaustion
    this.audioElements.forEach((audio) => {
      try {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      } catch (e) {
        // ignore cleanup error
      }
    });
    this.audioElements.clear();

    this.language = language;
    this.voiceMode = voiceMode;
    this.sceneTexts = scenes.map((s) => s.text);
    this.currentSceneIndex = 0;
    this.currentTime = 0;

    // Initialize with scene durations
    this.sceneDurations = scenes.map((s) => Math.max(2.5, s.duration || 5));

    const recalculateTimeline = () => {
      let cumulative = 0;
      this.sceneStartTimes = this.sceneDurations.map((dur) => {
        const start = cumulative;
        cumulative += dur;
        return start;
      });
      this.totalDuration = Math.max(0.1, cumulative);
      this.notifyState();
    };

    recalculateTimeline();

    // Prepare audio elements and calibrate exact durations if studio audio is provided
    scenes.forEach((s, idx) => {
      if (s.audioBase64) {
        const audio = new Audio(s.audioBase64);
        audio.preload = 'auto';

        const calibrateDuration = () => {
          if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
            // Speech duration + 0.35s natural breathing room so words never cut abruptly
            const exactDuration = Math.round((audio.duration + 0.35) * 10) / 10;
            this.sceneDurations[idx] = Math.max(exactDuration, 2.5);
            recalculateTimeline();
          }
        };

        if (audio.readyState >= 1) {
          calibrateDuration();
        } else {
          audio.addEventListener('loadedmetadata', calibrateDuration, { once: true });
        }

        this.audioElements.set(idx, audio);
      }
    });

    this.notifyState();
  }

  public play() {
    if (this.isPlaying) return;
    this.isPlaying = true;
    this.playScene(this.currentSceneIndex);
    this.startTracking();
  }

  public pause() {
    this.isPlaying = false;
    this.stopCurrentAudio();
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.endTimeoutId) {
      clearTimeout(this.endTimeoutId);
      this.endTimeoutId = null;
    }
    if (this.watchdogTimeoutId) {
      clearTimeout(this.watchdogTimeoutId);
      this.watchdogTimeoutId = null;
    }
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
    this.notifyState();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      // If at end, rewind to start
      if (this.currentTime >= this.totalDuration - 0.2) {
        this.seekToTime(0);
      }
      this.play();
    }
  }

  public seekToScene(index: number) {
    if (index < 0 || index >= this.sceneDurations.length) return;
    const wasPlaying = this.isPlaying;
    this.stopCurrentAudio();
    this.currentSceneIndex = index;
    this.currentTime = this.sceneStartTimes[index] || 0;
    this.notifyState();

    if (wasPlaying) {
      this.playScene(index);
    }
  }

  public seekToTime(time: number) {
    const clamped = Math.max(0, Math.min(time, this.totalDuration));
    this.currentTime = clamped;

    // Find which scene this time corresponds to
    let targetScene = 0;
    for (let i = 0; i < this.sceneStartTimes.length; i++) {
      const start = this.sceneStartTimes[i];
      const dur = this.sceneDurations[i];
      if (clamped >= start && clamped < start + dur) {
        targetScene = i;
        break;
      }
      if (i === this.sceneStartTimes.length - 1) {
        targetScene = i;
      }
    }

    const wasPlaying = this.isPlaying;
    this.stopCurrentAudio();
    this.currentSceneIndex = targetScene;

    const audio = this.audioElements.get(targetScene);
    if (audio) {
      const sceneOffset = clamped - this.sceneStartTimes[targetScene];
      audio.currentTime = Math.min(sceneOffset, audio.duration || sceneOffset);
    }

    this.notifyState();

    if (wasPlaying) {
      this.playScene(targetScene);
    }
  }

  public stop() {
    this.pause();
    this.currentSceneIndex = 0;
    this.currentTime = 0;
    this.notifyState();
  }

  private stopCurrentAudio() {
    this.audioElements.forEach((audio) => {
      audio.pause();
    });
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      this.activeUtterance = null;
    }
    if (this.endTimeoutId) {
      clearTimeout(this.endTimeoutId);
      this.endTimeoutId = null;
    }
    if (this.watchdogTimeoutId) {
      clearTimeout(this.watchdogTimeoutId);
      this.watchdogTimeoutId = null;
    }
    if (this.keepAliveIntervalId) {
      clearInterval(this.keepAliveIntervalId);
      this.keepAliveIntervalId = null;
    }
  }

  private playScene(index: number) {
    this.stopCurrentAudio();

    if (index >= this.sceneDurations.length) {
      this.pause();
      this.currentTime = this.totalDuration;
      this.notifyState();
      return;
    }

    this.currentSceneIndex = index;
    const dur = this.sceneDurations[index] || 5;

    // Watchdog safety timer: guarantees scene advances even if browser audio stalls or drops callback
    const watchdogDuration = Math.max(dur + 3, 5);
    this.watchdogTimeoutId = setTimeout(() => {
      if (this.isPlaying && this.currentSceneIndex === index) {
        console.warn(`[Watchdog] Scene ${index + 1} timeout reached, advancing gracefully`);
        if (index < this.sceneDurations.length - 1) {
          this.seekToScene(index + 1);
        } else {
          this.pause();
          this.currentTime = this.totalDuration;
          this.notifyState();
        }
      }
    }, watchdogDuration * 1000);

    // Mode 1: Advanced Studio TTS mode with actual audio element
    if (this.voiceMode === 'advanced') {
      const audio = this.audioElements.get(index);
      if (audio) {
        audio.currentTime = 0;
        audio
          .play()
          .then(() => {
            // Started playing successfully
          })
          .catch((err) => {
            console.warn('Audio play error, falling back to male web voice:', err);
            this.playMaleWebVoice(index);
          });

        audio.onended = () => {
          if (this.watchdogTimeoutId) clearTimeout(this.watchdogTimeoutId);
          if (!this.isPlaying) return;

          if (index < this.sceneDurations.length - 1) {
            this.seekToScene(index + 1);
          } else {
            // Last scene: keep final frame on screen for 0.5s so words settle naturally
            this.endTimeoutId = setTimeout(() => {
              if (this.isPlaying) {
                this.pause();
                this.currentTime = this.totalDuration;
                this.notifyState();
              }
            }, 500);
          }
        };
        return;
      }
    }

    // Mode 2: Male Web Speech synthesis fallback
    this.playMaleWebVoice(index);
  }

  private playMaleWebVoice(index: number) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.endTimeoutId = setTimeout(() => {
        if (this.isPlaying && this.currentSceneIndex === index) {
          if (index < this.sceneDurations.length - 1) {
            this.seekToScene(index + 1);
          } else {
            this.pause();
            this.currentTime = this.totalDuration;
            this.notifyState();
          }
        }
      }, (this.sceneDurations[index] || 4) * 1000);
      return;
    }

    const text = this.sceneTexts[index] || '';
    if (!text.trim()) {
      if (index < this.sceneDurations.length - 1) {
        this.seekToScene(index + 1);
      } else {
        this.pause();
      }
      return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    // Retain reference on instance to prevent Chrome garbage collector bug
    this.activeUtterance = utterance;

    utterance.lang = this.language === 'tr' ? 'tr-TR' : 'en-US';
    // Deep, articulate, masculine storytelling tone
    utterance.pitch = 0.88; // Lower pitch guarantees deep male resonance
    utterance.rate = 0.95;  // Expressive natural cadence
    utterance.volume = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const targetLang = this.language === 'tr' ? 'tr' : 'en';

    // Prioritize masculine male voices
    const maleVoiceKeywords = /male|erkek|tolga|cem|ahmet|david|daniel|guy|george|mark|alex|stefan/i;
    const femaleVoiceKeywords = /female|kadın|seda|ayşe|yelda|zira|susan|victoria|karen/i;

    const maleVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(targetLang) && maleVoiceKeywords.test(v.name)
    );

    const neutralVoice = voices.find(
      (v) => v.lang.toLowerCase().startsWith(targetLang) && !femaleVoiceKeywords.test(v.name)
    );

    const fallbackLangVoice = voices.find((v) => v.lang.toLowerCase().startsWith(targetLang));

    const selectedVoice = maleVoice || neutralVoice || fallbackLangVoice;
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    // Keep Chrome speech synthesis engine alive (prevents auto-pausing after 15s)
    this.keepAliveIntervalId = setInterval(() => {
      if (!this.isPlaying) {
        clearInterval(this.keepAliveIntervalId);
        return;
      }
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, 2000);

    const handleSpeechEnd = () => {
      if (this.watchdogTimeoutId) clearTimeout(this.watchdogTimeoutId);
      if (this.keepAliveIntervalId) clearInterval(this.keepAliveIntervalId);
      this.activeUtterance = null;

      if (!this.isPlaying || this.currentSceneIndex !== index) return;

      if (index < this.sceneDurations.length - 1) {
        this.seekToScene(index + 1);
      } else {
        this.endTimeoutId = setTimeout(() => {
          if (this.isPlaying) {
            this.pause();
            this.currentTime = this.totalDuration;
            this.notifyState();
          }
        }, 500);
      }
    };

    utterance.onend = handleSpeechEnd;
    utterance.onerror = (e) => {
      console.warn('Speech synthesis error, continuing cleanly:', e);
      handleSpeechEnd();
    };

    // Chrome bugfix: ensure resume before speaking
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  }

  private startTracking() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    const updateLoop = () => {
      if (!this.isPlaying) return;

      const currentStart = this.sceneStartTimes[this.currentSceneIndex] || 0;
      const sceneDur = this.sceneDurations[this.currentSceneIndex] || 5;

      let sceneProgress = 0;
      if (this.voiceMode === 'advanced') {
        const audio = this.audioElements.get(this.currentSceneIndex);
        if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
          sceneProgress = audio.currentTime;
        } else {
          sceneProgress = Math.min(sceneDur, this.currentTime - currentStart + 0.05);
        }
      } else {
        sceneProgress = Math.min(sceneDur, this.currentTime - currentStart + 0.05);
      }

      this.currentTime = Math.min(this.totalDuration, currentStart + sceneProgress);
      this.notifyState();

      this.animFrameId = requestAnimationFrame(updateLoop);
    };

    this.animFrameId = requestAnimationFrame(updateLoop);
  }

  private notifyState() {
    let activeSubtitle = '';
    const currentSceneText = this.sceneTexts[this.currentSceneIndex] || '';

    activeSubtitle = currentSceneText;

    this.onStateChange({
      isPlaying: this.isPlaying,
      currentTime: Number(this.currentTime.toFixed(2)),
      totalDuration: Number(this.totalDuration.toFixed(2)),
      currentSceneIndex: this.currentSceneIndex,
      activeSubtitleText: activeSubtitle,
    });
  }
}
