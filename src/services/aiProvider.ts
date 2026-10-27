import { synthesizeSampleStory } from '../data/starterArchive';
import {
  GhostnoteSettings,
  OllamaVerificationResult,
  ServerProviderStatus,
  StoryLength,
  StoryStyle,
} from '../types/ghostnote';

export interface GenerateStoryParams {
  note: string;
  style: StoryStyle;
  length: StoryLength;
  settings: GhostnoteSettings;
  ollamaVerified: boolean;
  regenerationCount?: number;
  signal?: AbortSignal;
}

export interface GeneratedStoryOutput {
  title: string;
  story: string;
  providerMode: 'ollama' | 'sample' | 'gemini';
  providerLabel: string;
  isSample: boolean;
  fallbackNotice?: string;
}

export async function fetchServerProviderStatus(): Promise<ServerProviderStatus> {
  try {
    const res = await fetch('/api/providers/status');
    if (!res.ok) throw new Error('Status check failed');
    return (await res.json()) as ServerProviderStatus;
  } catch {
    return {
      defaultOllamaEndpoint: 'http://127.0.0.1:11434',
      defaultOllamaModel: 'llama3.2',
      cloudGeminiConfigured: false,
      cloudModelName: 'gemini-3.8-flash',
    };
  }
}

export async function verifyOllamaConnection(
  endpoint: string,
  model: string
): Promise<OllamaVerificationResult> {
  try {
    const res = await fetch('/api/providers/verify-ollama', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, model }),
    });
    const data = await res.json();
    return {
      verified: Boolean(data.verified),
      connectionOk: Boolean(data.connectionOk),
      inferenceOk: Boolean(data.inferenceOk),
      endpoint: data.endpoint || endpoint,
      model: data.model || model,
      availableModels: Array.isArray(data.availableModels) ? data.availableModels : [],
      latencyMs: typeof data.latencyMs === 'number' ? data.latencyMs : undefined,
      error: data.error,
      checkedAt: new Date().toISOString(),
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error';
    return {
      verified: false,
      connectionOk: false,
      inferenceOk: false,
      endpoint,
      model,
      availableModels: [],
      error: `Verification request failed: ${msg}`,
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function generateGhostnoteStory({
  note,
  style,
  length,
  settings,
  ollamaVerified,
  regenerationCount = 0,
  signal,
}: GenerateStoryParams): Promise<GeneratedStoryOutput> {
  // 1. Offline Sample Mode explicitly selected
  if (settings.providerMode === 'sample') {
    await new Promise((resolve) => setTimeout(resolve, 450));
    const sample = synthesizeSampleStory(note, style, length, regenerationCount);
    return {
      title: sample.title,
      story: sample.story,
      providerMode: 'sample',
      providerLabel: 'Sample Story (Offline Demo)',
      isSample: true,
    };
  }

  // 2. Local Open-Weight Inference via Ollama
  if (settings.providerMode === 'ollama') {
    // If not yet verified, attempt live generation via server, or fall back honestly to Sample Mode if unreachable
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          style,
          length,
          provider: 'ollama',
          ollamaEndpoint: settings.ollamaEndpoint,
          ollamaModel: settings.ollamaModel,
        }),
        signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Ollama error (${res.status})`);
      }

      return {
        title: data.title,
        story: data.story,
        providerMode: 'ollama',
        providerLabel: data.providerLabel || `Verified Local Ollama (${settings.ollamaModel})`,
        isSample: false,
      };
    } catch (err: unknown) {
      if (signal?.aborted) {
        throw err;
      }
      const errMsg = err instanceof Error ? err.message : 'Local Ollama unreachable';
      // Provide a clearly labeled Sample Story when local provider is unavailable
      const sample = synthesizeSampleStory(note, style, length, regenerationCount);
      return {
        title: sample.title,
        story: sample.story,
        providerMode: 'sample',
        providerLabel: 'Sample Story (Local Ollama Unavailable)',
        isSample: true,
        fallbackNotice: `${
          ollamaVerified ? 'Local Ollama connection dropped' : 'Local Ollama is not connected'
        } (${errMsg}). Showing a clearly labeled Sample Story instead.`,
      };
    }
  }

  // 3. Optional Cloud Provider (Google Gemini)
  if (settings.providerMode === 'gemini') {
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note,
          style,
          length,
          provider: 'gemini',
        }),
        signal,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Cloud Gemini error (${res.status})`);
      }

      return {
        title: data.title,
        story: data.story,
        providerMode: 'gemini',
        providerLabel: 'Cloud Inference (Google Gemini)',
        isSample: false,
      };
    } catch (err: unknown) {
      if (signal?.aborted) {
        throw err;
      }
      const errMsg = err instanceof Error ? err.message : 'Cloud provider unavailable';
      const sample = synthesizeSampleStory(note, style, length, regenerationCount);
      return {
        title: sample.title,
        story: sample.story,
        providerMode: 'sample',
        providerLabel: 'Sample Story (Cloud Fallback)',
        isSample: true,
        fallbackNotice: `Cloud Gemini request failed (${errMsg}). Generated an offline Sample Story instead.`,
      };
    }
  }

  const sample = synthesizeSampleStory(note, style, length, regenerationCount);
  return {
    title: sample.title,
    story: sample.story,
    providerMode: 'sample',
    providerLabel: 'Sample Story (Offline Demo)',
    isSample: true,
  };
}
