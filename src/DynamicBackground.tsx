import React, { useMemo, useState, useEffect, useRef } from 'react';
import { BackgroundTheme, SceneBackground } from './types';
import { getThemeBaseColors, getPoseAtmosphere } from './compositionSystem';
import { ParticleCanvas } from './ParticleCanvas';

interface DynamicBackgroundProps {
  enabled: boolean;
  theme?: BackgroundTheme;
  text?: string;
  background?: SceneBackground;
  characterPose?: string;
  className?: string;
}

export function inferBackgroundTheme(text?: string): BackgroundTheme {
  if (!text) return 'abstract';
  const t = text.toLowerCase();

  // 1. Space
  if (/uzay|gezegen|yıldız|galaksi|karadelik|mars|astronomi|evren|güneş|space|planet|star|galaxy|black hole|cosmos|orbit/.test(t)) {
    return 'space';
  }
  // 2. Sleep / Night / Tired / Room
  if (/esne|esnemek|yawn|uyku|uyuruz|yorgun|sleep|tired|gece|rüya|yatak|dinlen|circadian/.test(t)) {
    return 'indoor';
  }
  // 3. Science / Technology / Lab / Biology
  if (/bilim|laboratuvar|deney|kimya|formül|ilaç|hücre|atom|biyoloji|mikroskop|science|lab|chemistry|biology|experiment|dna|cell|genetik/.test(t)) {
    return 'lab';
  }
  // 4. Cyber / Digital / AI
  if (/yapay zeka|robot|teknoloji|kod|yazılım|internet|bilgisayar|dijital|siber|tech|ai|cyber|code|software/.test(t)) {
    return 'cyber';
  }
  // 5. Ocean / Water / Sea / Shark
  if (/deniz|okyanus|köpekbalığı|su altı|balık|mercan|dalga|batık|ocean|sea|water|shark|underwater|fish/.test(t)) {
    return 'ocean';
  }
  // 6. Nature / Forest / Earth / Volcano
  if (/doğa|orman|ağaç|dağ|nehir|göl|çiçek|yeşil|yanardağ|volkan|nature|forest|tree|mountain|river|volcano/.test(t)) {
    return 'nature';
  }
  // 7. Money / Finance / Wealth / Stock
  if (/para|ekonomi|dolar|zengin|borsa|yatırım|şirket|altın|kar|money|finance|dollar|stock|invest|wealth/.test(t)) {
    return 'finance';
  }
  // 8. History / Antiquity / Empire
  if (/tarih|atatürk|antik|imparatorluk|piramit|roma|osmanlı|savaş|devrim|geçmiş|history|ancient|empire/.test(t)) {
    return 'history';
  }
  // 9. Coffee / Warm beverage
  if (/kahve|kafe|espresso|latte|barista|fincan|içecek|coffee|cafe|tea|brew|çekirdek/.test(t)) {
    return 'cafe';
  }
  // 10. City / Urban / Skyline
  if (/şehir|bina|gökdelen|sokak|cadde|metropol|trafik|city|building|skyscraper|street|urban/.test(t)) {
    return 'city';
  }
  // 11. Mystery / Darkness / Secret
  if (/gizem|korku|hayalet|karanlık|sır|şüphe|tuhaf|efsane|mystery|secret|ghost|dark|scary|legend/.test(t)) {
    return 'mystery';
  }

  return 'abstract';
}

interface BackgroundLayerState {
  theme: BackgroundTheme;
  pose: string;
  key: string;
}

