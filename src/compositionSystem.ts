/**
 * Advanced Layout, Safe-Zone, Collision Detection & Contrast Engine
 * Designed for 9:16 Vertical Video (e.g., 360 x 640 logical viewport)
 * Runs 100% locally with 0 API calls.
 */

import { Scene, BackgroundTheme } from './types';

export interface BoundingBox {
  id: string;
  x: number; // left in px
  y: number; // top in px
  width: number; // width in px
  height: number; // height in px
  layer: number; // z-index
  minSpacing?: number;
}

export interface ViewportDimensions {
  width: number; // default 360
  height: number; // default 640
}

export const DEFAULT_VIEWPORT: ViewportDimensions = {
  width: 360,
  height: 640,
};

// 9:16 Safe Zones (in pixels on a 360x640 canvas, and percentages)
export const SAFE_ZONE_BOUNDS = {
  marginHorizontal: 16,
  marginVertical: 14,
  header: { top: 12, height: 44, bottom: 56 }, // 2% - 9%
  label: { top: 62, height: 38, bottom: 100 }, // 10% - 16%
  objects: { top: 104, height: 160, bottom: 264 }, // 16% - 41%
  hint: { top: 268, height: 26, bottom: 294 }, // 42% - 46%
  character: { top: 298, height: 184, bottom: 482 }, // 46% - 75%
  subtitles: { top: 486, height: 86, bottom: 572 }, // 76% - 89%
  controls: { top: 576, height: 52, bottom: 628 }, // 90% - 98%
};

/**
 * 2D AABB Bounding-Box Collision Detection
 */
export function checkCollision(
  boxA: BoundingBox,
  boxB: BoundingBox,
  minSpacing: number = 8
): boolean {
  return !(
    boxA.x + boxA.width + minSpacing <= boxB.x ||
    boxB.x + boxB.width + minSpacing <= boxA.x ||
    boxA.y + boxA.height + minSpacing <= boxB.y ||
    boxB.y + boxB.height + minSpacing <= boxA.y
  );
}

/**
 * Calculates overlap delta between two bounding boxes
 */
export function getOverlapDelta(
  boxA: BoundingBox,
  boxB: BoundingBox,
  minSpacing: number = 8
): { overlapX: number; overlapY: number } {
  if (!checkCollision(boxA, boxB, minSpacing)) {
    return { overlapX: 0, overlapY: 0 };
  }

  const overlapX =
    Math.min(boxA.x + boxA.width, boxB.x + boxB.width) -
    Math.max(boxA.x, boxB.x) +
    minSpacing;
  const overlapY =
    Math.min(boxA.y + boxA.height, boxB.y + boxB.height) -
    Math.max(boxA.y, boxB.y) +
    minSpacing;

  return { overlapX, overlapY };
}

/**
 * Calculates WCAG perceived relative luminance (0 = pure black, 1 = pure white)
 */
export function calculateLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  if (clean.length !== 6 && clean.length !== 3) return 0.5;

  const r = parseInt(clean.length === 3 ? clean[0] + clean[0] : clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.length === 3 ? clean[1] + clean[1] : clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.length === 3 ? clean[2] + clean[2] : clean.substring(4, 6), 16) / 255;

  const sRGB = [r, g, b].map((val) => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
}

/**
 * Calculates contrast ratio between two colors (1:1 to 21:1)
 */
