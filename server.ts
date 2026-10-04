import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '25mb' }));

// Shared Gemini AI client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Generate Short Script and Scene Choreography
app.post('/api/generate-short', async (req: Request, res: Response) => {
  try {
    const { topic, duration = 30, language = 'tr' } = req.body;

    if (!topic || typeof topic !== 'string') {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    const targetSeconds = duration === 60 ? 60 : 30;
    const sceneCount = targetSeconds === 60 ? 7 : 4;
    const wordTarget = targetSeconds === 60 ? '120-145 words total' : '65-80 words total';
    const langLabel = language === 'tr' ? 'Turkish (Türkçe)' : 'English';

    const systemPrompt = `You are a world-class viral YouTube Shorts and TikTok director and scriptwriter.
The user wants a dynamic vertical short video on the topic: "${topic}".
Duration: Approximately ${targetSeconds} seconds (${sceneCount} scenes).
Language: MUST be written in ${langLabel}.
Total script length: approx ${wordTarget}.

You have 12 specific transparent character poses available:
1. "idle": Neutral relaxed pose
2. "talking": Talking, delivering line
3. "happy": Delighted, smiling, upbeat
4. "sad": Empathetic, somber, downcast
5. "surprised": Shocked, eyes wide, disbelief
6. "angry": Intense, dramatic tension, frustration
7. "thinking": Hand on chin, pondering, questioning
8. "pointing": Pointing finger to draw viewer attention to a key fact
9. "scared": Alarmed, fright, nervous
10. "laughing": Chuckling, humorous fact, joy
11. "confused": Puzzled, skeptical, tilting head
12. "explaining": Open arms, breaking down a concept

Instructions:
1. Create a gripping Hook in Scene 1 (e.g., using "surprised", "pointing", or "explaining").
2. For each scene:
   - Provide "text": Punchy, conversational voiceover narration for that scene.
   - Provide "characterPose": Choose the single most fitting pose from the 12 poses above. Vary the poses dynamically across scenes!
   - Provide "position":
     - align: one of "center", "center-left", "center-right", "bottom-center"
     - xPercent: 20 to 80 (e.g. 50 for center, 32 for left, 68 for right)
     - yPercent: 56 to 64 (place character slightly lower than dead center for natural human eye-line framing)
     - scale: 1.0 to 1.32 (vary between medium 1.05 and dynamic punch-in zoom 1.28 for high-impact scenes like surprises or key facts)
     - flipX: boolean
   - Provide "motion": one of "gentle-bob", "zoom-punch", "surprise-pop", "pointing-shift", "stable"
   - Provide "duration": seconds for this scene (sum of durations should equal approximately ${targetSeconds})
   - Provide "subtitles": Split the scene text into 2-5 concise phrase/word chunks with relative start and end timestamps (in seconds from 0 to scene duration) for synchronized animated subtitle display.

3. ONE-SHOT 2D SCENE VISUAL PLAN:
   Analyze the exact narration of each scene and plan matching 2D visuals that explain what is being said even without sound!
   - "backgroundTheme": One of "space", "ocean", "nature", "cafe", "indoor", "history", "cyber", "finance", "mystery", "lab", "city", "abstract".
   - "focalConcept": Specific visual concept to illustrate what is being spoken:
     * "earth_sun_orbit" (e.g. Earth orbiting the Sun)
     * "shark_teeth_closeup" (e.g. Shark with multiple rows of teeth)
     * "sleep_clock_zzz" (e.g. Yawning, sleep, nighttime, biological clocks)
     * "black_hole_spiral" (e.g. Accretion disk, immense gravity, event horizon)
     * "coffee_beans_plant" (e.g. Coffee cherries, roasting beans, coffee discovery)
     * "historical_monument" (e.g. History, Atatürk, ancient empires, monuments)
     * "sunken_atlantis" (e.g. Submerged cities, ancient ocean pillars, coral ruins)
     * "brain_synapses" (e.g. Human brain, memory, thinking, neuroscience)
     * "coin_growth_chart" (e.g. Money, wealth, compound interest, stock markets)
     * "volcano_cross_section" (e.g. Magma chambers, eruptions, geology)
     * "microscope_cells" (e.g. Bacteria, microbiology, cells, viruses)
     * "city_traffic" (e.g. Urban buildings, traffic lights, metropolis)
     * "generic_diagram" (other specialized visual diagram)
   - "focalLabel": Short 2-4 word callout (e.g., "Dünya & Güneş", "Çoklu Diş Sırası", "Uyku ve Esneme")
   - "focalPosition": One of "top-right", "top-left", "center-top", "right", "left" (must be in upper half to not overlap with the character)
   - "educationalHint": 3-6 word summary explaining the concept visually.
   - "cameraMotion": one of "pan_slow", "zoom_in", "drift_up", "steady"
`;

    // Try available models in order of current availability and speed
    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let lastError: any = null;
    let rawText = '';

    for (const modelName of candidateModels) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: `Generate a viral short for: "${topic}". Target duration: ${targetSeconds}s in ${langLabel}.`,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.75,
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: 'Catchy video title' },
                  scenes: {
                    type: Type.ARRAY,
                    description: 'Chronological list of scenes',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        id: { type: Type.INTEGER },
                        text: { type: Type.STRING, description: 'Voiceover text for this scene' },
                        characterPose: {
                          type: Type.STRING,
                          description:
                            'One of the 12 exact pose IDs: idle, talking, happy, sad, surprised, angry, thinking, pointing, scared, laughing, confused, explaining',
                        },
                        position: {
                          type: Type.OBJECT,
                          properties: {
                            align: { type: Type.STRING },
                            xPercent: { type: Type.NUMBER },
                            yPercent: { type: Type.NUMBER },
                            scale: { type: Type.NUMBER },
                            flipX: { type: Type.BOOLEAN },
                          },
                          required: ['align', 'xPercent', 'yPercent', 'scale'],
                        },
                        motion: { type: Type.STRING },
                        duration: { type: Type.NUMBER, description: 'Scene duration in seconds' },
                        backgroundTheme: {
                          type: Type.STRING,
                          description:
                            '2D background theme based on narration: space, cafe, nature, city, cyber, indoor, history, ocean, finance, mystery, lab, abstract',
                        },
                        backgroundObjects: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: '1-4 vector objects representing the scene narration',
                        },
                        backgroundMood: {
                          type: Type.STRING,
                          description: 'Mood: warm, dark, vibrant, neon, daylight, mysterious',
                        },
                        focalConcept: {
                          type: Type.STRING,
                          description: 'Visual concept: earth_sun_orbit, shark_teeth_closeup, sleep_clock_zzz, black_hole_spiral, coffee_beans_plant, historical_monument, sunken_atlantis, brain_synapses, coin_growth_chart, volcano_cross_section, microscope_cells, city_traffic, generic_diagram',
                        },
                        focalLabel: {
                          type: Type.STRING,
                          description: 'Short 2-4 word callout label for the visual diagram',
                        },
                        focalPosition: {
                          type: Type.STRING,
                          description: 'top-right, top-left, center-top, right, left',
                        },
                        educationalHint: {
                          type: Type.STRING,
                          description: 'Brief 3-6 word educational takeaway explaining the visual',
                        },
                        cameraMotion: {
                          type: Type.STRING,
                          description: 'pan_slow, zoom_in, drift_up, steady',
                        },
                        subtitles: {
                          type: Type.ARRAY,
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              text: { type: Type.STRING },
                              start: { type: Type.NUMBER },
                              end: { type: Type.NUMBER },
                            },
                            required: ['text', 'start', 'end'],
                          },
                        },
                      },
                      required: [
                        'id',
                        'text',
                        'characterPose',
                        'position',
                        'motion',
                        'duration',
                        'subtitles',
                      ],
                    },
                  },
                },
                required: ['title', 'scenes'],
              },
            },
          });

          if (response.text) {
            rawText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Attempt ${attempt + 1} with ${modelName} failed:`, err.message);
          // Wait briefly before retry on 503 or 429
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (rawText) break;
    }

    if (!rawText) {
      throw lastError || new Error('All candidate models are temporarily busy. Please try again.');
    }

    // Clean JSON string if wrapped in markdown
    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedData = JSON.parse(cleanJson);

    // Validate and normalize scenes
    const validPoses = new Set([
      'idle', 'talking', 'happy', 'sad', 'surprised', 'angry',
      'thinking', 'pointing', 'scared', 'laughing', 'confused', 'explaining'
    ]);

    const validThemes = new Set([
      'space', 'cafe', 'nature', 'city', 'cyber', 'indoor',
      'history', 'ocean', 'finance', 'mystery', 'lab', 'abstract'
    ]);

    let runningTotal = 0;
    const scenes = (parsedData.scenes || []).map((sc: any, idx: number) => {
      let pose = String(sc.characterPose || 'talking').toLowerCase().trim();
      if (!validPoses.has(pose)) {
        pose = idx % 2 === 0 ? 'talking' : 'explaining';
      }

      let theme = String(sc.backgroundTheme || '').toLowerCase().trim();
      if (!validThemes.has(theme)) {
        theme = 'abstract';
      }

      const dur = Math.max(2.5, Number(sc.duration) || 5);
      runningTotal += dur;

      return {
        id: idx + 1,
        text: sc.text || '',
        characterPose: pose,
        position: {
          align: sc.position?.align || 'center',
          xPercent: Number(sc.position?.xPercent) || 50,
          yPercent: sc.position?.yPercent ? Math.min(64, Math.max(56, Number(sc.position?.yPercent))) : 59,
          scale: Number(sc.position?.scale) || 1.15,
          flipX: Boolean(sc.position?.flipX),
        },
        motion: sc.motion || 'gentle-bob',
        duration: dur,
        background: {
          theme,
          focalConcept: sc.focalConcept || 'generic_diagram',
          focalLabel: sc.focalLabel || '',
          focalPosition: sc.focalPosition || 'top-right',
          educationalHint: sc.educationalHint || '',
          cameraMotion: sc.cameraMotion || 'pan_slow',
          objects: Array.isArray(sc.backgroundObjects) ? sc.backgroundObjects : [],
          mood: sc.backgroundMood || 'vibrant',
        },
        subtitles: Array.isArray(sc.subtitles) && sc.subtitles.length > 0 ? sc.subtitles : [
          { text: sc.text, start: 0, end: dur }
        ],
      };
    });

    res.json({
      title: parsedData.title || topic,
      topic,
      targetDuration: targetSeconds,
      language,
      scenes,
      totalDuration: Number(runningTotal.toFixed(1)),
    });
  } catch (error: any) {
    console.error('Error generating short:', error);
    res.status(500).json({ error: error.message || 'Failed to generate short script' });
  }
});

// In-memory audio cache to prevent duplicate API calls and preserve quota
const ttsAudioCache = new Map<string, string>();
const MAX_CACHE_ITEMS = 250;

// In-memory storage for 5-minute master video plans & checkpoints
interface MasterPlanStore {
  [planId: string]: any;
}
const longVideoPlans: MasterPlanStore = {};

// Helper: Generate TTS audio buffer safely
async function generateTtsBuffer(
  cleanText: string,
  voiceName?: string,
  language: string = 'tr'
): Promise<{ audioBase64?: string; error?: string; dailyQuotaExceeded?: boolean }> {
  // Male voice default: 'Fenrir' (deep, resonant, masculine)
  const selectedVoice = voiceName || 'Fenrir';
  const cacheKey = `${language}:${selectedVoice}:${cleanText}`;

  if (ttsAudioCache.has(cacheKey)) {
    return { audioBase64: `data:audio/wav;base64,${ttsAudioCache.get(cacheKey)!}` };
  }

  const stylePrompt =
    language === 'tr'
      ? 'Articulate, deep, resonant natural Turkish male studio voiceover, expressive storytelling pacing'
      : 'Articulate, deep, resonant natural male studio voiceover, expressive documentary storytelling pacing';

  let dailyQuotaReached = false;

  const base64Audio = await scheduleTtsCall(async () => {
    // gemini-3.8-flash-lite-tts provides high throughput and resilience
    const ttsCandidateModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];

    for (let attempt = 1; attempt <= 2; attempt++) {
      let hadTransientLimit = false;

      for (const model of ttsCandidateModels) {
        try {
          const ttsResponse = await ai.models.generateContent({
            model,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: cleanText,
                    speechMetadata: {
                      style: stylePrompt,
                    },
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: selectedVoice },
                },
              },
            },
          });

          const audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (audio) {
            if (ttsAudioCache.size >= MAX_CACHE_ITEMS) {
              const firstKey = ttsAudioCache.keys().next().value;
              if (firstKey) ttsAudioCache.delete(firstKey);
            }
            ttsAudioCache.set(cacheKey, audio);
            return audio;
          }
        } catch (ttsErr: any) {
          const errMsg = ttsErr?.message || '';
          if (
            errMsg.includes('free_tier_requests') ||
            errMsg.includes('limit: 10') ||
            errMsg.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier') ||
            errMsg.includes('7132') ||
            errMsg.includes('3499')
          ) {
            dailyQuotaReached = true;
            console.log(`[TTS] Daily quota limit reached on model ${model}.`);
            break;
          } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
            hadTransientLimit = true;
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      }

      if (dailyQuotaReached) break;
      if (hadTransientLimit && attempt < 2) {
        await new Promise((r) => setTimeout(r, 2500));
      } else if (!hadTransientLimit) {
        break;
      }
    }

    return undefined;
  });

  if (base64Audio) {
    return { audioBase64: `data:audio/wav;base64,${base64Audio}` };
  }

  return {
    error: dailyQuotaReached ? 'DAILY_QUOTA_EXHAUSTED' : 'RATE_LIMIT_WAIT',
    dailyQuotaExceeded: dailyQuotaReached,
  };
}

// --------------------------------------------------------------------------
// 5-MINUTE VIDEO: PRE-PLANNING ENDPOINT (/api/plan-long-video)
// Plans the complete 300-second 16:9 video in 10 sequential 30-second chapters
// --------------------------------------------------------------------------
app.post('/api/plan-long-video', async (req: Request, res: Response) => {
  try {
    const { topic, language = 'tr' } = req.body;

    if (!topic || typeof topic !== 'string') {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    const langLabel = language === 'tr' ? 'Turkish (Türkçe)' : 'English';

    const systemPrompt = `You are a master documentary director and scriptwriter creating a comprehensive 5-minute (300 seconds) widescreen 16:9 video on the topic: "${topic}".
Language: MUST be written in ${langLabel}.
Total duration: 300 seconds.

You MUST structure this video into EXACTLY 10 sequential 30-second chapters (chunks):
- Chunk 0: 0:00 - 0:30 (Engaging hook, core question, dramatic opening)
- Chunk 1: 0:30 - 1:00 (Historical origin / foundational principle)
- Chunk 2: 1:00 - 1:30 (Key discovery, fascinating breakthrough)
- Chunk 3: 1:30 - 2:00 (Deep dive: How it actually works)
- Chunk 4: 2:00 - 2:30 (Counter-intuitive twist, common myth debunked)
- Chunk 5: 2:30 - 3:00 (Real-world examples, extraordinary evidence)
- Chunk 6: 3:00 - 3:30 (Human/technological connection, impact on life)
- Chunk 7: 3:30 - 4:00 (Scientific or philosophical revelation)
- Chunk 8: 4:00 - 4:30 (Future prospects, cutting-edge frontiers)
- Chunk 9: 4:30 - 5:00 (Grand synthesis, inspiring takeaway, outro)

For each of the 10 chunks:
- Provide "title": Chapter title (e.g. "Bölüm 1: Büyük Patlama ve İlk Işık")
- Provide "startTime": "0:00", "endTime": "0:30", etc.
- Provide "topicSummary": 1 sentence summarizing this chapter's narrative beat.
- Provide 2 or 3 detailed "scenes" (approx 10-15 seconds each).
  For each scene:
  - "text": Natural, engaging voiceover narration (approx 20-30 words per scene).
  - "characterPose": One of the 12 exact poses: idle, talking, happy, sad, surprised, angry, thinking, pointing, scared, laughing, confused, explaining.
  - "position": Format for 16:9 widescreen:
    * align: "bottom-right", "bottom-left", or "center"
    * xPercent: 65 to 75 (place on right side so widescreen graphics breathe on left), or 25 to 35
    * yPercent: 58 to 64
    * scale: 1.1 to 1.25
  - "motion": one of "gentle-bob", "zoom-punch", "surprise-pop", "pointing-shift"
  - "duration": approx 10 to 15 seconds.
  - "backgroundTheme": one of "space", "nature", "lab", "cyber", "ocean", "indoor", "history", "finance", "cafe", "city", "mystery"
  - "focalConcept": e.g. "earth_sun_orbit", "shark_teeth_closeup", "sleep_clock_zzz", "black_hole_spiral", "coffee_beans_plant", "historical_monument", "brain_synapses", "coin_growth_chart", "microscope_cells", "generic_diagram"
  - "focalLabel": 2-4 word concept badge
  - "educationalHint": 3-6 word summary
  - "subtitles": Array of concise phrase chunks with relative start and end timestamps.
`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let rawText = '';
    let lastError: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: `Create the complete 10-chapter master plan for a 5-minute (300 seconds) 16:9 widescreen video on "${topic}" in ${langLabel}.`,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.7,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                chunks: {
                  type: Type.ARRAY,
                  description: 'Exactly 10 chapters of ~30 seconds each',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      chunkIndex: { type: Type.INTEGER },
                      title: { type: Type.STRING },
                      startTime: { type: Type.STRING },
                      endTime: { type: Type.STRING },
                      topicSummary: { type: Type.STRING },
                      scenes: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            id: { type: Type.INTEGER },
                            text: { type: Type.STRING },
                            characterPose: { type: Type.STRING },
                            position: {
                              type: Type.OBJECT,
                              properties: {
                                align: { type: Type.STRING },
                                xPercent: { type: Type.NUMBER },
                                yPercent: { type: Type.NUMBER },
                                scale: { type: Type.NUMBER },
                              },
                              required: ['align', 'xPercent', 'yPercent', 'scale'],
                            },
                            motion: { type: Type.STRING },
                            duration: { type: Type.NUMBER },
                            backgroundTheme: { type: Type.STRING },
                            focalConcept: { type: Type.STRING },
                            focalLabel: { type: Type.STRING },
                            educationalHint: { type: Type.STRING },
                            subtitles: {
                              type: Type.ARRAY,
                              items: {
                                type: Type.OBJECT,
                                properties: {
                                  text: { type: Type.STRING },
                                  start: { type: Type.NUMBER },
                                  end: { type: Type.NUMBER },
                                },
                                required: ['text', 'start', 'end'],
                              },
                            },
                          },
                          required: ['text', 'characterPose', 'duration'],
                        },
                      },
                    },
                    required: ['chunkIndex', 'title', 'startTime', 'endTime', 'scenes'],
                  },
                },
              },
              required: ['title', 'chunks'],
            },
          },
        });

        if (response.text) {
          rawText = response.text;
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${modelName} failed for 5-min plan:`, err.message);
      }
    }

    if (!rawText) {
      throw lastError || new Error('Failed to generate 5-minute video plan');
    }

    let cleanJson = rawText.trim();
    if (cleanJson.startsWith('```json')) {
      cleanJson = cleanJson.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(cleanJson);
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Ensure exactly 10 chunks with clean bounds
    const formattedChunks = (parsed.chunks || []).map((ch: any, idx: number) => {
      const startSec = idx * 30;
      const endSec = (idx + 1) * 30;
      const startMinStr = `${Math.floor(startSec / 60)}:${(startSec % 60).toString().padStart(2, '0')}`;
      const endMinStr = `${Math.floor(endSec / 60)}:${(endSec % 60).toString().padStart(2, '0')}`;

      const rawScenes = Array.isArray(ch.scenes) && ch.scenes.length > 0 ? ch.scenes : [
        {
          text: ch.topicSummary || `Bölüm ${idx + 1} anlatımı`,
          characterPose: idx % 2 === 0 ? 'talking' : 'explaining',
          duration: 30,
        },
      ];

      const scenes = rawScenes.map((sc: any, scIdx: number) => ({
        id: idx * 10 + scIdx + 1,
        text: sc.text || '',
        characterPose: sc.characterPose || 'talking',
        position: {
          align: sc.position?.align || 'bottom-right',
          xPercent: sc.position?.xPercent || 70,
          yPercent: sc.position?.yPercent || 60,
          scale: sc.position?.scale || 1.15,
        },
        motion: sc.motion || 'gentle-bob',
        duration: Number(sc.duration) || 15,
        background: {
          theme: sc.backgroundTheme || 'space',
          focalConcept: sc.focalConcept || 'generic_diagram',
          focalLabel: sc.focalLabel || '',
          educationalHint: sc.educationalHint || '',
        },
        subtitles: Array.isArray(sc.subtitles) && sc.subtitles.length > 0 ? sc.subtitles : [
          { text: sc.text || '', start: 0, end: Number(sc.duration) || 15 },
        ],
      }));

      return {
        chunkIndex: idx,
        title: ch.title || `Bölüm ${idx + 1}: (${startMinStr} - ${endMinStr})`,
        startTime: startMinStr,
        endTime: endMinStr,
        startSeconds: startSec,
        endSeconds: endSec,
        topicSummary: ch.topicSummary || '',
        status: 'PENDING',
        scenes,
      };
    });

    const masterPlan = {
      id: planId,
      title: parsed.title || topic,
      topic,
      language,
      targetDuration: 300,
      aspectRatio: '16:9',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      chunks: formattedChunks,
      completedChunksCount: 0,
      totalChunksCount: formattedChunks.length,
      isFullyCompleted: false,
    };

    longVideoPlans[planId] = masterPlan;

    res.json(masterPlan);
  } catch (error: any) {
    console.error('Error planning long video:', error);
    res.status(500).json({ error: error.message || '5 dakikalık video planı oluşturulamadı.' });
  }
});