export const DynamicBackground: React.FC<DynamicBackgroundProps> = ({
  enabled,
  theme,
  text,
  background,
  characterPose = 'talking',
  className = '',
}) => {
  // If background generation is OFF, strictly return pure plain white background
  if (!enabled) {
    return (
      <div
        className={`absolute inset-0 z-0 bg-white transition-colors duration-500 ${className}`}
        style={{ backgroundColor: '#ffffff' }}
      />
    );
  }

  const activeTheme = useMemo(() => {
    if (theme) return theme;
    if (background?.theme) return background.theme;
    return inferBackgroundTheme(text);
  }, [theme, background, text]);

  // Dual-buffer state for silky-smooth 1.1s atmospheric color gradient cross-fading
  const [currentLayer, setCurrentLayer] = useState<BackgroundLayerState>({
    theme: activeTheme,
    pose: characterPose,
    key: `layer-init-${activeTheme}-${characterPose}`,
  });
  const [previousLayer, setPreviousLayer] = useState<BackgroundLayerState | null>(null);
  const [isCrossFading, setIsCrossFading] = useState(false);
  const [incomingOpacity, setIncomingOpacity] = useState(1);
  const transitionTimerRef = useRef<any>(null);

  // Detect genuine scene or emotional atmosphere change
  useEffect(() => {
    if (activeTheme !== currentLayer.theme || characterPose !== currentLayer.pose) {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);

      // Save outgoing layer
      setPreviousLayer({ ...currentLayer });

      // Prepare incoming layer at 0 opacity
      const nextLayer: BackgroundLayerState = {
        theme: activeTheme,
        pose: characterPose,
        key: `layer-${activeTheme}-${characterPose}-${Date.now()}`,
      };
      setCurrentLayer(nextLayer);
      setIncomingOpacity(0);
      setIsCrossFading(true);

      // Trigger opacity fade-in on next microtask
      const raf = requestAnimationFrame(() => {
        setIncomingOpacity(1);
      });

      // Complete transition after 1100ms (1.1s)
      transitionTimerRef.current = setTimeout(() => {
        setIsCrossFading(false);
        setPreviousLayer(null);
      }, 1150);

      return () => {
        cancelAnimationFrame(raf);
        if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      };
    }
  }, [activeTheme, characterPose]);

  const currentThemeColors = useMemo(
    () => getThemeBaseColors(currentLayer.theme, currentLayer.pose),
    [currentLayer.theme, currentLayer.pose]
  );
  const currentAtmosphere = useMemo(
    () => getPoseAtmosphere(currentLayer.pose),
    [currentLayer.pose]
  );

  const prevThemeColors = useMemo(
    () => (previousLayer ? getThemeBaseColors(previousLayer.theme, previousLayer.pose) : null),
    [previousLayer]
  );
  const prevAtmosphere = useMemo(
    () => (previousLayer ? getPoseAtmosphere(previousLayer.pose) : null),
    [previousLayer]
  );

  return (
    <div
      className={`absolute inset-0 z-0 overflow-hidden select-none pointer-events-none ${className}`}
    >
      {/* =========================================================================
          PREVIOUS LAYER (Outgoing): Fades away gracefully over 1.1s
          ========================================================================= */}
      {previousLayer && prevThemeColors && prevAtmosphere && (
        <div
          key={previousLayer.key}
          className="absolute inset-0 z-0 transition-opacity duration-[1150ms] ease-in-out pointer-events-none"
          style={{
            opacity: 1 - incomingOpacity,
            filter: prevAtmosphere.filterStyle,
          }}
        >
          {/* Base Cohesive Gradient */}
          <div className={`absolute inset-0 bg-gradient-to-b ${prevThemeColors.gradient}`} />
          {/* Far atmospheric backdrop */}
          <div className="absolute inset-0 opacity-60 filter blur-[1.5px]">
            {renderFarAtmosphere(previousLayer.theme)}
          </div>
          {/* Mid Lighting */}
          <div className="absolute inset-0">
            {renderMidLighting(previousLayer.theme)}
          </div>
          {/* Pose Emotional Lighting */}
          <div
            className="absolute inset-0 pointer-events-none opacity-70 mix-blend-screen"
            style={{ background: prevAtmosphere.lightingOverlay }}
          />
        </div>
      )}

      {/* =========================================================================
          CURRENT LAYER (Incoming): Fades in gracefully over 1.1s
          ========================================================================= */}
      <div
        key={currentLayer.key}
        className="absolute inset-0 z-0 transition-opacity duration-[1150ms] ease-in-out pointer-events-none"
        style={{
          opacity: incomingOpacity,
          filter: currentAtmosphere.filterStyle,
        }}
      >
        {/* Base Cohesive Gradient with Theme-to-Theme & Emotion Color Shifts */}
        <div className={`absolute inset-0 bg-gradient-to-b ${currentThemeColors.gradient}`} />

        {/* Far atmospheric backdrop with soft blur and slow parallax */}
        <div className="absolute inset-0 opacity-60 filter blur-[1.5px] scale-102 transition-transform duration-[6000ms] ease-out">
          {renderFarAtmosphere(currentLayer.theme)}
        </div>

        {/* Mid Layer: Soft Thematic Light Beams & Glows */}
        <div className="absolute inset-0 scale-104 transition-transform duration-[4000ms] ease-out">
          {renderMidLighting(currentLayer.theme)}
        </div>

        {/* Character Emotional Lighting Overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-70 mix-blend-screen transition-all duration-1000"
          style={{ background: currentAtmosphere.lightingOverlay }}
        />
      </div>

      {/* =========================================================================
          TRANSITIONAL LUMINOUS GLOW: Ethereal light shift during color change
          ========================================================================= */}
      <div
        className="absolute inset-0 z-[6] pointer-events-none transition-opacity duration-[1150ms] ease-in-out"
        style={{
          opacity: isCrossFading ? 0.35 : 0,
          background:
            'radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.16) 0%, rgba(254, 240, 138, 0.08) 35%, transparent 70%)',
        }}
      />

      {/* =========================================================================
          SHARED PARTICLES LAYER (z-[8]): Subtle ambient particles
          ========================================================================= */}
      <div className="absolute inset-0 z-[8] pointer-events-none">
        <ParticleCanvas theme={activeTheme} className="opacity-70" />
      </div>

      {/* =========================================================================
          CENTER CLEAN BREATHING SPACE (z-10): Protects character focus
          Ensures character and subtitles remain 100% visible and unhindered
          ========================================================================= */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 65% 50% at 50% 58%, transparent 40%, rgba(0, 0, 0, 0.12) 100%)',
        }}
      />

      {/* =========================================================================
          POST-PROCESSING (z-[15]): Vignette & Subtle Film Grain
          ========================================================================= */}
      <div
        className="absolute inset-0 z-[15] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 60%, rgba(0, 0, 0, 0.62) 100%)',
        }}
      />

      {/* Fine Film Grain Overlay (3% opacity) */}
      <svg className="absolute inset-0 w-full h-full z-[16] pointer-events-none opacity-[0.03]">
        <filter id="cinematicGrainCrossfade">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#cinematicGrainCrossfade)" />
      </svg>
    </div>
  );
};

