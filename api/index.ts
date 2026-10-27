import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();

app.use(express.json({ limit: '1mb' }));

const DEFAULT_OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';

/**
 * Validates that an Ollama base URL points strictly to a safe loopback address
 * or matches the server-configured OLLAMA_HOST environment variable.
 * Prevents SSRF / unrestricted proxy vulnerabilities.
 */
function validateSafeOllamaEndpoint(rawEndpoint?: string): {
  valid: boolean;
  normalizedUrl: string;
  error?: string;
} {
  const candidate = (rawEndpoint || DEFAULT_OLLAMA_HOST).trim().replace(/\/+$/, '');
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return {
        valid: false,
        normalizedUrl: DEFAULT_OLLAMA_HOST,
        error: 'Only http:// or https:// protocols are permitted for local Ollama endpoints.',
      };
    }

    const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);
    try {
      const envUrl = new URL(DEFAULT_OLLAMA_HOST);
      allowedHosts.add(envUrl.hostname.toLowerCase());
    } catch {
      // ignore invalid env fallback
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!allowedHosts.has(hostname)) {
      return {
        valid: false,
        normalizedUrl: DEFAULT_OLLAMA_HOST,
        error: `Endpoint host "${hostname}" is blocked. For security, only loopback addresses (127.0.0.1, localhost) or the server-configured OLLAMA_HOST are allowed.`,
      };
    }

    return {
      valid: true,
      normalizedUrl: `${parsed.protocol}//${parsed.host}`,
    };
  } catch {
    return {
      valid: false,
      normalizedUrl: DEFAULT_OLLAMA_HOST,
      error: 'Invalid URL format for Ollama endpoint.',
    };
  }
}

const STYLE_INSTRUCTIONS: Record<string, string> = {
  'Psychological Horror':
    'Write in a literary Psychological Horror style reminiscent of Shirley Jackson, Robert Aickman, and Thomas Ligotti. Focus on uncanny domestic details, quiet dread, unreliable perception, architectural wrongness, and creeping atmospheric tension. Avoid cheap gore or clichés.',
  'Haunted Terminal':
    'Write in an eerie Haunted Terminal / recovered digital forensic log style. Blend narrative prose with timestamps, corrupted memory addresses, anomalous acoustic transcripts, or phantom system messages that suggest a consciousness trapped inside obsolete hardware.',
  'Urban Legend':
    'Write as a compelling modern folklore or archival Urban Legend investigation. Use specific sensory details, local landmarks, secondhand witness accounts, and rules that must never be broken after midnight.',
  'Bittersweet Remembrance':
    'Write in an aching, poetic Bittersweet Remembrance style—a literary ghost story where the haunting is rooted in grief, love, unspoken farewells, and the quiet persistence of memory in familiar rooms.',
};

const LENGTH_INSTRUCTIONS: Record<string, string> = {
  Short: 'Write a concise, haunting micro-fiction piece between 150 and 230 words (2 to 3 tight paragraphs).',
  Medium: 'Write a fully developed atmospheric short story between 350 and 500 words (4 to 6 paragraphs).',
  Long: 'Write an immersive, multi-scene literary narrative between 650 and 900 words (7 to 10 rich paragraphs).',
};

function buildPrompts(note: string, style: string, length: string) {
  const styleGuide = STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS['Psychological Horror'];
  const lengthGuide = LENGTH_INSTRUCTIONS[length] || LENGTH_INSTRUCTIONS['Medium'];

  const systemInstruction = `You are GHOSTNOTE, a literary supernatural chronicler. Your task is to transform a user's raw memory, mysterious note, or paranormal observation into an atmospheric, publication-grade piece of fiction.
${styleGuide}
${lengthGuide}
Always return valid JSON with two fields:
- "title": An evocative, literary title (3 to 8 words, no quotation marks).
- "story": The complete story text with paragraphs separated by double newlines (\\n\\n).`;

  const userPrompt = `Transform the following raw note or memory into a ${length.toLowerCase()}-length "${style}" story:\n\n"""\n${note.trim()}\n"""\n\nReturn strictly a JSON object with keys "title" and "story".`;

  return { systemInstruction, userPrompt };
}

