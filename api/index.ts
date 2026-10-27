import 'dotenv/config';
import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();

app.use(express.json({ limit: '1mb' }));

// Catch malformed JSON payloads and return JSON instead of HTML error pages
app.use(
  (
    err: Error & { status?: number; type?: string },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (err instanceof SyntaxError && 'body' in err) {
      res.status(400).json({ error: 'Malformed JSON in request body.' });
      return;
    }
    next(err);
  }
);

const DEFAULT_OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const GEMINI_FALLBACK_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];

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
  Short:
    'Write a concise, haunting micro-fiction piece between 150 and 230 words (2 to 3 tight paragraphs).',
  Medium:
    'Write a fully developed atmospheric short story between 350 and 500 words (4 to 6 paragraphs).',
  Long:
    'Write an immersive, multi-scene literary narrative between 650 and 900 words (7 to 10 rich paragraphs).',
};

function buildPrompts(note: string, style: string, length: string) {
  const styleGuide =
    STYLE_INSTRUCTIONS[style] || STYLE_INSTRUCTIONS['Psychological Horror'];
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

function parseJsonTitleAndStory(
  rawText: string,
  defaultTitle = 'Echoes in the Static'
): { title: string; story: string } {
  const cleaned = rawText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { title?: string; story?: string };
    const title =
      typeof parsed.title === 'string' && parsed.title.trim()
        ? parsed.title.trim()
        : defaultTitle;
    const story =
      typeof parsed.story === 'string' && parsed.story.trim()
        ? parsed.story.trim()
        : cleaned;
    return { title, story };
  } catch {
    const lines = cleaned.split('\n').filter((l) => l.trim().length > 0);
    if (lines.length > 1 && lines[0].length < 90) {
      return {
        title: lines[0].replace(/^#+\s*/, '').replace(/^["']|["']$/g, '').trim() || defaultTitle,
        story: lines.slice(1).join('\n\n').trim(),
      };
    }
    return { title: defaultTitle, story: cleaned };
  }
}

function buildServerSampleStory(note: string, style: string, length: string) {
  const excerpt = note.trim().slice(0, 240);
  const titleMap: Record<string, string> = {
    'Psychological Horror': 'The Geometry Behind the Wallpaper',
    'Haunted Terminal': 'BUFFER_DUMP // 03:14:09',
    'Urban Legend': 'The Last Stop Before Blackwater Bridge',
    'Bittersweet Remembrance': 'Where the Porch Light Still Burns',
  };
  const title = titleMap[style] || 'The Unburied Folio';
  const paragraphs = [
    `The archival note was recovered from the margin of an unindexed ledger: "${excerpt}" At the time it was written, nobody in the house believed the walls could retain an echo longer than the voice that made it.`,
    `Yet by the third week of October, the stillness in the corridor began to reorganize itself around that exact memory. Shadows gathered along the floorboards where footsteps had paused, and the air carried the faint metallic chill of rain on iron.`,
  ];
  if (length === 'Medium' || length === 'Long') {
    paragraphs.push(
      `Every attempt to rationalize the phenomenon only deepened its precision. Clocks in adjacent rooms drifted toward the same minute, and the glass panes reflected a room arranged as it had been years before.`
    );
  }
  if (length === 'Long') {
    paragraphs.push(
      `Some memories refuse to stay buried; they wait patiently beneath the varnish of ordinary days until someone finally writes them down.`
    );
  }
  return {
    title,
    story: paragraphs.join('\n\n'),
  };
}

const apiRouter = express.Router();

// 0. Health check endpoint for Cloud Run & Vercel monitoring
apiRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'ghostnote-api',
    timestamp: new Date().toISOString(),
  });
});

// 1. Provider configuration & availability status
apiRouter.get('/providers/status', (_req, res) => {
  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim().length > 5
  );

  res.json({
    defaultOllamaEndpoint: DEFAULT_OLLAMA_HOST,
    defaultOllamaModel: DEFAULT_OLLAMA_MODEL,
    cloudGeminiConfigured: hasGeminiKey,
    cloudModelName: GEMINI_FALLBACK_MODELS[0],
  });
});

// 2. Strict Ollama Connection + Inference Verification
apiRouter.post('/providers/verify-ollama', async (req, res) => {
  const { endpoint, model } = req.body || {};
  const targetModel =
    (typeof model === 'string' && model.trim()) || DEFAULT_OLLAMA_MODEL;

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

    const tagsData = (await tagsResponse.json()) as {
      models?: Array<{ name: string }>;
    };
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
          errText
            ? errText.slice(0, 160)
            : `Run "ollama pull ${targetModel}" in your terminal.`
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
        error:
          'Ollama returned an unexpected payload during inference verification.',
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

// 3. Story Generation Route (Supports Local Ollama, Cloud Gemini with fallback chain, and Sample Mode)
apiRouter.post('/generate', async (req, res) => {
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

  // Branch 0: Explicit Sample Mode
  if (provider === 'sample') {
    const sample = buildServerSampleStory(note, style, length);
    res.json({
      title: sample.title,
      story: sample.story,
      provider: 'sample',
      providerLabel: 'Sample Story (Offline Demo)',
      model: 'sample-synthesizer',
      verifiedLocal: false,
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
    const modelName =
      (typeof ollamaModel === 'string' && ollamaModel.trim()) ||
      DEFAULT_OLLAMA_MODEL;

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
            errBody
              ? errBody.slice(0, 180)
              : `Verify that "${modelName}" is pulled.`
          }`,
        });
        return;
      }

      const data = (await ollamaRes.json()) as { response?: string };
      const rawText = (data.response || '').trim();
      if (!rawText) {
        res
          .status(502)
          .json({ error: 'Local Ollama returned an empty response.' });
        return;
      }

      const { title, story } = parseJsonTitleAndStory(
        rawText,
        'Untitled Apparition'
      );

      res.json({
        title,
        story,
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

  // Branch B: Cloud Provider (Google Gemini API with automatic multi-model resilience)
  if (provider === 'gemini') {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      res.status(503).json({
        error:
          'Cloud Gemini API key is not configured on the server. Use Sample Mode or configure a local Ollama instance.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    let lastErrorMessage = 'Gemini request failed';

    for (const candidateModel of GEMINI_FALLBACK_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model: candidateModel,
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
                  description:
                    'Evocative literary title for the supernatural diary entry.',
                },
                story: {
                  type: Type.STRING,
                  description:
                    'The complete atmospheric story with paragraphs separated by double newlines.',
                },
              },
              required: ['title', 'story'],
            },
          },
        });

        const rawOutput = response.text?.trim() || '';
        if (!rawOutput) {
          lastErrorMessage = `Model ${candidateModel} returned an empty response.`;
          continue;
        }

        const { title, story } = parseJsonTitleAndStory(
          rawOutput,
          'Echoes in the Static'
        );

        res.json({
          title,
          story,
          provider: 'gemini',
          providerLabel: `Cloud Inference (Google Gemini · ${candidateModel})`,
          model: candidateModel,
          verifiedLocal: false,
        });
        return;
      } catch (err: unknown) {
        lastErrorMessage =
          err instanceof Error ? err.message : 'Gemini request failed';
        // Continue to next fallback model in GEMINI_FALLBACK_MODELS
      }
    }

    res.status(502).json({
      error: `Cloud Gemini generation failed across fallback models: ${lastErrorMessage}`,
    });
    return;
  }

  res.status(400).json({ error: `Unsupported provider: ${String(provider)}` });
});

// Mount API router at both /api and / so Vercel rewrites and Express server.ts both match seamlessly
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