// --------------------------------------------------------------------------
// 1. Far Layer: Clean Thematic Background Depth
// --------------------------------------------------------------------------
function renderFarAtmosphere(theme: BackgroundTheme) {
  switch (theme) {
    case 'space':
      return (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="nebulaSoft" cx="70%" cy="25%" r="50%">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="nebulaSoft2" cx="20%" cy="65%" r="45%">
              <stop offset="0%" stopColor="#ec4899" stopOpacity="0.2" />
              <stop offset="60%" stopColor="#8b5cf6" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="70%" cy="25%" r="180" fill="url(#nebulaSoft)" />
          <circle cx="20%" cy="65%" r="140" fill="url(#nebulaSoft2)" />
        </svg>
      );
    case 'indoor':
      // Uyku / Gece: Koyu lacivert gece atmosferi
      return (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="nightSkyAmbient" cx="25%" cy="15%" r="60%">
              <stop offset="0%" stopColor="#312e81" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#1e1b4b" stopOpacity="0.15" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="25%" cy="15%" r="220" fill="url(#nightSkyAmbient)" />
        </svg>
      );
    case 'lab':
    case 'cyber':
      // Bilim / Teknoloji: Mavi/mor/cyan gradient, soyut derinlik çizgisi
      return (
        <svg className="absolute inset-0 w-full h-full opacity-40">
          <defs>
            <linearGradient id="cyberLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.4" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <line x1="0" y1="460" x2="360" y2="460" stroke="url(#cyberLineGrad)" strokeWidth="1" />
          <line x1="0" y1="520" x2="360" y2="520" stroke="url(#cyberLineGrad)" strokeWidth="0.8" />
        </svg>
      );
    case 'nature':
      // Doğa: Yeşil tonlar, derin orman derinliği
      return (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="forestCanopyGlow" cx="50%" cy="15%" r="55%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="65%" stopColor="#065f46" stopOpacity="0.1" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="15%" r="200" fill="url(#forestCanopyGlow)" />
        </svg>
      );
    case 'ocean':
      // Okyanus: Derin su altı süzülen mavilik
      return (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="oceanAbyssGlow" cx="50%" cy="10%" r="60%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.3" />
              <stop offset="50%" stopColor="#0284c7" stopOpacity="0.12" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="10%" r="220" fill="url(#oceanAbyssGlow)" />
        </svg>
      );
    case 'history':
      // Tarih: Sıcak terakota / altın antik ışıltı
      return (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="historyGlow" cx="50%" cy="20%" r="55%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#78350f" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="20%" r="200" fill="url(#historyGlow)" />
        </svg>
      );
    case 'finance':
      // Finans: Koyu zümrüt / petrol yeşili gradient
      return (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="financeGlow" cx="60%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#065f46" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="60%" cy="30%" r="180" fill="url(#financeGlow)" />
        </svg>
      );
    case 'cafe':
      // Kahve: Sıcak kehribar / kavrulmuş kahve tonları
      return (
        <svg className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="cafeGlow" cx="50%" cy="25%" r="50%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.2" />
              <stop offset="60%" stopColor="#451a03" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="25%" r="180" fill="url(#cafeGlow)" />
        </svg>
      );
    default:
      return null;
  }
}

