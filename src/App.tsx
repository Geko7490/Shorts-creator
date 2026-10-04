/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { PoseId, POSE_DEFINITIONS, GeneratedShort, VoiceMode, MasterVideoPlan } from './types';
import { getDefaultCharacterPoses } from './defaultCharacters';
import { CharacterPoseManager } from './CharacterPoseManager';
import { ShortsPlayer } from './ShortsPlayer';
import { LongVideoManager } from './LongVideoManager';
import { saveStoredPoses, getStoredPoses, clearStoredPoses } from './storageHelper';
import {
  Sparkles,
  Clapperboard,
  Clock,
  Globe2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  Layers,
  Wand2,
  Subtitles,
  Image,
  ImageOff,
  Mic,
  Volume2,
  Tv,
  FolderOpen,
} from 'lucide-react';

const SUGGESTED_TOPICS = [
  'Atatürk hakkında çarpıcı 5 bilgi',
  'Dünyanın en gizemli 4 su altı şehri',
  '5 Mind-blowing facts about Black Holes',
  'Kahve hakkında bilmediğiniz 3 gerçek',
];

export default function App() {
  const [topic, setTopic] = useState('Atatürk hakkında çarpıcı 5 bilgi');
  const [duration, setDuration] = useState<30 | 60 | 300>(30);
  const [language, setLanguage] = useState<'tr' | 'en'>('tr');
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(true);
  const [backgroundEnabled, setBackgroundEnabled] = useState<boolean>(true);
  const [voiceMode, setVoiceMode] = useState<VoiceMode>('experimental');
  const [characterPoses, setCharacterPoses] = useState<Record<PoseId, string>>(() =>
    getDefaultCharacterPoses()
  );
  const [customUploadCount, setCustomUploadCount] = useState<number>(0);
  const [showPosesDrawer, setShowPosesDrawer] = useState<boolean>(false);

  // 5-Minute video state & checkpoints
  const [activePlan, setActivePlan] = useState<MasterVideoPlan | null>(null);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedShort, setGeneratedShort] = useState<GeneratedShort | null>(null);

  const isTr = language === 'tr';

  // Load saved 5-minute plans index on startup
  useEffect(() => {
    try {
      const stored = localStorage.getItem('plans_5min_index');
      if (stored) {
        setSavedPlans(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to load saved plans index:', e);
    }
  }, []);

  const refreshSavedPlans = () => {
    try {
      const stored = localStorage.getItem('plans_5min_index');
      if (stored) {
        setSavedPlans(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('Failed to refresh saved plans:', e);
    }
  };

  const handleOpenSavedPlan = (planId: string) => {
    try {
      const stored = localStorage.getItem(`plan_5min_${planId}`);
      if (stored) {
        const plan: MasterVideoPlan = JSON.parse(stored);
        setActivePlan(plan);
        setGeneratedShort(null);
      }
    } catch (err) {
      console.error('Failed to open saved plan:', err);
    }
  };

  const handlePlanLongVideo = async () => {
    if (!topic.trim()) return;
    setIsGenerating(true);
    setError(null);
    setGenerationStep(
      isTr
        ? '5 dakikalık video önceden planlanıyor (10 bölüm ve tam senaryo)...'
        : 'Pre-planning 5-minute video (10 chapters & full master script)...'
    );

    try {
      const response = await fetch('/api/plan-long-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, language }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || '5 dakikalık plan oluşturulamadı');
      }

      const plan: MasterVideoPlan = await response.json();
      setActivePlan(plan);
      refreshSavedPlans();
    } catch (err: any) {
      setError(err.message || '5 dakikalık video planlanırken bir hata oluştu');
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Load persisted custom character poses from IndexedDB on startup
  useEffect(() => {
    let isMounted = true;
    getStoredPoses().then((stored) => {
      if (isMounted && stored && Object.keys(stored).length > 0) {
        setCharacterPoses((prev) => ({
          ...prev,
          ...stored,
        }));
        setCustomUploadCount(Object.keys(stored).length);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleUpdatePose = (poseId: PoseId, dataUri: string) => {
    setCharacterPoses((prev) => {
      const updated = {
        ...prev,
        [poseId]: dataUri,
      };
      saveStoredPoses(updated);
      return updated;
    });
    setCustomUploadCount((prev) => prev + 1);
  };

  const handleBatchUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    const updatedPoses = { ...characterPoses };
    let newlyMatched = 0;

    await Promise.all(
      fileArray.map((file, index) => {
        return new Promise<void>((resolve) => {
          const name = file.name.toLowerCase();
          let targetPose: PoseId | undefined;

          // Match by keyword or index
          for (const def of POSE_DEFINITIONS) {
            if (
              name.includes(def.id) ||
              name.includes(`${def.index}.`) ||
              name.startsWith(`${def.index}_`) ||
              name.startsWith(`${def.index}-`) ||
              name === `${def.index}.png`
            ) {
              targetPose = def.id;
              break;
            }
          }

          // If no filename match, match by index
          if (!targetPose && index < POSE_DEFINITIONS.length) {
            targetPose = POSE_DEFINITIONS[index].id;
          }

          if (targetPose) {
            const reader = new FileReader();
            const poseKey = targetPose;
            reader.onload = (e) => {
              const res = e.target?.result as string;
              if (res) {
                updatedPoses[poseKey] = res;
                newlyMatched++;
              }
              resolve();
            };
            reader.onerror = () => resolve();
            reader.readAsDataURL(file);
          } else {
            resolve();
          }
        });
      })
    );

    setCharacterPoses(updatedPoses);
    await saveStoredPoses(updatedPoses);
    setCustomUploadCount((prev) => prev + newlyMatched);
  };

  const handleResetToDefaults = async () => {
    await clearStoredPoses();
    setCharacterPoses(getDefaultCharacterPoses());
    setCustomUploadCount(0);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGenerationStep(
      isTr ? 'Yapay zeka viral senaryoyu yazıyor...' : 'AI is drafting the viral script...'
    );

    try {
      // 1. Generate Script and Choreography with Gemini
      const shortRes = await fetch('/api/generate-short', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          duration,
          language,
        }),
      });

      if (!shortRes.ok) {
        const errData = await shortRes.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to generate short script');
      }

      const shortData: GeneratedShort = await shortRes.json();
      shortData.backgroundEnabled = backgroundEnabled;
      shortData.voiceMode = voiceMode;

      // Handle Voice Mode
      if (voiceMode === 'experimental') {
        // Experimental Voice Mode: Web-based experimental speech system (0 quota, instant generation)
        setGenerationStep(
          isTr
            ? 'Deneysel web ses sistemi yapılandırılıyor...'
            : 'Configuring experimental web voice system...'
        );

        // Calibrate scene durations based on natural speech pacing
        for (const scene of shortData.scenes) {
          const words = scene.text.trim().split(/\s+/).length;
          const estimatedSec = Math.max(3, Math.round((words / 2.3 + 0.6) * 10) / 10);
          scene.duration = Math.max(scene.duration || 3, estimatedSec);
        }

        const totalCalculated = shortData.scenes.reduce((acc, s) => acc + s.duration, 0);
        shortData.totalDuration = Math.round(totalCalculated * 10) / 10;
        setGeneratedShort(shortData);
        return;
      }

      // Advanced TTS Mode: Generate Real Gemini Studio TTS Voice Narration for EVERY scene
      const enhancedScenes = [...shortData.scenes];

      for (let i = 0; i < enhancedScenes.length; i++) {
        const scene = enhancedScenes[i];
        let audioAcquired = false;
        let attempt = 0;

        while (!audioAcquired && attempt < 3) {
          attempt++;
          setGenerationStep(
            isTr
              ? `Sahne ${i + 1}/${enhancedScenes.length} stüdyo sesi üretiliyor...`
              : `Generating studio voice for Scene ${i + 1}/${enhancedScenes.length}...`
          );

          try {
            const ttsRes = await fetch('/api/generate-tts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                text: scene.text,
                language,
              }),
            });

            if (ttsRes.ok) {
              const ttsJson = await ttsRes.json();
              if (ttsJson.audioBase64) {
                scene.audioBase64 = ttsJson.audioBase64;
                audioAcquired = true;

                // Calibrate scene duration to exact speech duration + 0.4s breathing room
                await new Promise<void>((resolve) => {
                  const audio = new Audio(scene.audioBase64);
                  audio.onloadedmetadata = () => {
                    if (audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
                      const exact = Math.round((audio.duration + 0.4) * 10) / 10;
                      scene.duration = Math.max(exact, 2.5);
                    }
                    resolve();
                  };
                  audio.onerror = () => resolve();
                  setTimeout(resolve, 1500);
                });
                break;
              } else if (ttsJson.dailyQuotaExceeded || !ttsJson.success) {
                // When daily studio quota is reached, gracefully fall back to male voice synthesis
                console.warn(`[TTS] Studio quota exhausted on Scene ${i + 1}, using seamless male voice synthesis`);
                const words = scene.text.trim().split(/\s+/).length;
                scene.duration = Math.max(3, Math.round((words / 2.3 + 0.6) * 10) / 10);
                audioAcquired = true;
                break;
              }
            }
          } catch (ttsErr: any) {
            console.warn('TTS request error, using male voice fallback:', ttsErr);
            const words = scene.text.trim().split(/\s+/).length;
            scene.duration = Math.max(3, Math.round((words / 2.3 + 0.6) * 10) / 10);
            audioAcquired = true;
            break;
          }

          // If transient quota limit or busy, wait patiently with second countdown
          if (!audioAcquired && attempt < 2) {
            const waitSeconds = 4;
            for (let sec = waitSeconds; sec > 0; sec--) {
              setGenerationStep(
                isTr
                  ? `Stüdyo sesi için kota dinlendiriliyor (${sec} sn kaldı)... (Sahne ${i + 1}/${enhancedScenes.length})`
                  : `Waiting for studio voice quota (${sec}s remaining)... (Scene ${i + 1}/${enhancedScenes.length})`
              );
              await new Promise((r) => setTimeout(r, 1000));
            }
          } else if (!audioAcquired) {
            const words = scene.text.trim().split(/\s+/).length;
            scene.duration = Math.max(3, Math.round((words / 2.3 + 0.6) * 10) / 10);
            audioAcquired = true;
            break;
          }
        }

        // Balanced delay before next scene to ensure quota stability
        if (i < enhancedScenes.length - 1) {
          for (let sec = 4; sec > 0; sec--) {
            setGenerationStep(
              isTr
                ? `Kota korumalı geçiş: Sahne ${i + 2} hazırlanıyor (${sec} sn)...`
                : `Quota protection: Preparing Scene ${i + 2} (${sec}s)...`
            );
            await new Promise((r) => setTimeout(r, 1000));
          }
        }
      }

      // Calculate total duration strictly from real spoken audio length
      const totalCalculated = enhancedScenes.reduce((acc, s) => acc + s.duration, 0);
      shortData.totalDuration = Math.round(totalCalculated * 10) / 10;
      shortData.scenes = enhancedScenes;
      setGeneratedShort(shortData);
    } catch (err: any) {
      console.error(err);
      let msg = err.message || '';
      try {
        if (msg.includes('{')) {
          const parsed = JSON.parse(msg.slice(msg.indexOf('{')));
          if (parsed.error?.message) {
            msg = parsed.error.message;
          }
        }
      } catch {
        // ignore parse error
      }

      if (msg.includes('503') || msg.includes('UNAVAILABLE') || msg.includes('demand')) {
        setError(
          isTr
            ? 'Yapay zeka modeli şu anda yoğun talep görüyor. Lütfen tekrar deneyin.'
            : 'The AI model is experiencing high demand. Please try again.'
        );
      } else if (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
        setError(
          isTr
            ? 'Geçici kota sınırına ulaşıldı. Lütfen birkaç saniye bekleyip tekrar deneyin.'
            : 'Rate limit reached. Please wait a few seconds and try again.'
        );
      } else {
        setError(
          msg ||
            (isTr
              ? 'Short oluşturulurken bir hata meydana geldi.'
              : 'An error occurred while creating the short.')
        );
      }
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Mobile-Friendly App Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 py-3 shadow-2xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Clapperboard className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-extrabold text-base tracking-tight text-slate-900 leading-none">
                AI Shorts Creator
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                {isTr ? '9:16 Karakter & Sesli Shorts Üretici' : '9:16 Character & TTS Shorts Generator'}
              </p>
            </div>
          </div>

          {/* Language indicator / quick switch */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLanguage('tr')}
              className={`px-2 py-1 rounded-md transition-colors ${
                language === 'tr' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              TR
            </button>
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-md transition-colors ${
                language === 'en' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'
              }`}
            >
              EN
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-3 sm:p-5 flex flex-col items-center">
        {activePlan ? (
          <LongVideoManager
            plan={activePlan}
            onUpdatePlan={(updated) => setActivePlan(updated)}
            onPlayMergedVideo={(merged) => {
              setGeneratedShort(merged);
              setActivePlan(null);
            }}
            onClose={() => setActivePlan(null)}
            characterPoses={characterPoses}
            language={language}
          />
        ) : generatedShort ? (
          /* Video Playable Screen (Supports 9:16 or 16:9 widescreen) */
          <div className="w-full flex flex-col items-center animate-in fade-in duration-300">
            <ShortsPlayer
              shortData={generatedShort}
              characterPoses={characterPoses}
              onBackToEdit={() => {
                const planId = generatedShort.planId;
                setGeneratedShort(null);
                if (planId) {
                  handleOpenSavedPlan(planId);
                }
              }}
              language={language}
              initialShowSubtitles={subtitlesEnabled}
              backgroundEnabled={backgroundEnabled}
            />
          </div>
        ) : (
          /* Simple Creation Form */
          <div className="w-full max-w-2xl space-y-4">
            {/* If there are saved 5-minute plans in localStorage, show a quick-resume banner */}
            {savedPlans.length > 0 && (
              <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border border-amber-500/30 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                    <Tv className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 line-clamp-1">
                      {isTr ? 'Kayıtlı 5 Dakikalık Video Planı:' : 'Saved 5-Minute Video Plan:'} {savedPlans[0].title}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {savedPlans[0].completedCount || 0}/10 {isTr ? 'Bölüm Tamamlandı' : 'Chapters Completed'} • {isTr ? 'Kaldığın yerden devam et' : 'Resume progress'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenSavedPlan(savedPlans[0].id)}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shrink-0 cursor-pointer shadow-xs transition-colors"
                >
                  {isTr ? 'Aç & Devam Et' : 'Open & Resume'}
                </button>
              </div>
            )}

            {/* Main Form Card */}
            <form
              onSubmit={duration === 300 ? (e) => { e.preventDefault(); handlePlanLongVideo(); } : handleGenerate}
              className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-6 shadow-sm space-y-5"
            >
              {/* Topic Input Field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  {isTr ? 'Konu / Başlık' : 'Short Topic'}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder={
                      isTr
                        ? 'Örn: Atatürk hakkında çarpıcı 5 bilgi'
                        : 'e.g. 5 Mind-blowing facts about Black Holes'
                    }
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-300 focus:border-blue-500 focus:bg-white rounded-2xl text-sm sm:text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-3 focus:ring-blue-100 transition-all font-medium"
                    required
                  />
                </div>

                {/* Instant Topic Suggestion Chips */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-medium text-slate-400 mr-0.5">
                    {isTr ? 'Örnekler:' : 'Try:'}
                  </span>
                  {SUGGESTED_TOPICS.map((suggested, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTopic(suggested)}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 transition-colors border border-slate-200/80"
                    >
                      {suggested}
                    </button>
                  ))}
                </div>
              </div>

              {/* Options Row: Duration, Language & Subtitles */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Duration Option */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isTr ? 'Hedef Süre' : 'Target Duration'}</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setDuration(30)}
                      className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        duration === 30
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      30s (9:16)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuration(60)}
                      className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer ${
                        duration === 60
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      60s (9:16)
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuration(300)}
                      className={`py-2 text-[11px] font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        duration === 300
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-2xs'
                          : 'text-amber-800 hover:text-amber-900 bg-amber-50/50'
                      }`}
                    >
                      <Tv className="w-3 h-3" />
                      5 Dk (16:9)
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-tight">
                    {duration === 300
                      ? isTr
                        ? '16:9 Yatay Video • 10 parçaya bölünür, sırayla üretilir, checkpoint ile kaydedilir.'
                        : '16:9 Widescreen Video • 10 chunks, sequential generation, resumable checkpoint.'
                      : isTr
                      ? 'Dikey 9:16 video formatı.'
                      : 'Vertical 9:16 video format.'}
                  </p>
                </div>

                {/* Language Option */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                    <Globe2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isTr ? 'Dil' : 'Language'}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setLanguage('tr')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        language === 'tr'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Türkçe
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanguage('en')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        language === 'en'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                {/* Subtitles Option */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1">
                    <Subtitles className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isTr ? 'Altyazı' : 'Subtitles'}</span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setSubtitlesEnabled(true)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        subtitlesEnabled
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isTr ? 'Açık' : 'On'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtitlesEnabled(false)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                        !subtitlesEnabled
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isTr ? 'Kapalı' : 'Off'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Options Row 2: Background Generation & Voice Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Background Generation ON/OFF */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isTr ? 'Arka Plan Üretimi' : 'Background Generation'}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        backgroundEnabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {backgroundEnabled
                        ? isTr
                          ? '2D Sahne (ON)'
                          : '2D Scene (ON)'
                        : isTr
                          ? 'Sade Beyaz (OFF)'
                          : 'Plain White (OFF)'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setBackgroundEnabled(true)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        backgroundEnabled
                          ? 'bg-white text-emerald-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Image className="w-3 h-3" />
                      <span>ON ({isTr ? 'Açık' : 'On'})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBackgroundEnabled(false)}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        !backgroundEnabled
                          ? 'bg-white text-slate-800 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <ImageOff className="w-3 h-3" />
                      <span>OFF ({isTr ? 'Kapalı' : 'Off'})</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                    {backgroundEnabled
                      ? isTr
                        ? 'Anlatıma uygun 2D SVG/Canvas arka plan sahneleri otomatik üretilir.'
                        : 'Matching 2D code-based animated vector scenes are generated.'
                      : isTr
                        ? 'Minimalist, sade ve pürüzsüz beyaz arka plan kullanılır.'
                        : 'Clean, minimalist plain white background is used.'}
                  </p>
                </div>

                {/* Voice Mode Selector: Experimental Voice / Advanced TTS */}
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/90">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-blue-600" />
                      <span>{isTr ? 'Seslendirme Modu' : 'Voice Mode'}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        voiceMode === 'experimental'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {voiceMode === 'experimental'
                        ? isTr
                          ? 'Deneysel Web'
                          : 'Experimental'
                        : isTr
                          ? 'Gelişmiş TTS'
                          : 'Advanced TTS'}
                    </span>
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setVoiceMode('experimental')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        voiceMode === 'experimental'
                          ? 'bg-white text-blue-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>{isTr ? 'Deneysel Ses' : 'Experimental'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setVoiceMode('advanced')}
                      className={`py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        voiceMode === 'advanced'
                          ? 'bg-white text-purple-700 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>{isTr ? 'Gelişmiş TTS' : 'Advanced TTS'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-tight">
                    {voiceMode === 'experimental'
                      ? isTr
                        ? 'Web tabanlı deneysel ses sistemi. Anında üretilir, kota harcamaz.'
                        : 'Web-based experimental voice system. Instant generation, zero quota.'
                      : isTr
                        ? 'Google Gemini stüdyo ses sistemi (yüksek kaliteli seslendirme).'
                        : 'Google Gemini advanced studio TTS system (high fidelity WAV audio).'}
                  </p>
                </div>
              </div>

              {/* 12 Character Poses Collapsible Drawer / Preview */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPosesDrawer(!showPosesDrawer)}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                      12
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-800">
                        {isTr ? '12 Şeffaf Karakter PNG Duruşu' : '12 Character Transparent PNG Poses'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {customUploadCount > 0
                          ? isTr
                            ? `${customUploadCount} özel PNG yüklendi (Kayıtlı & Hazır)`
                            : `${customUploadCount} custom PNGs loaded (Saved & Ready)`
                          : isTr
                            ? 'Varsayılan sevimli animasyon karakteri hazır'
                            : 'Default expressive character pack loaded'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-600">
                    <span>{showPosesDrawer ? (isTr ? 'Gizle' : 'Hide') : isTr ? 'İncele' : 'View'}</span>
                    {showPosesDrawer ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </button>

                {/* Collapsible Pose Manager */}
                {showPosesDrawer && (
                  <div className="mt-3">
                    <CharacterPoseManager
                      poses={characterPoses}
                      customUploadCount={customUploadCount}
                      onUpdatePose={handleUpdatePose}
                      onBatchUpload={handleBatchUpload}
                      onResetToDefaults={handleResetToDefaults}
                      language={language}
                    />
                  </div>
                )}
              </div>

              {/* Error display */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                    <span>{error}</span>
                  </div>
                  <button
                    type="submit"
                    className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-[11px] shrink-0 transition-colors shadow-2xs"
                  >
                    {isTr ? 'Tekrar Dene' : 'Retry'}
                  </button>
                </div>
              )}

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className={`w-full py-3.5 px-4 font-bold text-sm sm:text-base rounded-2xl transition-all shadow-md active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer ${
                  duration === 300
                    ? 'bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-600/30'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-indigo-600/20'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="truncate">{generationStep}</span>
                  </>
                ) : duration === 300 ? (
                  <>
                    <Tv className="w-5 h-5 text-amber-200" />
                    <span>
                      {isTr
                        ? '5 Dakikalık Videoyu Önceden Planla (10 Bölüm)'
                        : 'Pre-Plan 5-Minute Video (10 Chapters)'}
                    </span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    <span>{isTr ? 'Yapay Zeka Short Üret' : 'Generate AI Short'}</span>
                  </>
                )}
              </button>

              {isGenerating && (
                <div className="flex items-center justify-center gap-1.5 text-[11px] text-blue-700 bg-blue-50/80 border border-blue-200/60 rounded-xl py-2 px-3 text-center">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 animate-pulse" />
                  <span>
                    {isTr
                      ? 'Dengeli kota koruması devrede: Seslendirmeler sınıra takılmadan sırayla üretiliyor.'
                      : 'Balanced rate-limit protection active: Audio generated with safe pacing.'}
                  </span>
                </div>
              )}
            </form>

            {/* Feature Highlights Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] text-slate-500 font-medium px-2">
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 shadow-2xs">
                🎭 {isTr ? '12 Duygusal Duruş' : '12 Emotional Poses'}
              </div>
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 shadow-2xs">
                🗣️ {isTr ? 'TTS Seslendirme' : 'TTS Voiceover'}
              </div>
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 shadow-2xs">
                💬 {isTr ? 'Senkronize Altyazı' : 'Sync Subtitles'}
              </div>
              <div className="bg-white/80 border border-slate-200/80 rounded-xl p-2 shadow-2xs">
                📱 {isTr ? '9:16 Dikey Önizleme' : '9:16 Vertical Preview'}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
