import { GoogleGenAI, Modality, Type, FunctionDeclaration, Tool } from "@google/genai";
import { AgentMode, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Tool Definitions for the Orchestrator Router
const orchestratorTools: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "dispatch_create_image",
        description: "Routes the request to the Artist Agent to generate an image. Use this when the user asks to draw, paint, or create a picture.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            prompt: { type: Type.STRING, description: "The detailed visual description of the image to generate." }
          },
          required: ["prompt"]
        }
      },
      {
        name: "dispatch_speak_text",
        description: "Routes the request to the Speaker Agent to convert text to audio. Use this when the user explicitly asks to 'say', 'speak', or 'read aloud' something.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING, description: "The text to be spoken." }
          },
          required: ["text"]
        }
      },
      {
        name: "dispatch_write_code",
        description: "Routes the request to the Expert Coder Agent. Use this for complex programming tasks, debugging, or writing complete scripts.",
        parameters: {
          type: Type.OBJECT,
          properties: {
            task_description: { type: Type.STRING, description: "The description of the coding task." }
          },
          required: ["task_description"]
        }
      }
    ]
  },
  { googleSearch: {} } // Enable Live Search for Research/Info
];

/**
 * Orchestrates calls based on the selected Agent Mode or routes automatically via Orchestrator.
 */
export const generateResponse = async (
  prompt: string,
  mode: AgentMode,
  history: Message[],
  imageAttachment?: string // base64
): Promise<Partial<Message>> => {
  try {
    // If we are in Orchestrator mode, we act as the "Hub"
    if (mode === AgentMode.ORCHESTRATOR) {
        return await runOrchestrator(prompt, history, imageAttachment);
    }

    // Manual overrides (Direct access to specialized agents)
    switch (mode) {
      case AgentMode.ARTIST:
        return await generateImage(prompt);
      case AgentMode.SPEAKER:
        return await generateSpeech(prompt);
      case AgentMode.CODER:
        return await generateCode(prompt, history);
      case AgentMode.ANALYST:
        return await analyzeContent(prompt, history, imageAttachment);
      default:
        return await runOrchestrator(prompt, history, imageAttachment);
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      role: 'model',
      type: 'error',
      content: `System Error: ${error.message || "Unknown error occurred."}`,
      timestamp: Date.now()
    };
  }
};

/**
 * The "Hub" logic: Analyzes intent and routes to specialized functions or answers directly.
 */
async function runOrchestrator(prompt: string, history: Message[], imageAttachment?: string): Promise<Partial<Message>> {
  // If there's an image attached, we default to the multimodal capabilities of Flash 2.5
  // We can still use tools if the text prompt asks for it, but let's prioritize the analysis first
  if (imageAttachment) {
      // Pass through to Analyst logic for now, or we could feed image + tools 
      // (Flash 2.5 supports image + tools, but let's keep it robust)
      return await analyzeContent(prompt, history, imageAttachment);
  }

  const model = 'gemini-2.5-flash';

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      tools: orchestratorTools,
      systemInstruction: `You are Nexus, an intelligent orchestration hub. 
      Your job is to ROUTE the user's request to the correct specialized agent using the available tools.
      - If the user wants an image, call 'dispatch_create_image'.
      - If the user wants code, call 'dispatch_write_code'.
      - If the user wants speech, call 'dispatch_speak_text'.
      - If the user asks for real-time information, news, or facts, use the built-in Google Search.
      - Otherwise, answer the query directly using your own knowledge.`,
    }
  });

  // 1. Check for Tool/Function Calls (The Router Logic)
  const functionCalls = response.functionCalls;
  if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      console.log(`[Orchestrator] Routing to: ${call.name}`);

      if (call.name === 'dispatch_create_image') {
          const args = call.args as any;
          return await generateImage(args.prompt);
      }
      if (call.name === 'dispatch_speak_text') {
          const args = call.args as any;
          return await generateSpeech(args.text);
      }
      if (call.name === 'dispatch_write_code') {
          const args = call.args as any;
          return await generateCode(args.task_description, history);
      }
  }

  // 2. Handle Text Response + Grounding (Research Logic)
  const text = response.text || "I processed that request.";
  
  // Extract search sources if available
  const webSources: Array<{uri: string, title: string}> = [];
  const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
  
  if (groundingChunks) {
    groundingChunks.forEach(chunk => {
      if (chunk.web) {
        webSources.push({
          uri: chunk.web.uri || '',
          title: chunk.web.title || 'Source'
        });
      }
    });
  }

  return {
    role: 'model',
    type: 'text',
    content: text,
    timestamp: Date.now(),
    metadata: { 
        webSources: webSources.length > 0 ? webSources : undefined 
    }
  };
}

