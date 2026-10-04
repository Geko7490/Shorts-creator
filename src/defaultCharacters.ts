import { PoseId } from './types';

// Creates SVG Data URI for transparent character poses
function svgToDataUri(svgContent: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent.trim())}`;
}

// Generate stylized modern vector avatar for each of the 12 poses
function createPoseSvg(pose: PoseId): string {
  // Shared base characteristics: round friendly head, stylish hair, cyan/violet hoodie, transparent background
  let mouth = '';
  let eyes = '';
  let eyebrows = '';
  let arms = '';
  let extras = '';

  switch (pose) {
    case 'idle':
      eyes = `
        <ellipse cx="85" cy="95" rx="6" ry="7" fill="#1e293b"/>
        <ellipse cx="115" cy="95" rx="6" ry="7" fill="#1e293b"/>
        <circle cx="83" cy="93" r="2" fill="#ffffff"/>
        <circle cx="113" cy="93" r="2" fill="#ffffff"/>
      `;
      eyebrows = `
        <path d="M 76 83 Q 85 80 94 83" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 106 83 Q 115 80 124 83" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 92 114 Q 100 119 108 114" stroke="#e11d48" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
      arms = `
        <path d="M 60 160 Q 55 190 65 210" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 145 190 135 210" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      break;

    case 'talking':
      eyes = `
        <ellipse cx="85" cy="95" rx="6" ry="7" fill="#1e293b"/>
        <ellipse cx="115" cy="95" rx="6" ry="7" fill="#1e293b"/>
        <circle cx="83" cy="93" r="2" fill="#ffffff"/>
        <circle cx="113" cy="93" r="2" fill="#ffffff"/>
      `;
      eyebrows = `
        <path d="M 76 82 Q 85 78 94 82" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M 106 82 Q 115 78 124 82" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 90 110 Q 100 126 110 110 Z" fill="#991b1b" stroke="#e11d48" stroke-width="2"/>
        <path d="M 93 118 Q 100 122 107 118" fill="#fda4af"/>
      `;
      arms = `
        <path d="M 60 160 Q 45 185 60 200" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 155 180 145 195" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      break;

    case 'happy':
      eyes = `
        <path d="M 78 96 Q 85 88 92 96" stroke="#0f172a" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 108 96 Q 115 88 122 96" stroke="#0f172a" stroke-width="4" stroke-linecap="round" fill="none"/>
      `;
      eyebrows = `
        <path d="M 76 80 Q 85 75 94 80" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 106 80 Q 115 75 124 80" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 88 110 Q 100 128 112 110 Z" fill="#e11d48"/>
        <path d="M 92 110 Q 100 113 108 110" stroke="#ffffff" stroke-width="3" fill="none"/>
      `;
      arms = `
        <path d="M 60 160 Q 35 160 35 140" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 165 160 165 140" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <ellipse cx="76" cy="106" rx="7" ry="4" fill="#fda4af" opacity="0.7"/>
        <ellipse cx="124" cy="106" rx="7" ry="4" fill="#fda4af" opacity="0.7"/>
        <polygon points="170,80 173,86 180,88 174,93 176,100 170,96 164,100 166,93 160,88 167,86" fill="#facc15"/>
      `;
      break;

    case 'sad':
      eyes = `
        <ellipse cx="85" cy="98" rx="6" ry="6" fill="#1e293b"/>
        <ellipse cx="115" cy="98" rx="6" ry="6" fill="#1e293b"/>
        <circle cx="83" cy="96" r="1.5" fill="#ffffff"/>
        <circle cx="113" cy="96" r="1.5" fill="#ffffff"/>
      `;
      eyebrows = `
        <path d="M 76 83 Q 86 87 94 85" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 106 85 Q 114 87 124 83" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 92 120 Q 100 114 108 120" stroke="#b91c1c" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      `;
      arms = `
        <path d="M 60 160 Q 55 195 70 215" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 145 195 130 215" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <path d="M 122 102 C 122 106 125 110 125 114 C 125 116 123 118 121 118 C 119 118 117 116 117 114 C 117 110 120 106 122 102 Z" fill="#38bdf8"/>
      `;
      break;

    case 'surprised':
      eyes = `
        <circle cx="83" cy="94" r="8" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
        <circle cx="83" cy="94" r="4" fill="#0f172a"/>
        <circle cx="117" cy="94" r="8" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
        <circle cx="117" cy="94" r="4" fill="#0f172a"/>
      `;
      eyebrows = `
        <path d="M 74 77 Q 83 71 92 77" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M 108 77 Q 117 71 126 77" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <ellipse cx="100" cy="116" rx="7" ry="11" fill="#991b1b" stroke="#e11d48" stroke-width="2"/>
      `;
      arms = `
        <path d="M 60 160 Q 30 165 40 145" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 170 165 160 145" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <text x="145" y="75" font-family="sans-serif" font-weight="900" font-size="28" fill="#e11d48">!</text>
      `;
      break;

    case 'angry':
      eyes = `
        <path d="M 78 90 L 92 97 L 78 99 Z" fill="#0f172a"/>
        <path d="M 122 90 L 108 97 L 122 99 Z" fill="#0f172a"/>
      `;
      eyebrows = `
        <path d="M 75 80 L 95 91" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M 125 80 L 105 91" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round"/>
      `;
      mouth = `
        <path d="M 90 118 L 110 118" stroke="#991b1b" stroke-width="4" stroke-linecap="round"/>
        <path d="M 92 114 L 108 114" stroke="#ffffff" stroke-width="3"/>
      `;
      arms = `
        <path d="M 60 160 Q 40 175 55 190" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 160 175 145 190" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <path d="M 150 75 Q 160 65 155 55" stroke="#ef4444" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 158 80 Q 170 70 165 60" stroke="#ef4444" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
      break;

    case 'thinking':
      eyes = `
        <ellipse cx="87" cy="91" rx="5" ry="6" fill="#1e293b"/>
        <ellipse cx="117" cy="91" rx="5" ry="6" fill="#1e293b"/>
      `;
      eyebrows = `
        <path d="M 77 78 Q 85 75 93 80" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M 107 83 Q 115 85 125 81" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 94 116 Q 102 113 108 116" stroke="#991b1b" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
      arms = `
        <path d="M 60 160 Q 60 185 85 180" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 145 190 115 160 Q 105 145 95 125" stroke="#0284c7" stroke-width="12" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <circle cx="150" cy="80" r="3" fill="#94a3b8"/>
        <circle cx="160" cy="68" r="5" fill="#94a3b8"/>
        <ellipse cx="175" cy="50" rx="14" ry="10" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
        <text x="171" y="55" font-family="sans-serif" font-weight="bold" font-size="14" fill="#64748b">?</text>
      `;
      break;

    case 'pointing':
      eyes = `
        <ellipse cx="85" cy="94" rx="6" ry="7" fill="#1e293b"/>
        <ellipse cx="115" cy="94" rx="6" ry="7" fill="#1e293b"/>
        <circle cx="83" cy="92" r="2" fill="#ffffff"/>
        <circle cx="113" cy="92" r="2" fill="#ffffff"/>
      `;
      eyebrows = `
        <path d="M 76 80 Q 85 76 94 80" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M 106 80 Q 115 76 124 80" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 92 112 Q 100 122 108 112 Z" fill="#e11d48"/>
      `;
      arms = `
        <path d="M 60 160 Q 45 185 60 205" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 170 145 185 105" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <circle cx="187" cy="100" r="7" fill="#fcd34d"/>
        <polygon points="187,90 185,100 195,96" fill="#f59e0b"/>
      `;
      break;

    case 'scared':
      eyes = `
        <ellipse cx="83" cy="94" rx="7" ry="8" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
        <ellipse cx="83" cy="94" rx="3" ry="4" fill="#0f172a"/>
        <ellipse cx="117" cy="94" rx="7" ry="8" fill="#ffffff" stroke="#0f172a" stroke-width="2"/>
        <ellipse cx="117" cy="94" rx="3" ry="4" fill="#0f172a"/>
      `;
      eyebrows = `
        <path d="M 74 81 Q 84 86 92 84" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M 108 84 Q 116 86 126 81" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 90 118 Q 95 114 100 118 Q 105 114 110 118" stroke="#991b1b" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
      arms = `
        <path d="M 60 160 Q 60 135 80 130" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 140 135 120 130" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <path d="M 62 82 C 60 85 58 88 58 91 C 58 93 60 95 62 95 C 64 95 66 93 66 91 C 66 88 64 85 62 82 Z" fill="#38bdf8"/>
        <path d="M 50 110 L 55 115 M 48 120 L 53 125" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
      `;
      break;

    case 'laughing':
      eyes = `
        <path d="M 76 96 Q 85 86 94 96" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" fill="none"/>
        <path d="M 106 96 Q 115 86 124 96" stroke="#0f172a" stroke-width="4.5" stroke-linecap="round" fill="none"/>
      `;
      eyebrows = `
        <path d="M 76 78 Q 85 74 94 78" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <path d="M 106 78 Q 115 74 124 78" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 86 108 Q 100 132 114 108 Z" fill="#e11d48"/>
        <path d="M 90 108 Q 100 112 110 108" stroke="#ffffff" stroke-width="4" fill="none"/>
        <path d="M 94 122 Q 100 126 106 122" fill="#fda4af"/>
      `;
      arms = `
        <path d="M 60 160 Q 40 150 45 130" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 160 150 155 130" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <path d="M 70 94 Q 63 92 67 87 Z" fill="#38bdf8"/>
        <path d="M 130 94 Q 137 92 133 87 Z" fill="#38bdf8"/>
        <text x="148" y="90" font-family="sans-serif" font-weight="900" font-size="16" fill="#f59e0b">XD</text>
      `;
      break;

    case 'confused':
      eyes = `
        <ellipse cx="85" cy="94" rx="7" ry="7" fill="#1e293b"/>
        <ellipse cx="115" cy="96" rx="4" ry="4" fill="#1e293b"/>
      `;
      eyebrows = `
        <path d="M 76 76 Q 85 72 94 78" stroke="#0f172a" stroke-width="4" stroke-linecap="round" fill="none"/>
        <path d="M 106 84 Q 115 88 124 85" stroke="#0f172a" stroke-width="4" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 92 117 Q 98 121 106 113" stroke="#b91c1c" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      `;
      arms = `
        <path d="M 60 160 Q 45 175 55 195" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 155 155 155 135" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <text x="150" y="70" font-family="sans-serif" font-weight="900" font-size="28" fill="#8b5cf6">?</text>
      `;
      break;

    case 'explaining':
      eyes = `
        <ellipse cx="85" cy="94" rx="6" ry="7" fill="#1e293b"/>
        <ellipse cx="115" cy="94" rx="6" ry="7" fill="#1e293b"/>
        <circle cx="83" cy="92" r="2" fill="#ffffff"/>
        <circle cx="113" cy="92" r="2" fill="#ffffff"/>
      `;
      eyebrows = `
        <path d="M 76 80 Q 85 76 94 80" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
        <path d="M 106 80 Q 115 76 124 80" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
      `;
      mouth = `
        <path d="M 92 110 Q 100 124 108 110 Z" fill="#e11d48"/>
      `;
      arms = `
        <path d="M 60 160 Q 25 170 30 145" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
        <path d="M 140 160 Q 175 170 170 145" stroke="#0284c7" stroke-width="14" stroke-linecap="round" fill="none"/>
      `;
      extras = `
        <circle cx="28" cy="142" r="7" fill="#fcd34d"/>
        <circle cx="172" cy="142" r="7" fill="#fcd34d"/>
      `;
      break;
  }

  // Pure vector avatar with transparent background
  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="100%" height="100%">
      <!-- Drop shadow filter -->
      <defs>
        <filter id="shadow-${pose}" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" flood-color="#0f172a" flood-opacity="0.12"/>
        </filter>
        <linearGradient id="bodyGrad-${pose}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0284c7"/>
          <stop offset="100%" stop-color="#0369a1"/>
        </linearGradient>
        <linearGradient id="skinGrad-${pose}" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fed7aa"/>
          <stop offset="100%" stop-color="#fdba74"/>
        </linearGradient>
        <linearGradient id="hairGrad-${pose}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#475569"/>
          <stop offset="100%" stop-color="#1e293b"/>
        </linearGradient>
      </defs>

      <g filter="url(#shadow-${pose})">
        <!-- Body / Hoodie Torso -->
        <path d="M 60 155 Q 100 145 140 155 L 155 240 L 45 240 Z" fill="url(#bodyGrad-${pose})"/>

        <!-- Hoodie Collar & Strings -->
        <path d="M 80 150 Q 100 165 120 150" stroke="#0ea5e9" stroke-width="8" stroke-linecap="round" fill="none"/>
        <path d="M 94 160 L 92 185" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M 106 160 L 108 185" stroke="#f8fafc" stroke-width="2.5" stroke-linecap="round"/>

        <!-- Arms -->
        ${arms}

        <!-- Neck -->
        <rect x="90" y="132" width="20" height="20" rx="6" fill="#fdba74"/>

        <!-- Head / Face -->
        <ellipse cx="100" cy="100" rx="38" ry="42" fill="url(#skinGrad-${pose})"/>

        <!-- Ears -->
        <circle cx="62" cy="102" r="8" fill="#fdba74"/>
        <circle cx="138" cy="102" r="8" fill="#fdba74"/>

        <!-- Hair Back & Front -->
        <path d="M 62 90 C 58 60 80 45 100 45 C 120 45 142 60 138 90 C 132 62 118 56 100 56 C 82 56 68 64 62 90 Z" fill="url(#hairGrad-${pose})"/>
        <path d="M 68 76 C 85 58 115 62 132 74 C 124 64 110 60 98 62 C 86 64 76 68 68 76 Z" fill="#64748b"/>
        <path d="M 64 88 Q 72 70 88 74 Q 72 82 64 88 Z" fill="url(#hairGrad-${pose})"/>

        <!-- Nose -->
        <path d="M 100 101 Q 103 105 100 107" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round" fill="none"/>

        <!-- Dynamic Eyes, Brows, Mouth -->
        ${eyebrows}
        ${eyes}
        ${mouth}

        <!-- Dynamic Pose Extras -->
        ${extras}
      </g>
    </svg>
  `;
}

export function getDefaultCharacterPoses(): Record<PoseId, string> {
  const poses: Partial<Record<PoseId, string>> = {};
  const poseIds: PoseId[] = [
    'idle',
    'talking',
    'happy',
    'sad',
    'surprised',
    'angry',
    'thinking',
    'pointing',
    'scared',
    'laughing',
    'confused',
    'explaining',
  ];

  for (const id of poseIds) {
    poses[id] = svgToDataUri(createPoseSvg(id));
  }

  return poses as Record<PoseId, string>;
}