// 1. Provider configuration & availability status
app.get('/api/providers/status', (_req, res) => {
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim().length > 5
  );

  res.json({
    defaultOllamaEndpoint: DEFAULT_OLLAMA_HOST,
    defaultOllamaModel: DEFAULT_OLLAMA_MODEL,
    cloudGeminiConfigured: hasGeminiKey,
    cloudModelName: 'gemini-3.8-flash',
  });
});

// 2. Strict Ollama Connection + Inference Verification
app.post('/api/providers/verify-ollama', async (req, res) => {
  const { endpoint, model } = req.body || {};
  const targetModel = (typeof model === 'string' && model.trim()) || DEFAULT_OLLAMA_MODEL;

  const validation = validateSafeOllamaEndpoint(endpoint);
  if (!validation.valid) {
    res.status(400).json({
      verified: false,
      connectionOk: false,
      inferenceOk: false,
      endpoint: validation.normalizedUrl,
      model: targetModel,
      availableModels: [],
      error: validation.error,
    });
    return;
  }

  const baseUrl = validation.normalizedUrl;
  const startTime = Date.now();

  try {
    const tagsController = new AbortController();
    const tagsTimeout = setTimeout(() => tagsController.abort(), 4500);

    const tagsResponse = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: tagsController.signal,
    });
    clearTimeout(tagsTimeout);

    if (!tagsResponse.ok) {
      res.status(200).json({
        verified: false,
        connectionOk: false,
        inferenceOk: false,
        endpoint: baseUrl,
        model: targetModel,
        availableModels: [],
        error: `Ollama responded with HTTP ${tagsResponse.status} at ${baseUrl}/api/tags.`,
      });
      return;
    }

    const tagsData = (await tagsResponse.json()) as { models?: Array<{ name: string }> };
    const availableModels = Array.isArray(tagsData.models)
      ? tagsData.models.map((m) => m.name)
      : [];

    const genController = new AbortController();
    const genTimeout = setTimeout(() => genController.abort(), 12000);

    const genResponse = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: targetModel,
        prompt: 'Reply with the single word READY.',
        stream: false,
        options: {
          num_predict: 5,
          temperature: 0.1,
        },
      }),
      signal: genController.signal,
    });
    clearTimeout(genTimeout);

    if (!genResponse.ok) {
      const errText = await genResponse.text().catch(() => '');
      res.status(200).json({
        verified: false,
        connectionOk: true,
        inferenceOk: false,
        endpoint: baseUrl,
        model: targetModel,
        availableModels,
        error: `Ollama server is reachable, but inference failed for model "${targetModel}" (HTTP ${genResponse.status}). ${
          errText ? errText.slice(0, 160) : `Run "ollama pull ${targetModel}" in your terminal.`
        }`,
      });
      return;
    }

    const genData = (await genResponse.json()) as { response?: string };
    if (typeof genData.response !== 'string') {
      res.status(200).json({
        verified: false,
        connectionOk: true,
        inferenceOk: false,
        endpoint: baseUrl,
        model: targetModel,
        availableModels,
        error: `Ollama returned an unexpected payload during inference verification.`,
      });
      return;
    }

    const latencyMs = Date.now() - startTime;
    res.json({
      verified: true,
      connectionOk: true,
      inferenceOk: true,
      endpoint: baseUrl,
      model: targetModel,
      availableModels,
      latencyMs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    res.status(200).json({
      verified: false,
      connectionOk: false,
      inferenceOk: false,
      endpoint: baseUrl,
      model: targetModel,
      availableModels: [],
      error: `Could not reach local Ollama daemon at ${baseUrl} (${message}). Ensure Ollama is installed and running ("ollama serve") on the same host.`,
    });
  }
});