// --------------------------------------------------------------------------
// 5-MINUTE VIDEO: GENERATE SINGLE CHUNK (/api/generate-chunk)
// Generates TTS audio for a single 30-second chunk and saves checkpoint
// --------------------------------------------------------------------------
app.post('/api/generate-chunk', async (req: Request, res: Response) => {
  try {
    const { planId, chunkIndex, scenes, voiceName, language = 'tr' } = req.body;

    if (chunkIndex === undefined || !Array.isArray(scenes)) {
      res.status(400).json({ error: 'chunkIndex and scenes array are required' });
      return;
    }

    const selectedVoice = voiceName || (language === 'tr' ? 'Puck' : 'Fenrir');
    const updatedScenes = [];
    let hadError = false;
    let errorMessage = '';
    let dailyQuotaHit = false;

    // Generate audio for each scene in the chunk
    for (const sc of scenes) {
      if (sc.audioBase64) {
        // Reuse existing audio (zero API call)
        updatedScenes.push(sc);
        continue;
      }

      if (sc.text && sc.text.trim()) {
        const ttsResult = await generateTtsBuffer(sc.text.trim(), selectedVoice, language);

        if (ttsResult.audioBase64) {
          updatedScenes.push({
            ...sc,
            audioBase64: ttsResult.audioBase64,
          });
        } else {
          hadError = true;
          dailyQuotaHit = Boolean(ttsResult.dailyQuotaExceeded);
          errorMessage = dailyQuotaHit
            ? 'Günlük stüdyo ses kotası doldu. Mevcut bölümler güvenle kaydedildi.'
            : 'Seslendirme servisi meşgul, lütfen biraz bekleyip tekrar deneyin.';
          updatedScenes.push(sc);
          break; // Stop immediately to preserve previous completed chunks
        }
      } else {
        updatedScenes.push(sc);
      }
    }

    const chunkStatus = hadError ? 'FAILED' : 'COMPLETED';

    // Update in-memory plan if registered
    if (planId && longVideoPlans[planId]) {
      const plan = longVideoPlans[planId];
      if (plan.chunks && plan.chunks[chunkIndex]) {
        plan.chunks[chunkIndex].status = chunkStatus;
        plan.chunks[chunkIndex].scenes = updatedScenes;
        if (hadError) {
          plan.chunks[chunkIndex].error = errorMessage;
        } else {
          delete plan.chunks[chunkIndex].error;
        }

        const completedCount = plan.chunks.filter((c: any) => c.status === 'COMPLETED').length;
        plan.completedChunksCount = completedCount;
        plan.isFullyCompleted = completedCount === plan.chunks.length;
        plan.updatedAt = Date.now();
      }
    }

    res.json({
      success: !hadError,
      status: chunkStatus,
      chunkIndex,
      updatedScenes,
      error: errorMessage || undefined,
      dailyQuotaExceeded: dailyQuotaHit,
    });
  } catch (error: any) {
    console.error('Error generating chunk:', error);
    res.status(500).json({ error: error.message || 'Bölüm üretilemedi.' });
  }
});

