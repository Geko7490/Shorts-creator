export type PoseId =
  | 'idle'
  | 'talking'
  | 'happy'
  | 'sad'
  | 'surprised'
  | 'angry'
  | 'thinking'
  | 'pointing'
  | 'scared'
  | 'laughing'
  | 'confused'
  | 'explaining';

export interface PoseDefinition {
  id: PoseId;
  index: number;
  label: string;
  trLabel: string;
  description: string;
}

export const POSE_DEFINITIONS: PoseDefinition[] = [
  { id: 'idle', index: 1, label: 'Idle / Neutral', trLabel: 'Sakin / Nötr', description: 'Default relaxed resting pose' },
  { id: 'talking', index: 2, label: 'Talking', trLabel: 'Konuşurken', description: 'Mouth open delivering lines' },
  { id: 'happy', index: 3, label: 'Happy', trLabel: 'Mutlu / Sevinçli', description: 'Big smile, positive energy' },
  { id: 'sad', index: 4, label: 'Sad', trLabel: 'Üzgün', description: 'Downcast eyes, empathetic/somber tone' },
  { id: 'surprised', index: 5, label: 'Surprised', trLabel: 'Şaşırmış', description: 'Wide eyes, shock, jaw drop' },
  { id: 'angry', index: 6, label: 'Angry', trLabel: 'Kızgın / Öfkeli', description: 'Intense brows, dramatic tension' },
  { id: 'thinking', index: 7, label: 'Thinking', trLabel: 'Düşünceli', description: 'Hand on chin, contemplating' },
  { id: 'pointing', index: 8, label: 'Pointing', trLabel: 'İşaret Eden', description: 'Pointing finger to highlight facts' },
  { id: 'scared', index: 9, label: 'Scared', trLabel: 'Korkmuş / Ürkmüş', description: 'Shivering, hands up, fright' },
  { id: 'laughing', index: 10, label: 'Laughing', trLabel: 'Kahkaha Atan', description: 'Chuckling, joyful humor' },
  { id: 'confused', index: 11, label: 'Confused', trLabel: 'Kafası Karışık', description: 'Tilted head, puzzled look' },
  { id: 'explaining', index: 12, label: 'Explaining', trLabel: 'Açıklama Yapan', description: 'Open hands, presenting concepts' },
];

export interface SubtitleChunk {
  text: string;
  start: number; // in seconds relative to scene
  end: number;
}

export type BackgroundTheme =
  | 'space'
  | 'cafe'
  | 'nature'
  | 'city'
  | 'cyber'
  | 'indoor'
  | 'history'
  | 'ocean'
  | 'finance'
  | 'mystery'
  | 'lab'
  | 'abstract';

export interface FocalVisualElement {
  id: string;
  label?: string;
  position?: 'top-left' | 'top-right' | 'center-top' | 'left' | 'right' | 'background';
  animation?: 'orbit' | 'chomp' | 'steam' | 'pulse' | 'glow' | 'drift' | 'float' | 'spin' | 'wave';
}

export interface SceneBackground {
  theme: BackgroundTheme;
  environment?: string;
  layout?: 'centered' | 'wide' | 'panoramic';
  mood?: 'vibrant' | 'warm' | 'dark' | 'neon' | 'mysterious' | 'daylight';
  palette?: {
    skyTop: string;
    skyBottom: string;
    ground: string;
    accent: string;
  };
  focalConcept?: string;
  focalLabel?: string;
  focalPosition?: 'top-left' | 'top-right' | 'center-top' | 'left' | 'right' | 'background';
  focalElements?: FocalVisualElement[];
  objects?: string[];
  cameraMotion?: 'pan_slow' | 'zoom_in' | 'drift_up' | 'steady';
  educationalHint?: string;
  animation?: 'twinkle' | 'drift' | 'steam' | 'bubbles' | 'matrix' | 'sway' | 'pulse';
}

export type VoiceMode = 'experimental' | 'advanced';

export interface ScenePosition {
  align: 'bottom-center' | 'bottom-left' | 'bottom-right' | 'center' | 'bottom-zoom';
  xPercent: number; // 0 - 100
  yPercent: number; // 0 - 100
  scale: number;    // 0.8 to 1.5
  flipX?: boolean;
}

export interface Scene {
  id: number;
  text: string;
  characterPose: PoseId;
  position: ScenePosition;
  motion: 'gentle-bob' | 'talking-bounce' | 'surprise-pop' | 'pointing-shift' | 'shake' | 'float' | 'zoom-punch';
  duration: number; // seconds
  audioBase64?: string;
  subtitles: SubtitleChunk[];
  background?: SceneBackground;
}

export interface GeneratedShort {
  title: string;
  topic: string;
  targetDuration: 30 | 60 | 300;
  aspectRatio?: '9:16' | '16:9';
  language: 'tr' | 'en';
  scenes: Scene[];
  totalDuration: number;
  backgroundEnabled?: boolean;
  voiceMode?: VoiceMode;
  planId?: string;
  completedChunks?: number;
  totalChunks?: number;
}

export type ChunkStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';

export interface VideoChunkPlan {
  chunkIndex: number; // 0 to 9 for 10 chunks of ~30s each
  title: string; // e.g. "Bölüm 1: Büyük Patlama ve İlk Işık"
  startTime: string; // "0:00"
  endTime: string; // "0:30"
  startSeconds: number; // 0
  endSeconds: number; // 30
  topicSummary: string; // narrative beat
  status: ChunkStatus;
  scenes: Scene[];
  error?: string;
  retryCount?: number;
}

export interface MasterVideoPlan {
  id: string; // unique ID
  title: string;
  topic: string;
  language: 'tr' | 'en';
  targetDuration: 300; // 5 minutes
  aspectRatio: '16:9';
  createdAt: number;
  updatedAt: number;
  chunks: VideoChunkPlan[];
  completedChunksCount: number;
  totalChunksCount: number;
  isFullyCompleted: boolean;
  activeChunkIndex?: number;
}