// 3. Story Generation Route (Supports Local Ollama or Cloud Gemini)
app.post('/api/generate', async (req, res) => {
  const {
    note,
    style = 'Psychological Horror',
    length = 'Medium',
    provider = 'ollama',
    ollamaEndpoint,
    ollamaModel,
  } = req.body || {};

  if (!note || typeof note !== 'string' || note.trim().length < 10) {
    res.status(400).json({
      error: 'Please provide a note or memory of at least 10 characters.',
    });
    return;
  }

  if (note.length > 6000) {
    res.status(400).json({
      error: 'Input note exceeds the 6,000 character limit.',
    });
    return;
  }

  const { systemInstruction, userPrompt } = buildPrompts(note, style, length);

  // Branch A: Open-Weight Local Inference via Ollama
  if (provider === 'ollama') {
    const validation = validateSafeOllamaEndpoint(ollamaEndpoint);
    if (!validation.valid) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const baseUrl = validation.normalizedUrl;
    const modelName = (typeof ollamaModel === 'string' && ollamaModel.trim()) || DEFAULT_OLLAMA_MODEL;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60000);

      const ollamaRes = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          system: systemInstruction,
          prompt: userPrompt,
          format: 'json',
          stream: false,
          options: {
            temperature: 0.82,
            top_p: 0.92,
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!ollamaRes.ok) {
        const errBody = await ollamaRes.text().catch(() => '');
        res.status(502).json({
          error: `Local Ollama inference failed (HTTP ${ollamaRes.status}). ${
            errBody ? errBody.slice(0, 180) : `Verify that "${modelName}" is pulled.`
          }`,
        });
        return;
      }

      const data = (await ollamaRes.json()) as { response?: string };
      const rawText = (data.response || '').trim();
      if (!rawText) {
        res.status(502).json({ error: 'Local Ollama returned an empty response.' });
        return;
      }

      let parsedTitle = 'Untitled Apparition';
      let parsedStory = rawText;

      try {
        const parsed = JSON.parse(rawText) as { title?: string; story?: string };
        if (parsed.title && typeof parsed.title === 'string') {
          parsedTitle = parsed.title.trim();
        }
        if (parsed.story && typeof parsed.story === 'string') {
          parsedStory = parsed.story.trim();
        }
      } catch {
        const lines = rawText.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length > 1 && lines[0].length < 80) {
          parsedTitle = lines[0].replace(/^#+\s*/, '').replace(/^["']|["']$/g, '');
          parsedStory = lines.slice(1).join('\n\n');
        }
      }

      res.json({
        title: parsedTitle,
        story: parsedStory,
        provider: 'ollama',
        providerLabel: `Local Ollama (${modelName})`,
        model: modelName,
        verifiedLocal: true,
      });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      res.status(503).json({
        error: `Unable to reach local Ollama server at ${baseUrl} (${msg}). Verify Ollama is running or switch to Sample Mode / Cloud Provider.`,
      });
      return;
    }
  }

  // Branch B: Optional Cloud Provider (Google Gemini API)
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error: 'Cloud Gemini API key is not configured on the server. Use Sample Mode or configure a local Ollama instance.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
          temperature: 0.85,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: {
                type: Type.STRING,
                description: 'Evocative literary title for the supernatural diary entry.',
              },
              story: {
                type: Type.STRING,
                description: 'The complete atmospheric story with paragraphs separated by double newlines.',
              },
            },
            required: ['title', 'story'],
          },
        },
      });

      const rawOutput = response.text?.trim() || '';
      if (!rawOutput) {
        res.status(502).json({ error: 'Cloud Gemini returned an empty response.' });
        return;
      }

      const parsed = JSON.parse(rawOutput) as { title?: string; story?: string };
      res.json({
        title: (parsed.title || 'Echoes in the Static').trim(),
        story: (parsed.story || rawOutput).trim(),
        provider: 'gemini',
        providerLabel: 'Cloud Inference (Google Gemini)',
        model: 'gemini-3.8-flash',
        verifiedLocal: false,
      });
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gemini request failed';
      res.status(502).json({
        error: `Cloud Gemini generation failed: ${msg}`,
      });
      return;
    }
  }

  res.status(400).json({ error: `Unsupported provider: ${String(provider)}` });
});

export default app;