// --------------------------------------------------------------------------
// 5-MINUTE VIDEO: SAVE / LOAD CHECKPOINT ENDPOINTS
// --------------------------------------------------------------------------
app.post('/api/save-checkpoint', (req: Request, res: Response) => {
  const { plan } = req.body;
  if (!plan || !plan.id) {
    res.status(400).json({ error: 'Valid plan with ID required' });
    return;
  }
  longVideoPlans[plan.id] = { ...plan, updatedAt: Date.now() };
  res.json({ success: true, planId: plan.id, savedAt: Date.now() });
});

app.get('/api/get-checkpoint/:id', (req: Request, res: Response) => {
  const plan = longVideoPlans[req.params.id];
  if (!plan) {
    res.status(404).json({ error: 'Plan not found' });
    return;
  }
  res.json(plan);
});

// --------------------------------------------------------------------------
// 5-MINUTE VIDEO: MERGE CHUNKS INTO UNIFIED 16:9 VIDEO
// --------------------------------------------------------------------------
app.post('/api/merge-long-video', (req: Request, res: Response) => {
  try {
    const { plan } = req.body;
    if (!plan || !Array.isArray(plan.chunks)) {
      res.status(400).json({ error: 'Valid plan with chunks required' });
      return;
    }

    const mergedScenes: any[] = [];
    let globalRunningSeconds = 0;
    let sceneIdCounter = 1;

    for (const chunk of plan.chunks) {
      if (Array.isArray(chunk.scenes)) {
        for (const sc of chunk.scenes) {
          const dur = Number(sc.duration) || 10;
          mergedScenes.push({
            ...sc,
            id: sceneIdCounter++,
            duration: dur,
            position: {
              ...sc.position,
              align: sc.position?.align || 'bottom-right',
              xPercent: sc.position?.xPercent || 70,
              yPercent: sc.position?.yPercent || 60,
              scale: sc.position?.scale || 1.15,
            },
          });
          globalRunningSeconds += dur;
        }
      }
    }

    const unifiedVideo = {
      title: plan.title,
      topic: plan.topic,
      targetDuration: 300,
      aspectRatio: '16:9',
      language: plan.language || 'tr',
      scenes: mergedScenes,
      totalDuration: Number(globalRunningSeconds.toFixed(1)),
      voiceMode: 'advanced', // Strictly Gemini Studio TTS audio playback
      planId: plan.id,
      completedChunks: plan.completedChunksCount || plan.chunks.length,
      totalChunks: plan.totalChunksCount || plan.chunks.length,
    };

    res.json(unifiedVideo);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Videolar birleştirilemedi' });
  }
});

