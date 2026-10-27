export type StoryStyle =
  | 'Psychological Horror'
  | 'Haunted Terminal'
  | 'Urban Legend'
  | 'Bittersweet Remembrance';

export type StoryLength = 'Short' | 'Medium' | 'Long';

export type AIProviderMode = 'ollama' | 'sample' | 'gemini';

export type AppView = 'landing' | 'workspace' | 'archive' | 'settings';

export type RelicLightingMood = 'emerald' | 'silver' | 'abyss';

export interface StoryEntry {
  id: string;
  title: string;
  originalNote: string;
  story: string;
  style: StoryStyle;
  length: StoryLength;
  createdAt: string; // ISO string
  wordCount: number;
  providerMode: AIProviderMode;
  providerLabel: string;
  isSample: boolean;
}

export interface GhostnoteSettings {
  providerMode: AIProviderMode;
  ollamaEndpoint: string;
  ollamaModel: string;
  reducedMotion: boolean;
  scanlinesEnabled: boolean;
  lowEffectsMode?: boolean;
}

export interface OllamaVerificationResult {
  verified: boolean;
  connectionOk: boolean;
  inferenceOk: boolean;
  endpoint: string;
  model: string;
  availableModels: string[];
  latencyMs?: number;
  error?: string;
  checkedAt: string;
}

export interface ServerProviderStatus {
  defaultOllamaEndpoint: string;
  defaultOllamaModel: string;
  cloudGeminiConfigured: boolean;
  cloudModelName: string;
}
