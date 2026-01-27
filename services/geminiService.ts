
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
3. Imagine a whimsical 3D environment. 
4. Suggest a fun action. 
5. Write an epic 12-page whimsical adventure story for a picture book (this is for a 24-page physical book layout). 
   - Each page must have 'text' (1-2 simple, engaging sentences).
   - Each page must have 'imagePrompt' (detailed scene description).
6. Create an engaging story title.
7. Look for a name, age, or date written by the child.

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
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                pageNumber: { type: Type.NUMBER },
                text: { type: Type.STRING },
                imagePrompt: { type: Type.STRING }
              },
              required: ["pageNumber", "text", "imagePrompt"]
            }
          }
        },
        required: ["subject", "characterAppearance", "environment", "suggestedAction", "storyTitle", "pages", "artistName", "year", "grade", "age"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("The magic brush ran out of paint! Try again.");
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
      let errorMessage = 'Video generation completed but no video was returned';
      let errorType: VideoGenerationError['type'] = 'unknown';

      if ((generatedVideos?.[0] as any)?.filterReason || (operation.response as any)?.blockReason) {
        errorMessage = `Video was filtered: ${(generatedVideos?.[0] as any)?.filterReason ?? (operation.response as any)?.blockReason}`;
        errorType = 'content_filtered';
      } else if (!generatedVideos || generatedVideos.length === 0) {
        errorMessage = 'Video generation returned empty results';
        errorType = 'generation_failed';
      } else if (!generatedVideos[0]?.video) {
        errorMessage = 'Video generation returned a result with no video data';
        errorType = 'generation_failed';
      }

      await logError('video_generation_failed', errorMessage, {
        operationResponse: operation.response,
      });

      throw new VideoGenerationError(errorType, errorMessage);
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
