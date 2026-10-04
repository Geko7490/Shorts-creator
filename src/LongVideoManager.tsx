import React, { useState, useEffect, useRef } from 'react';
import { MasterVideoPlan, VideoChunkPlan, GeneratedShort, Scene } from './types';
import {
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Volume2,
  Sparkles,
  Save,
  Layers,
  ArrowRight,
  Tv,
} from 'lucide-react';

interface LongVideoManagerProps {
  plan: MasterVideoPlan;
  onUpdatePlan: (updatedPlan: MasterVideoPlan) => void;
  onPlayMergedVideo: (shortData: GeneratedShort) => void;
  onClose: () => void;
  characterPoses: Record<string, string>;
  language: 'tr' | 'en';
}

export const LongVideoManager: React.FC<LongVideoManagerProps> = ({
  plan,
  onUpdatePlan,
  onPlayMergedVideo,
  onClose,
  characterPoses,
  language,
}) => {
  const isTr = language === 'tr';
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [currentGeneratingChunk, setCurrentGeneratingChunk] = useState<number | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const stopRequestedRef = useRef(false);

  // Sync plan to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(`plan_5min_${plan.id}`, JSON.stringify(plan));
      // Update plan index list
      const existingListStr = localStorage.getItem('plans_5min_index');
      let planList: any[] = existingListStr ? JSON.parse(existingListStr) : [];
      planList = planList.filter((p: any) => p.id !== plan.id);
      planList.unshift({
        id: plan.id,
        title: plan.title,
        topic: plan.topic,
        completedCount: plan.completedChunksCount,
        totalCount: plan.totalChunksCount,
        updatedAt: Date.now(),
      });
      localStorage.setItem('plans_5min_index', JSON.stringify(planList.slice(0, 10)));
    } catch (e) {
      console.warn('Could not save plan to localStorage:', e);
    }
  }, [plan]);

  // Generate a single chunk by index
  const handleGenerateChunk = async (chunkIndex: number): Promise<boolean> => {
    const chunk = plan.chunks[chunkIndex];
    if (!chunk) return false;

    // Set chunk status to GENERATING
    const updatedChunks = [...plan.chunks];
    updatedChunks[chunkIndex] = {
      ...chunk,
      status: 'GENERATING',
      error: undefined,
    };
    onUpdatePlan({
      ...plan,
      chunks: updatedChunks,
      activeChunkIndex: chunkIndex,
    });
    setCurrentGeneratingChunk(chunkIndex);
    setGlobalError(null);

    try {
      const response = await fetch('/api/generate-chunk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          chunkIndex,
          scenes: chunk.scenes,
          language: plan.language,
          voiceName: 'Fenrir',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.message || 'Bölüm üretilemedi';
        const failChunks = [...plan.chunks];
        failChunks[chunkIndex] = {
          ...chunk,
          status: 'FAILED',
          error: errorMsg,
          retryCount: (chunk.retryCount || 0) + 1,
        };
        const updatedPlan: MasterVideoPlan = {
          ...plan,
          chunks: failChunks,
          updatedAt: Date.now(),
        };
        onUpdatePlan(updatedPlan);
        setGlobalError(
          data.dailyQuotaExceeded
            ? isTr
              ? 'Günlük stüdyo ses kotası doldu. İlerlemeniz güvenle kaydedildi! Limit yenilendiğinde kaldığınız yerden devam edebilirsiniz.'
              : 'Daily TTS quota reached. Progress saved safely! You can resume when quota resets.'
            : errorMsg
        );
        setCurrentGeneratingChunk(null);
        return false;
      }

      // Chunk completed successfully!
      const successChunks = [...plan.chunks];
      successChunks[chunkIndex] = {
        ...chunk,
        status: 'COMPLETED',
        scenes: data.updatedScenes || chunk.scenes,
        error: undefined,
      };

      const completedCount = successChunks.filter((c) => c.status === 'COMPLETED').length;
      const isComplete = completedCount === successChunks.length;

      const updatedPlan: MasterVideoPlan = {
        ...plan,
        chunks: successChunks,
        completedChunksCount: completedCount,
        isFullyCompleted: isComplete,
        updatedAt: Date.now(),
      };

      onUpdatePlan(updatedPlan);
      setCurrentGeneratingChunk(null);
      return true;
    } catch (err: any) {
      console.error('Error generating chunk:', err);
      const failChunks = [...plan.chunks];
      failChunks[chunkIndex] = {
        ...chunk,
        status: 'FAILED',
        error: err.message || 'Bağlantı hatası',
      };
      onUpdatePlan({
        ...plan,
        chunks: failChunks,
        updatedAt: Date.now(),
      });
      setGlobalError(isTr ? 'Ağ veya sunucu hatası oluştu. Parça kaydedildi.' : 'Network or server error.');
      setCurrentGeneratingChunk(null);
      return false;
    }
  };

  // Run all pending or failed chunks sequentially
  const handleRunAllSequentially = async () => {
    setIsRunningAll(true);
    stopRequestedRef.current = false;

    for (let i = 0; i < plan.chunks.length; i++) {
      if (stopRequestedRef.current) {
        break;
      }

      const chunk = plan.chunks[i];
      if (chunk.status !== 'COMPLETED') {
        const success = await handleGenerateChunk(i);
        if (!success || stopRequestedRef.current) {
          break; // Stop on error or user cancellation to protect previous progress
        }
      }
    }

    setIsRunningAll(false);
  };

  const handleStop = () => {
    stopRequestedRef.current = true;
    setIsRunningAll(false);
  };

  // Assemble completed chunks and launch 16:9 player
  const handlePlayCompletedOrAll = () => {
    const completedChunks = plan.chunks.filter((c) => c.status === 'COMPLETED');
    if (completedChunks.length === 0) {
      setGlobalError(isTr ? 'Henüz hiçbir bölüm tamamlanmadı. Önce bir bölüm üretin.' : 'No chunks completed yet.');
      return;
    }

    const mergedScenes: Scene[] = [];
    let runningTotal = 0;
    let sceneCounter = 1;

    for (const chunk of completedChunks) {
      for (const sc of chunk.scenes) {
        const dur = Number(sc.duration) || 12;
        mergedScenes.push({
          ...sc,
          id: sceneCounter++,
          duration: dur,
          position: {
            ...sc.position,
            align: sc.position?.align || 'bottom-right',
            xPercent: sc.position?.xPercent || 70,
            yPercent: sc.position?.yPercent || 60,
            scale: sc.position?.scale || 1.15,
          },
        });
        runningTotal += dur;
      }
    }

    const mergedVideo: GeneratedShort = {
      title: plan.title,
      topic: plan.topic,
      targetDuration: 300,
      aspectRatio: '16:9',
      language: plan.language,
      scenes: mergedScenes,
      totalDuration: Number(runningTotal.toFixed(1)),
      backgroundEnabled: true,
      voiceMode: 'advanced', // Strictly Gemini Studio TTS audio
      planId: plan.id,
      completedChunks: completedChunks.length,
      totalChunks: plan.chunks.length,
    };

    onPlayMergedVideo(mergedVideo);
  };

  // Find next pending chunk
  const nextPendingChunk = plan.chunks.find((c) => c.status === 'PENDING' || c.status === 'FAILED');
  const percentComplete = Math.round((plan.completedChunksCount / plan.totalChunksCount) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-100 flex flex-col gap-6">
      {/* Header with Title & 16:9 Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
              <Tv className="w-3.5 h-3.5" />
              16:9 YATAY • 5 DAKİKA
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-800 text-slate-300">
              10 BÖLÜM
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
              🎙️ Sadece Gemini TTS (Erkek Sesi)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">{plan.title}</h2>
          <p className="text-sm text-slate-400 mt-0.5">{plan.topic}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="self-end sm:self-center px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-colors"
        >
          {isTr ? 'Geri Dön' : 'Back'}
        </button>
      </div>

      {/* Checkpoint & Overall Progress Card */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" />
            <span className="text-sm font-bold text-slate-200">
              {isTr ? '5 Dakikalık Üretim İlerlemesi' : '5-Minute Production Progress'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-base font-black text-white">%{percentComplete}</span>
            <span className="text-xs text-slate-400 ml-1.5">
              ({plan.completedChunksCount}/{plan.totalChunksCount} {isTr ? 'Bölüm' : 'Chapters'} •{' '}
              {Math.floor((plan.completedChunksCount * 30) / 60)}:
              {((plan.completedChunksCount * 30) % 60).toString().padStart(2, '0')}{' '}
              / 5:00)
            </span>
          </div>
        </div>

        {/* 10 Segment Progress Bar */}
        <div className="grid grid-cols-10 gap-1.5 h-3 w-full">
          {plan.chunks.map((ch, idx) => {
            let color = 'bg-slate-800';
            if (ch.status === 'COMPLETED') color = 'bg-emerald-500 shadow-sm shadow-emerald-500/50';
            else if (ch.status === 'GENERATING') color = 'bg-blue-500 animate-pulse';
            else if (ch.status === 'FAILED') color = 'bg-rose-500';

            return (
              <div
                key={idx}
                className={`h-full rounded-full transition-all duration-300 ${color}`}
                title={`Bölüm ${idx + 1} (${ch.startTime} - ${ch.endTime}): ${ch.status}`}
              />
            );
          })}
        </div>

        {/* Notice Banner when Quota or Failure happens */}
        {globalError && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold">{globalError}</p>
              <p className="text-amber-300/80 mt-1">
                {isTr
                  ? 'Kayıtlı bölümleriniz korundu. İstediğiniz an kaldığınız yerden devam edebilirsiniz.'
                  : 'Your completed chapters are preserved. You can resume anytime.'}
              </p>
            </div>
          </div>
        )}

        {/* Main Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2">
          {isRunningAll ? (
            <button
              type="button"
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm shadow-lg shadow-rose-600/30 transition-all cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              {isTr ? 'Durdur (Kaldığın Yeri Kaydet)' : 'Pause (Save Checkpoint)'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRunAllSequentially}
              disabled={plan.isFullyCompleted}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all cursor-pointer ${
                plan.isFullyCompleted
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-indigo-600/30'
              }`}
            >
              {currentGeneratingChunk !== null ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4 text-amber-300" />
              )}
              {plan.completedChunksCount > 0
                ? isTr
                  ? `Kaldığın Yerden Devam Et (${plan.completedChunksCount + 1}. Parça)`
                  : `Resume From Chapter ${plan.completedChunksCount + 1}`
                : isTr
                ? 'Tüm 10 Bölümü Sırayla Üret'
                : 'Generate All 10 Chapters'}
            </button>
          )}

          {nextPendingChunk && !isRunningAll && (
            <button
              type="button"
              onClick={() => handleGenerateChunk(nextPendingChunk.chunkIndex)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <span>{isTr ? `Sadece Bölüm ${nextPendingChunk.chunkIndex + 1}'i Üret` : `Generate Chapter ${nextPendingChunk.chunkIndex + 1}`}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          {plan.completedChunksCount > 0 && (
            <button
              type="button"
              onClick={handlePlayCompletedOrAll}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all cursor-pointer ml-auto"
            >
              <Play className="w-4 h-4 fill-white" />
              {plan.isFullyCompleted
                ? isTr
                  ? '5 Dakikalık Videoyu Oynat (16:9)'
                  : 'Play Full 5-Min Video'
                : isTr
                ? `Tamamlanan ${plan.completedChunksCount} Bölümü Oynat`
                : `Play ${plan.completedChunksCount} Chapters`}
            </button>
          )}
        </div>
      </div>

      {/* 10 Chapters Breakdown List */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
          <span>{isTr ? 'Bölüm Planı & Checkpoint Listesi' : 'Chapters Breakdown & Checkpoint List'}</span>
          <span className="text-xs text-slate-500 font-normal">
            ({isTr ? 'Her parça ~30 saniyedir' : '~30 seconds per chapter'})
          </span>
        </h3>

        <div className="flex flex-col gap-2.5">
          {plan.chunks.map((chunk, idx) => {
            const isExpanded = expandedChunk === idx;
            const isGenerating = currentGeneratingChunk === idx;

            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-all ${
                  chunk.status === 'COMPLETED'
                    ? 'bg-slate-950/60 border-emerald-950/50'
                    : chunk.status === 'FAILED'
                    ? 'bg-rose-950/20 border-rose-900/40'
                    : isGenerating
                    ? 'bg-blue-950/30 border-blue-800'
                    : 'bg-slate-950/40 border-slate-800/60'
                }`}
              >
                {/* Chunk Summary Header */}
                <div
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer select-none"
                  onClick={() => setExpandedChunk(isExpanded ? null : idx)}
                >
                  <div className="flex items-center gap-3">
                    {/* Status Icon */}
                    {chunk.status === 'COMPLETED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : chunk.status === 'FAILED' ? (
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                    ) : isGenerating ? (
                      <Loader2 className="w-5 h-5 text-blue-400 shrink-0 animate-spin" />
                    ) : (
                      <Clock className="w-5 h-5 text-slate-500 shrink-0" />
                    )}

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-amber-400">
                          {chunk.startTime} - {chunk.endTime}
                        </span>
                        <span className="text-sm font-bold text-white">{chunk.title}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {chunk.topicSummary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {chunk.status === 'FAILED' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateChunk(idx);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold cursor-pointer"
                      >
                        {isTr ? 'Yeniden Dene' : 'Retry'}
                      </button>
                    )}

                    {chunk.status === 'PENDING' && !isGenerating && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateChunk(idx);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
                      >
                        {isTr ? 'Üret' : 'Generate'}
                      </button>
                    )}

                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Collapsible Scene Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-800/60 flex flex-col gap-2.5 text-xs">
                    {chunk.error && (
                      <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300">
                        {chunk.error}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                      {chunk.scenes.map((scene, sIdx) => (
                        <div
                          key={sIdx}
                          className="bg-slate-900/80 border border-slate-800 rounded-xl p-2.5 flex flex-col justify-between gap-1.5"
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                            <span>
                              {isTr ? 'Sahne' : 'Scene'} {sIdx + 1} ({scene.duration}s)
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-blue-900/40 text-blue-300 uppercase text-[10px]">
                              {scene.characterPose}
                            </span>
                          </div>
                          <p className="text-slate-200 text-xs line-clamp-3 italic">
                            "{scene.text}"
                          </p>
                          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800/40">
                            <span>Tema: {scene.background?.theme}</span>
                            {scene.audioBase64 ? (
                              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                                <Volume2 className="w-3 h-3" />
                                {isTr ? 'Ses Hazır' : 'Audio Ready'}
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                {isTr ? 'Ses Bekliyor' : 'Audio Pending'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