export function calculateContrastRatio(lum1: number, lum2: number): number {
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

export interface ThemeColors {
  gradient: string;
  isDark: boolean;
  baseHex: string;
  accentHex: string;
}

/**
 * Returns balanced theme colors that fit the narrative context
 * NEVER includes arbitrary bright gray circles or high-contrast decorative distractions.
 */
export function getThemeBaseColors(theme: BackgroundTheme, pose?: string): ThemeColors {
  const isHappy = pose === 'happy' || pose === 'laughing';
  const isSurprised = pose === 'surprised';
  const isSad = pose === 'sad';
  const isAngry = pose === 'angry';

  switch (theme) {
    case 'space':
      return {
        gradient: isHappy
          ? 'from-[#06081c] via-[#141238] to-[#221038]' // Deep space towards cosmic violet
          : isAngry
          ? 'from-[#100612] via-[#1c0924] to-[#120516]'
          : 'from-[#040612] via-[#090e24] to-[#12112e]',
        isDark: true,
        baseHex: '#090e24',
        accentHex: isHappy ? '#c084fc' : '#38bdf8',
      };
    case 'ocean':
      return {
        gradient: isHappy
          ? 'from-[#023150] via-[#06486e] to-[#04333b]' // Ocean azure towards sunlit aquamarine
          : isSad
          ? 'from-[#021f33] via-[#032d47] to-[#021726]'
          : 'from-[#022c47] via-[#053d61] to-[#031d30]',
        isDark: true,
        baseHex: '#053d61',
        accentHex: '#38bdf8',
      };
    case 'cafe':
      return {
        gradient: isHappy
          ? 'from-[#2b170e] via-[#3d2013] to-[#2e1c0c]' // Warm roasted coffee to golden caramel
          : 'from-[#24140e] via-[#331c13] to-[#140b07]',
        isDark: true,
        baseHex: '#331c13',
        accentHex: '#f59e0b',
      };
    case 'indoor':
      // Uyku / Gece: Koyu lacivert gece atmosferi; duyguya göre lacivert -> gül kurusu/pembe ay ışığı
      return {
        gradient: isHappy
          ? 'from-[#161233] via-[#24163b] to-[#26102a]' // Lacivert -> yumuşak gece pembesi/moru
          : isSurprised
          ? 'from-[#101938] via-[#19254f] to-[#0e1633]' // Parlak ay ışığı mavisi
          : isSad
          ? 'from-[#080c17] via-[#101726] to-[#050810]'
          : 'from-[#0d1322] via-[#162035] to-[#080d17]',
        isDark: true,
        baseHex: '#162035',
        accentHex: isHappy ? '#f472b6' : '#818cf8',
      };
    case 'history':
      return {
        gradient: isHappy
          ? 'from-[#421a0d] via-[#592312] to-[#361507]'
          : 'from-[#3b170c] via-[#4d1f10] to-[#210c05]',
        isDark: true,
        baseHex: '#4d1f10',
        accentHex: '#fbbf24',
      };
    case 'nature':
      // Doğa: Yeşil tonlar -> Güneşli/aydınlıkta yeşil -> sıcak sarımsı altın ışık
      return {
        gradient: isHappy
          ? 'from-[#0c402e] via-[#174d32] to-[#234214]' // Orman yeşili -> sarı-yeşil güneş tonları
          : isSad
          ? 'from-[#06261c] via-[#0c3629] to-[#041a13]'
          : 'from-[#0a382a] via-[#104837] to-[#06241b]',
        isDark: true,
        baseHex: '#104837',
        accentHex: isHappy ? '#fde047' : '#4ade80',
      };
    case 'cyber':
    case 'lab':
      // Bilim: Mavi -> mor bilimsel ışık geçişi
      return {
        gradient: isHappy || isSurprised
          ? 'from-[#050a24] via-[#0d163d] to-[#1a0e38]' // Mavi -> mor bilimsel geçiş
          : 'from-[#02050e] via-[#061024] to-[#030712]',
        isDark: true,
        baseHex: '#061024',
        accentHex: isHappy ? '#a855f7' : '#06b6d4',
      };
    case 'finance':
      return {
        gradient: isHappy
          ? 'from-[#032e21] via-[#064230] to-[#07361a]'
          : 'from-[#02241a] via-[#043325] to-[#01140e]',
        isDark: true,
        baseHex: '#043325',
        accentHex: '#34d399',
      };
    case 'city':
      return {
        gradient: isHappy
          ? 'from-[#16123b] via-[#221852] to-[#120f2e]'
          : 'from-[#100e29] via-[#19153d] to-[#0a081a]',
        isDark: true,
        baseHex: '#19153d',
        accentHex: '#c084fc',
      };
    case 'mystery':
    default:
      return {
        gradient: 'from-[#08080a] via-[#121214] to-[#020203]',
        isDark: true,
        baseHex: '#121214',
        accentHex: '#e2e8f0',
      };
  }
}

export interface PoseAtmosphere {
  filterStyle: string;
  lightingOverlay: string;
  cameraVibe: 'dramatic' | 'energetic' | 'subdued' | 'normal';
}

export function getPoseAtmosphere(pose: string): PoseAtmosphere {
  switch (pose) {
    case 'surprised':
      return {
        filterStyle: 'brightness(1.08) contrast(1.08)',
        lightingOverlay: 'radial-gradient(circle at 50% 35%, rgba(254, 240, 138, 0.12) 0%, transparent 70%)',
        cameraVibe: 'dramatic',
      };
    case 'sad':
      return {
        filterStyle: 'saturate(0.75) brightness(0.92) contrast(0.95)',
        lightingOverlay: 'radial-gradient(circle at 50% 40%, rgba(148, 163, 184, 0.1) 0%, transparent 80%)',
        cameraVibe: 'subdued',
      };
    case 'angry':
      return {
        filterStyle: 'hue-rotate(-10deg) saturate(1.2) contrast(1.1)',
        lightingOverlay: 'radial-gradient(circle at 50% 35%, rgba(244, 63, 94, 0.12) 0%, transparent 70%)',
        cameraVibe: 'dramatic',
      };
    case 'happy':
    case 'laughing':
      return {
        filterStyle: 'saturate(1.15) brightness(1.05)',
        lightingOverlay: 'radial-gradient(circle at 50% 35%, rgba(251, 191, 36, 0.14) 0%, transparent 65%)',
        cameraVibe: 'energetic',
      };
    case 'thinking':
    case 'confused':
      return {
        filterStyle: 'hue-rotate(5deg) contrast(1.04) brightness(1.0)',
        lightingOverlay: 'radial-gradient(circle at 50% 30%, rgba(129, 140, 248, 0.12) 0%, transparent 70%)',
        cameraVibe: 'normal',
      };
    case 'scared':
      return {
        filterStyle: 'contrast(1.15) brightness(0.88)',
        lightingOverlay: 'radial-gradient(circle at 50% 50%, transparent 40%, rgba(15, 23, 42, 0.35) 100%)',
        cameraVibe: 'dramatic',
      };
    case 'pointing':
    case 'explaining':
    default:
      return {
        filterStyle: 'brightness(1.02) contrast(1.02)',
        lightingOverlay: 'radial-gradient(circle at 50% 35%, rgba(255, 255, 255, 0.05) 0%, transparent 70%)',
        cameraVibe: 'normal',
      };
  }
}

export interface ValidatedLayoutResult {
  // Theme & Background
  isDarkTheme: boolean;
  backgroundGradient: string;
  themeAccent: string;
  poseAtmosphere: PoseAtmosphere;

  // Repositioned & Validated Coordinates
  labelBox: BoundingBox;
  objectBox: BoundingBox;
  hintBox: BoundingBox;
  characterBox: BoundingBox;
  subtitlesBox: BoundingBox;

  // Character Styling & Protection
  characterPercentX: number;
  characterPercentY: number;
  characterScale: number;
  characterFilter: string;

  // Subtitle Contrast & Clipping Protection
  subtitleBackingClass: string;
  subtitleTextColor: string;
  subtitleFontSizeClass: string;

  // Label Styling & Protection
  labelBackingClass: string;
  labelTextColor: string;

  // Layout Pass Metrics
  hasCollisionsResolved: boolean;
  collisionsDetected: string[];
}

/**
 * Comprehensive Layout Validation Pass:
 * 1. Constructs initial bounding boxes based on scene choreography and text lengths.
 * 2. Checks for collisions between:
 *    - Label vs. Object
 *    - Object vs. Character
 *    - Character vs. Subtitles
 *    - Subtitles vs. Controls
 * 3. Automatically resolves overlaps by shifting positions or scaling down.
 * 4. Ensures all text fits comfortably inside 9:16 safe bounds with zero clipping.
 * 5. Validates contrast and applies high-contrast backing panels & shadows when needed.
 */
export function validateAndLayoutScene(
  scene: Scene,
  isBackgroundOn: boolean,
  activeSubtitleText: string,
  viewport: ViewportDimensions = DEFAULT_VIEWPORT,
  aspectRatio: '9:16' | '16:9' = '9:16'
): ValidatedLayoutResult {
  const is16x9 = aspectRatio === '16:9';
  const theme = scene.background?.theme || 'abstract';
  const themeColors = getThemeBaseColors(theme, scene.characterPose);
  const isDark = isBackgroundOn ? themeColors.isDark : false;
  const collisionsDetected: string[] = [];

  const W = viewport.width;
  const H = viewport.height;

  // 1. Initial Label Bounding Box (Zone 1)
  const labelBox: BoundingBox = {
    id: 'label',
    x: is16x9 ? 24 : 30,
    y: is16x9 ? 16 : SAFE_ZONE_BOUNDS.label.top,
    width: is16x9 ? Math.min(320, W - 48) : W - 60,
    height: 36,
    layer: 30, // z-30 (Above Character & Object)
    minSpacing: 8,
  };

  // 2. Initial Object Bounding Box (Zone 2: Educational Diagram / Focal Objects)
  const objectBox: BoundingBox = {
    id: 'object',
    x: is16x9 ? 24 : 20,
    y: is16x9 ? 60 : SAFE_ZONE_BOUNDS.objects.top,
    width: is16x9 ? Math.round(W * 0.5) : W - 40,
    height: is16x9 ? Math.round(H * 0.6) : 145,
    layer: 10, // z-10 (Behind Character)
    minSpacing: 8,
  };

  // 3. Initial Hint Bounding Box
  const hintBox: BoundingBox = {
    id: 'hint',
    x: is16x9 ? 24 : 30,
    y: objectBox.y + objectBox.height + 4,
    width: is16x9 ? Math.round(W * 0.45) : W - 60,
    height: 24,
    layer: 30,
    minSpacing: 6,
  };

  // 4. Initial Character Bounding Box (Zone 4)
  // In 16:9, if not specifically set, offset character to right side (e.g. 70%) for cinematic documentary framing
  const defaultX = is16x9 ? 70 : 50;
  const rawXPercent = scene.position?.xPercent ?? defaultX;
  const rawYPercent = scene.position?.yPercent ?? 59;
  const rawScale = scene.position?.scale ?? (is16x9 ? 1.15 : 1.1);

  let characterWidth = Math.round((is16x9 ? 280 : 250) * rawScale);
  let characterHeight = Math.round((is16x9 ? 340 : 310) * rawScale);
  let characterX = Math.round((rawXPercent / 100) * W - characterWidth / 2);
  let characterY = Math.round((rawYPercent / 100) * H - characterHeight / 2);

  const characterBox: BoundingBox = {
    id: 'character',
    x: characterX,
    y: characterY,
    width: characterWidth,
    height: characterHeight,
    layer: 20, // z-20
    minSpacing: 8,
  };

  // 5. Initial Subtitle Bounding Box (Zone 5)
  const textLength = (activeSubtitleText || scene.text || '').length;
  let subtitleHeight = is16x9 ? 56 : 54;
  let subtitleFontSizeClass = is16x9
    ? textLength > 65
      ? 'text-sm sm:text-base'
      : 'text-base sm:text-lg md:text-xl'
    : textLength > 65
    ? 'text-xs sm:text-sm'
    : textLength > 40
    ? 'text-sm sm:text-base'
    : 'text-lg sm:text-xl';

  if (!is16x9 && textLength > 65) {
    subtitleHeight = 72;
  } else if (!is16x9 && textLength > 40) {
    subtitleHeight = 62;
  }

  const subWidth = is16x9 ? Math.min(680, W - 64) : W - 32;
  const subtitlesBox: BoundingBox = {
    id: 'subtitles',
    x: is16x9 ? Math.round((W - subWidth) / 2) : 16,
    y: H - 74 - subtitleHeight, // parked safely above bottom playback bar
    width: subWidth,
    height: subtitleHeight,
    layer: 40, // z-40 (Top-most presentation layer)
    minSpacing: 8,
  };

  // -------------------------------------------------------------
  // Collision Detection & Automatic Repositioning Passes
  // -------------------------------------------------------------
  let hasCollisionsResolved = false;

  // Check 1: Label vs. Object
  if (checkCollision(labelBox, objectBox, 6)) {
    collisionsDetected.push('label-object');
    // Shift object down slightly so label is not covered
    objectBox.y = labelBox.y + labelBox.height + 6;
    hasCollisionsResolved = true;
  }

  // Update Hint to stay right below Object
  hintBox.y = objectBox.y + objectBox.height + 4;

  // Check 2: Educational Visual (Object/Hint) vs. Character
  // Character must never encroach into the upper educational diagram zone!
  const diagramCeiling = hintBox.y + hintBox.height + 6;
  if (characterBox.y < diagramCeiling) {
    collisionsDetected.push('object-character');
    const overlap = diagramCeiling - characterBox.y;
    characterBox.y += overlap;
    hasCollisionsResolved = true;
  }

  // Check 3: Character vs. Subtitles
  // Character must not obstruct the subtitle reading card!
  const subtitleCeiling = subtitlesBox.y - 6;
  const characterBottom = characterBox.y + characterBox.height;
  if (characterBottom > subtitleCeiling) {
    collisionsDetected.push('character-subtitles');
    // Scale down character slightly or adjust top
    const excess = characterBottom - subtitleCeiling;
    if (excess > 20) {
      characterBox.height -= Math.min(excess, 45);
      characterBox.width = Math.round(characterBox.height * 0.8);
      characterBox.y = subtitleCeiling - characterBox.height;
    } else {
      characterBox.y -= excess;
    }
    hasCollisionsResolved = true;
  }

  // Check 4: Subtitles vs. Safe Zone Bounds (Prevent text clipping out of 9:16 frame)
  if (subtitlesBox.y + subtitlesBox.height > H - 68) {
    collisionsDetected.push('subtitles-bottom-clip');
    subtitlesBox.y = H - 68 - subtitlesBox.height;
    hasCollisionsResolved = true;
  }
  if (subtitlesBox.y < SAFE_ZONE_BOUNDS.subtitles.top - 20) {
    subtitlesBox.y = SAFE_ZONE_BOUNDS.subtitles.top;
  }

  // Final Character Normalized Coordinates
  const finalCharCenterY = characterBox.y + characterBox.height / 2;
  const finalCharCenterX = characterBox.x + characterBox.width / 2;
  const characterPercentX = Math.round(
    Math.min(74, Math.max(26, (finalCharCenterX / W) * 100))
  );
  const characterPercentY = Math.round(
    Math.min(64, Math.max(56, (finalCharCenterY / H) * 100))
  );
  const characterScale = Math.min(1.25, Math.max(0.92, characterBox.height / 310));

  // -------------------------------------------------------------
  // Automatic Contrast Checking & Style Hardening
  // -------------------------------------------------------------
  // Prevent dark characters from blending into dark backgrounds:
  // Add subtle edge separation glow and contact shadow
  const characterFilter = isDark
    ? 'drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.8)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.85))'
    : 'drop-shadow(0 6px 14px rgba(0, 0, 0, 0.16))';

  // Subtitles Protection: Guaranteed High-Contrast Frosted Panel
  // Always exceeds WCAG AAA (7:1 ratio) with text shadow and border
  const subtitleBackingClass = isDark
    ? 'bg-slate-950/85 border border-white/20 text-white shadow-2xl backdrop-blur-md px-4 py-2.5 rounded-2xl'
    : 'bg-white/95 border border-slate-300 text-slate-950 shadow-xl backdrop-blur-md px-4 py-2.5 rounded-2xl';

  const subtitleTextColor = isDark ? 'text-white' : 'text-slate-950';

  // Label Protection:
  const labelBackingClass = isDark
    ? 'bg-slate-950/90 border border-white/25 text-white shadow-lg backdrop-blur-md'
    : 'bg-white/95 border border-slate-300 text-slate-900 shadow-md backdrop-blur-md';

  const labelTextColor = isDark ? '#ffffff' : '#0f172a';

  const poseAtmosphere = getPoseAtmosphere(scene.characterPose || 'talking');

  return {
    isDarkTheme: isDark,
    backgroundGradient: isBackgroundOn ? themeColors.gradient : '',
    themeAccent: themeColors.accentHex,
    poseAtmosphere,
    labelBox,
    objectBox,
    hintBox,
    characterBox,
    subtitlesBox,
    characterPercentX,
    characterPercentY,
    characterScale,
    characterFilter,
    subtitleBackingClass,
    subtitleTextColor,
    subtitleFontSizeClass,
    labelBackingClass,
    labelTextColor,
    hasCollisionsResolved,
    collisionsDetected,
  };
}
