export enum AgentMode {
  ORCHESTRATOR = 'ORCHESTRATOR', // General purpose, decides or handles text
  CODER = 'CODER',               // Specialized coding (thinking model)
  ARTIST = 'ARTIST',             // Image generation
  SPEAKER = 'SPEAKER',           // Text to Speech
  ANALYST = 'ANALYST'            // Vision/Analysis
}

export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string; // Text content or description
  type: 'text' | 'image' | 'audio' | 'code' | 'error';
  timestamp: number;
  metadata?: {
    imageUrl?: string; // For generated or uploaded images
    audioData?: string; // Base64 audio for playback
    codeLanguage?: string;
    thinking?: boolean; // If it's a thinking process
    webSources?: Array<{ uri: string; title: string }>; // For search grounding
  };
}

export interface GenerationConfig {
  mode: AgentMode;
  thinkingBudget?: number;
}