// --- Specialized Agent Functions ---

async function generateText(prompt: string, history: Message[]): Promise<Partial<Message>> {
  const model = 'gemini-2.5-flash';
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  return {
    role: 'model',
    type: 'text',
    content: response.text || "No response text.",
    timestamp: Date.now()
  };
}

async function generateCode(prompt: string, history: Message[]): Promise<Partial<Message>> {
  // Specialized Coder: Uses Pro with Thinking
  const model = 'gemini-3-pro-preview';
  
  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      systemInstruction: "You are an expert Senior Software Engineer. Write clean, efficient, and well-documented code.",
      thinkingConfig: { thinkingBudget: 2048 } 
    }
  });

  return {
    role: 'model',
    type: 'code',
    content: response.text || "// No code generated",
    timestamp: Date.now(),
    metadata: { codeLanguage: 'typescript' }
  };
}

async function generateImage(prompt: string): Promise<Partial<Message>> {
  // Specialized Artist: Uses Imagen-capable endpoint (Flash Image)
  const model = 'gemini-2.5-flash-image';

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
  });

  const parts = response.candidates?.[0]?.content?.parts;
  let imageUrl = '';
  let text = '';

  if (parts) {
    for (const part of parts) {
        if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
        text = part.text;
        }
    }
  }

  if (!imageUrl) {
    return {
      role: 'model',
      type: 'text',
      content: "I couldn't generate an image. Please try a different prompt.",
      timestamp: Date.now()
    };
  }

  return {
    role: 'model',
    type: 'image',
    content: text || `Generated: ${prompt}`,
    timestamp: Date.now(),
    metadata: { imageUrl }
  };
}

async function generateSpeech(prompt: string): Promise<Partial<Message>> {
  // Specialized Speaker: Uses TTS
  const model = 'gemini-2.5-flash-preview-tts';

  const response = await ai.models.generateContent({
    model,
    contents: {
        parts: [{ text: prompt }]
    },
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const parts = response.candidates?.[0]?.content?.parts;
  const audioData = parts?.[0]?.inlineData?.data;

  if (!audioData) {
      throw new Error("Audio data missing in response");
  }

  return {
    role: 'model',
    type: 'audio',
    content: "Audio output generated.",
    timestamp: Date.now(),
    metadata: { audioData }
  };
}

async function analyzeContent(prompt: string, history: Message[], imageBase64?: string): Promise<Partial<Message>> {
  // Specialized Analyst: Uses Flash with Vision capabilities
  const model = 'gemini-2.5-flash';
  
  const parts: any[] = [{ text: prompt }];

  if (imageBase64) {
    const base64Data = imageBase64.split(',')[1]; 
    parts.unshift({
      inlineData: {
        mimeType: 'image/png', 
        data: base64Data
      }
    });
  }

  const response = await ai.models.generateContent({
    model,
    contents: { parts },
    config: {
        systemInstruction: "You are a visual data analyst. Analyze the provided image/data and the text request."
    }
  });

  return {
    role: 'model',
    type: 'text',
    content: response.text || "Analysis complete.",
    timestamp: Date.now()
  };
}