// Rate-limiting queue: ensures slow, balanced spacing (min 3800ms) to avoid quota spikes
let lastTtsCallTime = 0;
const MIN_TTS_INTERVAL_MS = 3800; // Balanced pacing to prevent 429 rate limit
let ttsQueue: Promise<any> = Promise.resolve();

function scheduleTtsCall<T>(task: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    ttsQueue = ttsQueue.then(async () => {
      const now = Date.now();
      const elapsed = now - lastTtsCallTime;
      if (elapsed < MIN_TTS_INTERVAL_MS) {
        await new Promise((r) => setTimeout(r, MIN_TTS_INTERVAL_MS - elapsed));
      }
      try {
        lastTtsCallTime = Date.now();
        const result = await task();
        resolve(result);
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Endpoint: Generate TTS Audio for a scene or script segment
const ttsCooldowns: Record<string, number> = {};

app.post('/api/generate-tts', async (req: Request, res: Response) => {
  try {
    const { text, language = 'tr', voiceName } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for TTS' });
      return;
    }

    const cleanText = text.trim();
    // Default to 'Fenrir' (deep, resonant, masculine male voice)
    const selectedVoice = voiceName || 'Fenrir';
    const cacheKey = `${language}:${selectedVoice}:${cleanText}`;

    // 1. Check if audio is already cached (instant response, 0 quota used)
    if (ttsAudioCache.has(cacheKey)) {
      const cachedData = ttsAudioCache.get(cacheKey)!;
      res.json({
        audioBase64: `data:audio/wav;base64,${cachedData}`,
        mimeType: 'audio/wav',
        success: true,
        cached: true,
      });
      return;
    }

    const stylePrompt = language === 'tr'
      ? 'Articulate, deep, resonant natural Turkish male studio voiceover, expressive storytelling pacing'
      : 'Articulate, deep, resonant natural male studio voiceover, expressive storytelling pacing';

    // 2. Schedule execution in the balanced queue with smart quota handling
    let dailyQuotaReached = false;

    const base64Audio = await scheduleTtsCall(async () => {
      // gemini-3.8-flash-lite-tts provides high throughput and resilience
      const ttsCandidateModels = ['gemini-3.8-flash-lite-tts', 'gemini-3.8-flash-tts'];

      for (let attempt = 1; attempt <= 2; attempt++) {
        let hadTransientLimit = false;

        for (const model of ttsCandidateModels) {
          try {
            const ttsResponse = await ai.models.generateContent({
              model,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: cleanText,
                      speechMetadata: {
                        style: stylePrompt,
                      },
                    },
                  ],
                },
              ],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: selectedVoice },
                  },
                },
              },
            });

            const audio = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
            if (audio) {
              if (ttsAudioCache.size >= MAX_CACHE_ITEMS) {
                const firstKey = ttsAudioCache.keys().next().value;
                if (firstKey) ttsAudioCache.delete(firstKey);
              }
              ttsAudioCache.set(cacheKey, audio);
              return audio;
            }
          } catch (ttsErr: any) {
            const errMsg = ttsErr?.message || '';

            // Detect if this is Google API daily free tier 10-request exhaustion
            if (
              errMsg.includes('free_tier_requests') ||
              errMsg.includes('limit: 10') ||
              errMsg.includes('GenerateRequestsPerDayPerProjectPerModel-FreeTier') ||
              errMsg.includes('7132') ||
              errMsg.includes('3499')
            ) {
              dailyQuotaReached = true;
              // Clean informative log without raw error dump
              console.log(`[TTS] Daily 10-call free quota reached on model ${model}.`);
              break;
            } else if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
              hadTransientLimit = true;
              await new Promise((r) => setTimeout(r, 1500));
            }
          }
        }

        if (dailyQuotaReached) {
          break;
        }

        // Only retry if it was a brief transient rate limit
        if (hadTransientLimit && attempt < 2) {
          await new Promise((r) => setTimeout(r, 3000));
        } else if (!hadTransientLimit) {
          break;
        }
      }

      return undefined;
    });

    if (base64Audio) {
      res.json({
        audioBase64: `data:audio/wav;base64,${base64Audio}`,
        mimeType: 'audio/wav',
        success: true,
      });
    } else {
      res.json({
        success: false,
        dailyQuotaExceeded: dailyQuotaReached,
        error: dailyQuotaReached ? 'DAILY_QUOTA_EXHAUSTED' : 'RATE_LIMIT_WAIT',
        message: dailyQuotaReached
          ? 'Google ücretsiz stüdyo sesi kotası (günlük 10 istek) doldu. Sınırsız seslendirme için AI Studio ücretli plana geçebilirsiniz.'
          : 'Kota şu an dinlendiriliyor, lütfen biraz bekleyip tekrar deneyin.',
      });
    }
  } catch (error: any) {
    res.json({
      success: false,
      error: 'TTS_FAILED',
      message: 'Seslendirme geçici olarak üretilemedi.',
    });
  }
});

// Dev / Production serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