// --------------------------------------------------------------------------
// 2. Mid Layer: Thematic Ambient Light Rays & Glows
// --------------------------------------------------------------------------
function renderMidLighting(theme: BackgroundTheme) {
  switch (theme) {
    case 'indoor':
      // Uyku: Yumuşak sol üst ay ışığı huzmesi
      return (
        <svg className="absolute inset-0 w-full h-full opacity-60">
          <defs>
            <linearGradient id="moonbeamRay" x1="0%" y1="0%" x2="70%" y2="80%">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.22" />
              <stop offset="50%" stopColor="#6366f1" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="0,10 80,0 240,460 120,460" fill="url(#moonbeamRay)" />
        </svg>
      );
    case 'nature':
      // Doğa: Yumuşak orman ışık huzmesi
      return (
        <svg className="absolute inset-0 w-full h-full opacity-55">
          <defs>
            <linearGradient id="canopyRay" x1="40%" y1="0%" x2="65%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.18" />
              <stop offset="50%" stopColor="#a7f3d0" stopOpacity="0.06" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="120,0 170,0 260,440 180,440" fill="url(#canopyRay)" />
        </svg>
      );
    case 'ocean':
      // Okyanus: Su yüzeyinden süzülen yumuşak ışık sütunları
      return (
        <svg className="absolute inset-0 w-full h-full opacity-60">
          <defs>
            <linearGradient id="waterRay" x1="30%" y1="0%" x2="45%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.22" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.05" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points="60,0 110,0 180,480 90,480" fill="url(#waterRay)" />
          <polygon points="170,0 220,0 300,480 220,480" fill="url(#waterRay)" opacity="0.65" />
        </svg>
      );
    case 'lab':
    case 'cyber':
      // Bilim: Soyut ışık çizgileri
      return (
        <svg className="absolute inset-0 w-full h-full opacity-35">
          <defs>
            <radialGradient id="cyberPointGlow" cx="75%" cy="30%" r="45%">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="75%" cy="30%" r="130" fill="url(#cyberPointGlow)" />
        </svg>
      );
    case 'finance':
      // Finans: Yukarı yönlü hafif neon ışıma
      return (
        <svg className="absolute inset-0 w-full h-full opacity-40">
          <defs>
            <linearGradient id="trendRay" x1="10%" y1="70%" x2="90%" y2="20%">
              <stop offset="0%" stopColor="transparent" />
              <stop offset="60%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.3" />
            </linearGradient>
          </defs>
          <line x1="30" y1="440" x2="310" y2="180" stroke="url(#trendRay)" strokeWidth="2" strokeDasharray="6 6" />
        </svg>
      );
    case 'cafe':
      // Kahve: Sıcak üst lamba aydınlatması
      return (
        <svg className="absolute inset-0 w-full h-full opacity-60">
          <defs>
            <radialGradient id="warmLightCone" cx="50%" cy="5%" r="55%">
              <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.2" />
              <stop offset="45%" stopColor="#f59e0b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="transparent" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx="50%" cy="5%" r="220" fill="url(#warmLightCone)" />
        </svg>
      );
    default:
      return null;
  }
}
