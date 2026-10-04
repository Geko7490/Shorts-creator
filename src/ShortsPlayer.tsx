import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GeneratedShort, PoseId } from './types';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Sparkles, UserCheck, Maximize2, Minimize2, X, Subtitles, CaptionsOff, Image, ImageOff, Video } from 'lucide-react';
import { ShortsAudioPlayer, PlaybackState } from './audioHelper';
import { DynamicBackground } from './DynamicBackground';
import { validateAndLayoutScene } from './compositionSystem';

interface ShortsPlayerProps {
  shortData: GeneratedShort;
  characterPoses: Record<PoseId, string>;
  onBackToEdit: () => void;
  language: 'tr' | 'en';
  initialShowSubtitles?: boolean;
  backgroundEnabled?: boolean;
}

export const ShortsPlayer: React.FC<ShortsPlayerProps> = ({
  shortData,
  characterPoses,
  onBackToEdit,
  language,
  initialShowSubtitles = true,
  backgroundEnabled = true,
}) => {
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    totalDuration: shortData.totalDuration || 30,
    currentSceneIndex: 0,
    activeSubtitleText: shortData.scenes[0]?.text || '',
  });

  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRecordingMode, setIsRecordingMode] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const countdownTimerRef = useRef<any>(null);
  const [showSubtitles, setShowSubtitles] = useState(initialShowSubtitles);
  const [isBackgroundOn, setIsBackgroundOn] = useState<boolean>(
    shortData.backgroundEnabled !== undefined ? shortData.backgroundEnabled : backgroundEnabled
  );
  const [isSceneTransitioning, setIsSceneTransitioning] = useState(false);
  const prevSceneIndexRef = useRef(playbackState.currentSceneIndex);
  const playerRef = useRef<ShortsAudioPlayer | null>(null);
  const controlsTimeoutRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Enter clean screen recording mode with 3-second countdown
  const enterRecordingMode = () => {
    setIsRecordingMode(true);
    playerRef.current?.pause();
    playerRef.current?.seekToTime(0);
    setCountdown(3);

    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    let currentCount = 3;
    countdownTimerRef.current = setInterval(() => {
      currentCount--;
      if (currentCount <= 0) {
        clearInterval(countdownTimerRef.current);
        setCountdown(null);
        playerRef.current?.play();
      } else {
        setCountdown(currentCount);
      }
    }, 1000);
  };

  const exitRecordingMode = () => {
    setIsRecordingMode(false);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(null);
  };

  // Keyboard shortcut for ESC to exit recording mode or fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isRecordingMode) {
          exitRecordingMode();
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isRecordingMode, isFullscreen]);

  // Smooth cinematic scene transition trigger
  useEffect(() => {
    if (prevSceneIndexRef.current !== playbackState.currentSceneIndex) {
      prevSceneIndexRef.current = playbackState.currentSceneIndex;
      setIsSceneTransitioning(true);
      const timer = setTimeout(() => {
        setIsSceneTransitioning(false);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [playbackState.currentSceneIndex]);

  // Initialize audio player with voiceMode
  useEffect(() => {
    playerRef.current = new ShortsAudioPlayer((state) => {
      setPlaybackState(state);
    });

    const effectiveVoiceMode =
      shortData.targetDuration === 300 || shortData.voiceMode === 'advanced'
        ? 'advanced'
        : (shortData.voiceMode || 'experimental');

    playerRef.current.setup(
      shortData.scenes,
      shortData.language,
      effectiveVoiceMode
    );

    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
      }
    };
  }, [shortData]);

  // Fullscreen toggle with fallback and keyboard listener
  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev);
    // Also try browser native fullscreen safely if supported in iframe
    if (!isFullscreen && containerRef.current?.requestFullscreen) {
      containerRef.current.requestFullscreen().catch(() => {
        // Handled smoothly by CSS fixed fullscreen
      });
    } else if (isFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey) {
        toggleFullscreen();
      } else if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey) {
        setShowSubtitles((prev) => !prev);
      } else if (e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleTogglePlay = () => {
    if (playerRef.current) {
      playerRef.current.togglePlay();
    }
  };

  const handleRestart = () => {
    if (playerRef.current) {
      playerRef.current.seekToTime(0);
      playerRef.current.play();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = ratio * playbackState.totalDuration;
    if (playerRef.current) {
      playerRef.current.seekToTime(targetTime);
    }
  };

  const currentScene = shortData.scenes[playbackState.currentSceneIndex] || shortData.scenes[0];
  const activePoseId = currentScene?.characterPose || 'talking';
  const characterImageUrl = characterPoses[activePoseId] || characterPoses.idle;

  // Find active subtitle chunk inside current scene
  let cumulativeSceneStart = 0;
  for (let i = 0; i < playbackState.currentSceneIndex; i++) {
    cumulativeSceneStart += shortData.scenes[i]?.duration || 5;
  }
  const relativeSceneTime = Math.max(0, playbackState.currentTime - cumulativeSceneStart);

  // Determine current active subtitle words or chunk
  let currentSubtitle = currentScene?.text || '';
  if (currentScene?.subtitles && currentScene.subtitles.length > 0) {
    const activeChunk = currentScene.subtitles.find(
      (sub) => relativeSceneTime >= sub.start && relativeSceneTime <= sub.end
    );
    if (activeChunk) {
      currentSubtitle = activeChunk.text;
    } else {
      const lastChunk = currentScene.subtitles[currentScene.subtitles.length - 1];
      if (relativeSceneTime > (lastChunk?.end || 0)) {
        currentSubtitle = lastChunk?.text || currentScene.text;
      } else {
        currentSubtitle = currentScene.subtitles[0]?.text || currentScene.text;
      }
    }
  }

  // Detect widescreen 16:9 format
  const is16x9 = shortData.aspectRatio === '16:9' || shortData.targetDuration === 300;

  // Automatic Scene Composition & Contrast Validation before rendering:
  // Enforces safe zones, collision avoidance, contrast backing, and character separation
  const layout = useMemo(() => {
    return validateAndLayoutScene(
      currentScene,
      isBackgroundOn,
      currentSubtitle,
      is16x9 ? { width: 840, height: 472 } : undefined,
      is16x9 ? '16:9' : '9:16'
    );
  }, [currentScene, isBackgroundOn, currentSubtitle, is16x9]);

  // Cinematic dynamic zoom: dramatic moments punch in, standard scenes stay steady
  const isPunchScene =
    ['surprised', 'pointing', 'thinking', 'explaining'].includes(activePoseId) ||
    currentScene?.motion === 'zoom-punch';
  const dynamicZoom = isPunchScene ? 0.06 : 0;
  const finalScale = Number((layout.characterScale + dynamicZoom).toFixed(3));

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Handle controls auto-hide during playback
  const handlePlayerClick = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (playbackState.isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3500);
    }
  };

  return (
    <div
      className={
        isRecordingMode
          ? 'fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center p-0 m-0 overflow-hidden'
          : isFullscreen
          ? 'fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-200'
          : `flex flex-col items-center w-full ${is16x9 ? 'max-w-4xl' : 'max-w-md'} mx-auto px-2 sm:px-4`
      }
    >
      {/* Discreet Exit Button for Recording Mode */}
      {isRecordingMode && (
        <button
          type="button"
          onClick={exitRecordingMode}
          className="fixed top-4 right-4 z-[101] px-3.5 py-1.5 rounded-full bg-black/70 hover:bg-black/95 text-white text-xs font-bold border border-white/20 backdrop-blur-md opacity-25 hover:opacity-100 transition-opacity duration-200 flex items-center gap-1.5 cursor-pointer shadow-lg"
          title="Kayıt Modundan Çık (ESC)"
        >
          <X className="w-3.5 h-3.5 text-rose-400" />
          <span>{language === 'tr' ? 'Kayıttan Çık (ESC)' : 'Exit (ESC)'}</span>
        </button>
      )}

      {/* 9:16 or 16:9 Video Frame */}
      <div
        ref={containerRef}
        onClick={handlePlayerClick}
        className={`relative ${
          isRecordingMode
            ? is16x9
              ? 'w-full max-w-[1920px] aspect-[16/9] h-auto max-h-screen rounded-none border-none shadow-none'
              : 'h-screen w-[56.25vh] max-w-screen max-h-screen aspect-[9/16] rounded-none border-none shadow-none'
            : isFullscreen
            ? is16x9
              ? 'w-[94vw] max-w-[1240px] aspect-[16/9] h-auto max-h-[88vh] rounded-3xl border-4 border-slate-900 shadow-2xl'
              : 'h-[92vh] max-h-[96vh] aspect-[9/16] w-auto max-w-full rounded-3xl border-4 border-slate-900 shadow-2xl'
            : is16x9
            ? 'w-full max-w-[840px] aspect-[16/9] rounded-3xl border-4 border-slate-900 shadow-2xl'
            : 'w-full max-w-[360px] aspect-[9/16] rounded-3xl border-4 border-slate-900 shadow-2xl'
        } bg-white overflow-hidden select-none flex flex-col justify-between transition-all duration-300`}
      >
        {/* Layer 0, 5, 10: Dynamic 3-Layer 2D Background, Environment, and Focal Diagram */}
        <DynamicBackground
          enabled={isBackgroundOn}
          theme={currentScene?.background?.theme}
          text={currentScene?.text}
          background={currentScene?.background}
          characterPose={activePoseId}
        />

        {/* Top Header Overlay: Minimalist scene badge & title (Hidden during Recording Mode) */}
        {!isRecordingMode && (
          <div className="relative z-20 pt-4 px-4 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span>
                {is16x9 ? '16:9 • ' : ''}
                {language === 'tr' ? 'Sahne' : 'Scene'} {playbackState.currentSceneIndex + 1}/
                {shortData.scenes.length}
              </span>
            </div>

            <div className="flex items-center gap-1.5 pointer-events-auto">
              {/* Clean Screen Recording Fullscreen Mode Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  enterRecordingMode();
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                title={
                  language === 'tr'
                    ? 'Temiz Ekran Kaydı Modu (Tüm butonları gizler, sadece videoyu tam ekran yapar)'
                    : 'Clean Screen Recording Mode (Hides all UI, video only)'
                }
              >
                <Video className="w-3.5 h-3.5 text-rose-200 animate-pulse" />
                <span>{language === 'tr' ? 'Kayıt Modu' : 'Record Mode'}</span>
              </button>

              <div className="flex items-center gap-1 bg-blue-600/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider backdrop-blur-md shadow-sm">
                <span>{activePoseId}</span>
              </div>

              {/* Background Generation ON/OFF quick toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBackgroundOn((prev) => !prev);
                }}
                className={`p-1.5 rounded-full transition-colors backdrop-blur-md shadow-sm cursor-pointer ${
                  isBackgroundOn
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-slate-900/80 hover:bg-slate-900 text-slate-400'
                }`}
                title={
                  language === 'tr'
                    ? isBackgroundOn
                      ? '2D Arka Plan Açık (Beyaza Geç)'
                      : 'Beyaz Arka Plan (2D Arka Planı Aç)'
                    : isBackgroundOn
                      ? '2D Background ON (Click for plain white)'
                      : 'Plain White (Click for 2D background)'
                }
              >
                {isBackgroundOn ? <Image className="w-3.5 h-3.5" /> : <ImageOff className="w-3.5 h-3.5" />}
              </button>

              {/* CC Subtitles quick toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubtitles((prev) => !prev);
                }}
                className={`p-1.5 rounded-full transition-colors backdrop-blur-md shadow-sm cursor-pointer ${
                  showSubtitles
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-slate-900/80 hover:bg-slate-900 text-slate-400'
                }`}
                title={
                  language === 'tr'
                    ? showSubtitles
                      ? 'Altyazıyı Kapat (C)'
                      : 'Altyazıyı Aç (C)'
                    : showSubtitles
                      ? 'Turn off subtitles (C)'
                      : 'Turn on subtitles (C)'
                }
              >
                {showSubtitles ? (
                  <Subtitles className="w-3.5 h-3.5" />
                ) : (
                  <CaptionsOff className="w-3.5 h-3.5" />
                )}
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white transition-colors backdrop-blur-md shadow-sm cursor-pointer"
                title={
                  isFullscreen
                    ? language === 'tr'
                      ? 'Tam Ekrandan Çık (Esc)'
                      : 'Exit Fullscreen (Esc)'
                    : language === 'tr'
                      ? 'Tam Ekran İzle (F)'
                      : 'Watch Fullscreen (F)'
                }
              >
                {isFullscreen ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Screen Recording 3-Second Countdown Overlay */}
        {isRecordingMode && countdown !== null && (
          <div className="absolute inset-0 z-50 bg-black/85 flex flex-col items-center justify-center text-white select-none pointer-events-none animate-in fade-in duration-200">
            <div className="w-24 h-24 rounded-full border-4 border-rose-500 flex items-center justify-center text-5xl font-black mb-3 animate-pulse text-rose-400">
              {countdown}
            </div>
            <p className="text-lg font-black tracking-wide">
              {language === 'tr' ? 'EKRAN KAYDINI BAŞLATIN' : 'START SCREEN RECORDING'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {language === 'tr'
                ? 'Video birazdan otomatik başlayacak • Çıkış: ESC'
                : 'Video starts automatically • Press ESC to exit'}
            </p>
          </div>
        )}

        {/* Layer 20: Protected Character Layer (Zone 4: 46% - 75%) */}
        {/* Protected by contrast separation glow/shadow so character never visually merges with background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20 flex items-center justify-center">
          <div
            className="absolute transition-all duration-700 ease-out"
            style={{
              left: `${layout.characterPercentX}%`,
              top: `${layout.characterPercentY}%`,
              transform: `translate(-50%, -50%) scale(${finalScale}) ${
                currentScene?.position?.flipX ? 'scaleX(-1)' : 'scaleX(1)'
              }`,
              width: is16x9 ? '320px' : '280px',
              height: is16x9 ? '380px' : '350px',
            }}
          >
            {characterImageUrl ? (
              <div
                key={`char-pose-${playbackState.currentSceneIndex}-${activePoseId}`}
                className="w-full h-full animate-in fade-in zoom-in-95 duration-300"
              >
                <img
                  src={characterImageUrl}
                  alt={`Character ${activePoseId}`}
                  className="w-full h-full object-contain select-none pointer-events-none transition-all duration-500"
                  style={{
                    filter: layout.characterFilter,
                  }}
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300">
                <UserCheck className="w-16 h-16" />
              </div>
            )}
          </div>
        </div>

        {/* Layer 35: Cinematic Scene Transition Wipe / Dissolve */}
        {isSceneTransitioning && (
          <div className="absolute inset-0 z-35 pointer-events-none bg-slate-950/20 backdrop-blur-[1px] animate-in fade-in-0 fade-out-100 duration-300 transition-opacity" />
        )}

        {/* Layer 40: Protected Subtitles Layer (Zone 5: 75% - 90%) */}
        {/* Protected contrast backing card guarantees 100% legibility on any background */}
        {showSubtitles && currentSubtitle && (
          <div
            className="absolute left-3 right-3 z-40 flex flex-col items-center pointer-events-none transition-all duration-200"
            style={{
              bottom: is16x9 ? '74px' : '68px',
            }}
          >
            <div className={`${layout.subtitleBackingClass} ${is16x9 ? 'max-w-2xl px-6 py-2.5' : 'max-w-[94%]'} text-center transition-all duration-200`}>
              <p
                className={`${layout.subtitleFontSizeClass} font-black leading-tight tracking-tight uppercase select-none ${layout.subtitleTextColor}`}
              >
                {currentSubtitle}
              </p>
            </div>
          </div>
        )}

        {/* Center Tap to Play/Pause overlay */}
        {!isRecordingMode && (
          <div
            onClick={handleTogglePlay}
            className={`absolute inset-0 z-30 flex items-center justify-center transition-opacity cursor-pointer ${
              !playbackState.isPlaying ? 'bg-slate-900/20' : 'bg-transparent'
            }`}
          >
            {!playbackState.isPlaying && (
              <button
                type="button"
                className="w-16 h-16 rounded-full bg-slate-950/90 text-white flex items-center justify-center shadow-2xl transform active:scale-95 transition-transform border border-white/30 backdrop-blur-md"
              >
                <Play className="w-7 h-7 ml-1 fill-white" />
              </button>
            )}
          </div>
        )}

        {/* Bottom Playback Bar Controls */}
        {!isRecordingMode && (
          <div
            className={`absolute bottom-0 inset-x-0 z-40 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent p-4 pt-10 text-white transition-opacity duration-300 ${
              showControls || !playbackState.isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
          {/* Timeline progress scrubber */}
          <div
            onClick={handleSeek}
            className="w-full h-3 bg-white/20 rounded-full cursor-pointer relative flex items-center mb-3 group"
          >
            <div
              className="h-2 bg-yellow-400 rounded-full transition-all relative"
              style={{
                width: `${Math.min(
                  100,
                  (playbackState.currentTime / (playbackState.totalDuration || 1)) * 100
                )}%`,
              }}
            >
              <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
            </div>
          </div>

          {/* Controls buttons row */}
          <div className="flex items-center justify-between text-xs font-medium">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
                title={playbackState.isPlaying ? 'Pause' : 'Play'}
              >
                {playbackState.isPlaying ? (
                  <Pause className="w-4 h-4 fill-white" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5 fill-white" />
                )}
              </button>

              <button
                type="button"
                onClick={handleRestart}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer"
                title="Restart"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* CC Subtitles toggle in bottom bar */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowSubtitles((prev) => !prev);
                }}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                  showSubtitles
                    ? 'bg-yellow-400 text-slate-950 font-bold'
                    : 'bg-white/20 hover:bg-white/30 text-white/60'
                }`}
                title={
                  language === 'tr'
                    ? showSubtitles
                      ? 'Altyazıyı Kapat (C)'
                      : 'Altyazıyı Aç (C)'
                    : showSubtitles
                      ? 'Turn off subtitles (C)'
                      : 'Turn on subtitles (C)'
                }
              >
                <Subtitles className="w-3.5 h-3.5" />
              </button>

              <span className="font-mono text-[11px] text-white/80">
                {formatTime(playbackState.currentTime)} / {formatTime(playbackState.totalDuration)}
              </span>
            </div>

            {/* Scene dots indicator & Fullscreen toggle */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                {shortData.scenes.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => playerRef.current?.seekToScene(idx)}
                    className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                      playbackState.currentSceneIndex === idx
                        ? 'bg-yellow-400 scale-125'
                        : 'bg-white/40 hover:bg-white/70'
                    }`}
                    title={`Scene ${idx + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen();
                }}
                className="w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors cursor-pointer ml-1"
                title={
                  isFullscreen
                    ? language === 'tr'
                      ? 'Tam Ekrandan Çık (Esc)'
                      : 'Exit Fullscreen'
                    : language === 'tr'
                      ? 'Tam Ekran İzle'
                      : 'Fullscreen'
                }
              >
                {isFullscreen ? (
                  <Minimize2 className="w-3.5 h-3.5 text-white" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Control panel below player - only shown when not fullscreen and not recording */}
      {!isFullscreen && !isRecordingMode && (
        <>
          <div className="w-full mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 px-1">
            <button
              type="button"
              onClick={onBackToEdit}
              className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition-colors text-center shadow-2xs cursor-pointer"
            >
              {language === 'tr' ? '← Yeni Short' : '← New Short'}
            </button>

            {/* Screen Recording Mode Button */}
            <button
              type="button"
              onClick={enterRecordingMode}
              className="py-2.5 px-3 bg-rose-600 hover:bg-rose-500 text-white text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
              title={
                language === 'tr'
                  ? 'Temiz Ekran Kaydı Modu: Tüm butonları gizler, videoyu tam ekran yapar'
                  : 'Clean Screen Recording Mode: Hides all buttons, full-screen video'
              }
            >
              <Video className="w-4 h-4 text-rose-200 animate-pulse" />
              <span>{language === 'tr' ? 'Ekran Kaydı Modu' : 'Record Mode'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSubtitles((prev) => !prev)}
              className={`py-2.5 px-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer border ${
                showSubtitles
                  ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200'
              }`}
              title={language === 'tr' ? 'Altyazıyı Aç / Kapat (C)' : 'Toggle Subtitles (C)'}
            >
              {showSubtitles ? (
                <Subtitles className="w-3.5 h-3.5 text-blue-600" />
              ) : (
                <CaptionsOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>
                {language === 'tr'
                  ? showSubtitles
                    ? 'Altyazı: Açık'
                    : 'Altyazı: Kapalı'
                  : showSubtitles
                    ? 'Subtitles: On'
                    : 'Subtitles: Off'}
              </span>
            </button>

            <button
              type="button"
              onClick={toggleFullscreen}
              className="py-2.5 px-3 bg-slate-900 hover:bg-black text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Maximize2 className="w-3.5 h-3.5 text-yellow-400" />
              <span>{language === 'tr' ? 'Tam Ekran' : 'Fullscreen'}</span>
            </button>

            <button
              type="button"
              onClick={handleRestart}
              className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'tr' ? 'Yeniden Oynat' : 'Replay'}</span>
            </button>
          </div>

          {/* AI Scene Breakdown Details Card */}
          <div className="w-full mt-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs text-left">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              {language === 'tr' ? 'Yapay Zeka Sahne & Duruş Planı' : 'AI Scene & Pose Breakdown'}
            </h4>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {shortData.scenes.map((scene, idx) => {
                const isActive = playbackState.currentSceneIndex === idx;
                return (
                  <div
                    key={scene.id}
                    onClick={() => playerRef.current?.seekToScene(idx)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isActive
                        ? 'bg-blue-50/80 border-blue-400 text-blue-950 font-medium'
                        : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[11px] text-blue-700">
                        {language === 'tr' ? `Sahne ${scene.id}` : `Scene ${scene.id}`} ({scene.duration}s)
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white text-slate-800 border border-slate-200">
                        {scene.characterPose}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-slate-600">{scene.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
