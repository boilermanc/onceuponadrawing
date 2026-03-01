
import { GoogleGenAI, Type } from "@google/genai";
import { DrawingAnalysis, StoryPage } from "../types";
import { logError } from './errorLoggingService';

export class VideoGenerationError extends Error {
  type: 'content_filtered' | 'generation_failed' | 'rate_limited' | 'unknown';

  constructor(type: VideoGenerationError['type'], message: string) {
    super(message);
    this.type = type;
  }
}

const VIDEO_GENERATION_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const getBase64Data = (base64: string) => base64.split(',')[1];

export const analyzeDrawing = async (base64Image: string): Promise<DrawingAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: getBase64Data(base64Image),
          },
        },
        {
          text: `You are a world-class children's storyteller. Analyze this drawing.

1. Identify the subject.
2. Create a detailed 'characterAppearance' description (colors, shapes, key features) for consistent illustration.
3. Imagine a whimsical 3D environment that fits the drawing.
4. Suggest a fun action the subject could be doing.
5. Create an engaging story title.
6. Look for a name, age, grade, or date written by the child.

Output JSON format exactly.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          subject: { type: Type.STRING },
          characterAppearance: { type: Type.STRING },
          environment: { type: Type.STRING },
          suggestedAction: { type: Type.STRING },
          storyTitle: { type: Type.STRING },
          artistName: { type: Type.STRING },
          year: { type: Type.STRING },
          grade: { type: Type.STRING },
          age: { type: Type.STRING },
        },
        required: ["subject", "characterAppearance", "environment", "suggestedAction", "storyTitle", "artistName", "year", "grade", "age"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("The magic brush ran out of paint! Try again.");
  return JSON.parse(text.trim());
};

export const generateStory = async (
  base64Image: string,
  analysis: DrawingAnalysis,
  surpriseMe?: boolean
): Promise<StoryPage[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';

  const guidedPrompt = `You are a world-class children's picture-book author. Using the character from this drawing and the details below, write a 10-page whimsical children's adventure story.

Character: ${analysis.subject} (${analysis.characterAppearance})
Setting/Environment: ${analysis.environment}
Main Action/Plot Driver: ${analysis.suggestedAction}
Story Title: ${analysis.storyTitle}

Requirements:
- The story takes place in the environment described above: "${analysis.environment}".
- The main plot is driven by the action: "${analysis.suggestedAction}".
- Each page must have 'text' (1-2 simple, engaging sentences for young children).
- Each page must have 'imagePrompt' (a detailed 3D Pixar-style scene description for illustration, always referencing the character's appearance for consistency).
- Build a clear beginning, middle, and satisfying end across exactly 10 pages.

Output a JSON array of 10 page objects.`;

  const surprisePrompt = `You are a world-class children's storyteller. Look at this character — ${analysis.subject} (${analysis.characterAppearance}) — and invent a completely unexpected, whimsical 10-page adventure story. Surprise us — go somewhere we'd never expect. Be bold and creative. Invent a wild new setting, an unusual quest, and delightful twists.

Requirements:
- Each page must have 'text' (1-2 simple, engaging sentences for young children).
- Each page must have 'imagePrompt' (a detailed 3D Pixar-style scene description for illustration, always referencing the character's appearance for consistency).
- Build a clear beginning, middle, and satisfying end across exactly 10 pages.

Output a JSON array of 10 page objects.`;

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: getBase64Data(base64Image),
          },
        },
        {
          text: surpriseMe ? surprisePrompt : guidedPrompt,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            pageNumber: { type: Type.NUMBER },
            text: { type: Type.STRING },
            imagePrompt: { type: Type.STRING },
          },
          required: ["pageNumber", "text", "imagePrompt"],
        },
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("The story wizard lost their quill! Try again.");
  return JSON.parse(text.trim());
};

export const generateStoryImage = async (
  originalBase64: string,
  characterDescription: string,
  pagePrompt: string
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-2.5-flash-image';

  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: getBase64Data(originalBase64),
          },
        },
        {
          text: `Using the character from this reference image (${characterDescription}), create a high-quality 3D Pixar-style illustration: ${pagePrompt}. Vivid colors, cinematic lighting.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("Could not create magic picture.");
};

export const generateAnimation = async (
  base64Image: string,
  analysis: DrawingAnalysis
): Promise<{ videoUrl: string, heroImageUrl: string }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'veo-3.1-fast-generate-preview';

    const prompt = `A magical, high-quality 3D cinematic animation. The character ${analysis.subject} (${analysis.characterAppearance}) is ${analysis.suggestedAction} in a vibrant ${analysis.environment}. Professional lighting.`;

    let operation = await ai.models.generateVideos({
      model,
      prompt,
      image: {
        imageBytes: getBase64Data(base64Image),
        mimeType: 'image/png',
      },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });

    const startTime = Date.now();
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      if (Date.now() - startTime > VIDEO_GENERATION_TIMEOUT_MS) {
        const elapsed = Date.now() - startTime;
        await logError('video_generation_timeout', `Video generation timed out after ${Math.round(elapsed / 1000)}s`, {
          elapsedMs: elapsed,
          lastOperationState: operation,
        });
        throw new VideoGenerationError('generation_failed', 'Video generation timed out');
      }
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const generatedVideos = operation.response?.generatedVideos;
    const downloadLink = generatedVideos?.[0]?.video?.uri;

    if (!downloadLink) {
      console.error('[Veo Error] Full operation response:', JSON.stringify(operation, null, 2));

      // Check for RAI content filter
      const raiReasons = (operation as any).operationResponse?.raiMediaFilteredReasons;
      if (raiReasons && raiReasons.length > 0) {
        console.error('[Veo Error] Content filtered:', raiReasons);
        // User-friendly message for the photo filter
        if (raiReasons[0]?.includes('photorealistic children')) {
          throw new VideoGenerationError(
            'content_filtered',
            'Oops! Our video maker works best with hand-drawn artwork. Try uploading a drawing on paper instead of a photo!'
          );
        }
        throw new VideoGenerationError('content_filtered', `Content filtered: ${raiReasons[0]}`);
      }

      // Check for other failure reasons
      const firstVideo = generatedVideos?.[0];
      if ((firstVideo as any)?.video?.state === 'FAILED') {
        throw new VideoGenerationError(
          'generation_failed',
          `Video generation failed: ${(firstVideo as any)?.video?.error?.message || 'Unknown reason'}`
        );
      }

      throw new VideoGenerationError('unknown', 'The magic portal closed! Try again.');
    }

    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    const videoUrl = URL.createObjectURL(blob);

    // For MVP, we use the original image as the hero image if we can't extract a frame easily
    return { videoUrl, heroImageUrl: base64Image };
  } catch (err) {
    if (err instanceof VideoGenerationError) {
      throw err;
    }
    const message = err instanceof Error ? err.message : String(err);
    const isRateLimit = message.includes('429') || message.toLowerCase().includes('quota') || message.toLowerCase().includes('rate');
    await logError('video_generation_error', message, {
      subject: analysis.subject,
      suggestedAction: analysis.suggestedAction,
    });
    throw new VideoGenerationError(isRateLimit ? 'rate_limited' : 'unknown', message);
  }
};
