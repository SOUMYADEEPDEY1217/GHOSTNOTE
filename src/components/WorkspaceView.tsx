import React, { useState, useRef, useEffect } from 'react';
import {
  Copy,
  Check,
  RefreshCw,
  Bookmark,
  Trash2,
  AlertCircle,
  Sliders,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import {
  GhostnoteSettings,
  StoryEntry,
  StoryLength,
  StoryStyle,
} from '../types/ghostnote';
import { countWords, SEED_PROMPTS } from '../data/starterArchive';
import { generateGhostnoteStory } from '../services/aiProvider';

interface WorkspaceViewProps {
  settings: GhostnoteSettings;
  ollamaVerified: boolean;
  initialDraft?: {
    note: string;
    style: StoryStyle;
    length: StoryLength;
    title?: string;
    story?: string;
    providerMode?: 'ollama' | 'sample' | 'gemini';
    providerLabel?: string;
    isSample?: boolean;
  } | null;
  onClearInitialDraft: () => void;
  onSaveEntry: (entry: Omit<StoryEntry, 'id' | 'createdAt'>) => void;
  onOpenSettings: () => void;
  onOpenArchive: () => void;
}

const STORY_STYLES: Array<{
  id: StoryStyle;
  label: StoryStyle;
  description: string;
}> = [
  {
    id: 'Psychological Horror',
    label: 'Psychological Horror',
    description: 'Uncanny domestic details, shifting architecture, and quiet dread.',
  },
  {
    id: 'Haunted Terminal',
    label: 'Haunted Terminal',
    description: 'Recovered forensic logs, corrupted buffers, and phantom telemetry.',
  },
  {
    id: 'Urban Legend',
    label: 'Urban Legend',
    description: 'Local folklore, midnight transit rules, and witness accounts.',
  },
  {
    id: 'Bittersweet Remembrance',
    label: 'Bittersweet Remembrance',
    description: 'Poetic literary hauntings rooted in grief, love, and lingering memory.',
  },
];

const STORY_LENGTHS: Array<{
  id: StoryLength;
  label: StoryLength;
  targetWords: string;
}> = [
  { id: 'Short', label: 'Short', targetWords: '~180 words' },
  { id: 'Medium', label: 'Medium', targetWords: '~400 words' },
  { id: 'Long', label: 'Long', targetWords: '~750 words' },
];

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  settings,
  ollamaVerified,
  initialDraft,
  onClearInitialDraft,
  onSaveEntry,
  onOpenSettings,
  onOpenArchive,
}) => {
  const [note, setNote] = useState(SEED_PROMPTS[0].note);
  const [style, setStyle] = useState<StoryStyle>(SEED_PROMPTS[0].style);
  const [length, setLength] = useState<StoryLength>(SEED_PROMPTS[0].length);

  const [generatedTitle, setGeneratedTitle] = useState<string>('');
  const [generatedStory, setGeneratedStory] = useState<string>('');
  const [providerLabel, setProviderLabel] = useState<string>('');
  const [providerModeUsed, setProviderModeUsed] = useState<'ollama' | 'sample' | 'gemini'>('sample');
  const [isSampleOutput, setIsSampleOutput] = useState<boolean>(false);
  const [fallbackNotice, setFallbackNotice] = useState<string | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [regenerationCount, setRegenerationCount] = useState(0);

  const [copied, setCopied] = useState(false);
  const [savedBanner, setSavedBanner] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialDraft) {
      setNote(initialDraft.note);
      setStyle(initialDraft.style);
      setLength(initialDraft.length);
      if (initialDraft.story) {
        setGeneratedTitle(initialDraft.title || 'Archived Entry');
        setGeneratedStory(initialDraft.story);
        setProviderModeUsed(initialDraft.providerMode || 'sample');
        setProviderLabel(initialDraft.providerLabel || 'Restored from Archive');
        setIsSampleOutput(Boolean(initialDraft.isSample));
      }
      onClearInitialDraft();
    }
  }, [initialDraft, onClearInitialDraft]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const trimmedLength = note.trim().length;
  const noteWordCount = countWords(note);
  const outputWordCount = countWords(generatedStory);

  const validateInput = (): boolean => {
    if (trimmedLength < 10) {
      setValidationError(
        'Please enter at least 10 characters describing a note, memory, or unexplained event.'
      );
      return false;
    }
    if (note.length > 6000) {
      setValidationError('Your note exceeds the 6,000-character limit. Please shorten it.');
      return false;
    }
    setValidationError(null);
    return true;
  };

  const handleGenerate = async (isRegenerate = false) => {
    if (isGenerating) return;
    if (!validateInput()) return;

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const nextRegen = isRegenerate ? regenerationCount + 1 : 0;
    setRegenerationCount(nextRegen);
    setIsGenerating(true);
    setGenerationError(null);
    setFallbackNotice(null);
    setSavedBanner(false);

    try {
      const result = await generateGhostnoteStory({
        note,
        style,
        length,
        settings,
        ollamaVerified,
        regenerationCount: nextRegen,
        signal: controller.signal,
      });

      setGeneratedTitle(result.title);
      setGeneratedStory(result.story);
      setProviderLabel(result.providerLabel);
      setProviderModeUsed(result.providerMode);
      setIsSampleOutput(result.isSample);
      setFallbackNotice(result.fallbackNotice || null);
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      const msg = err instanceof Error ? err.message : 'Failed to generate story.';
      setGenerationError(msg);
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
      }
    }
  };

  const handleCancelGeneration = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
  };

  const handleCopy = async () => {
    if (!generatedStory) return;
    const fullText = `${generatedTitle}\n\n${generatedStory}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback copy
    }
  };

  const handleSave = () => {
    if (!generatedStory) return;
    onSaveEntry({
      title: generatedTitle || 'Untitled Apparition',
      originalNote: note.trim(),
      story: generatedStory,
      style,
      length,
      wordCount: outputWordCount,
      providerMode: providerModeUsed,
      providerLabel: providerLabel || 'Sample Story (Offline Demo)',
      isSample: isSampleOutput,
    });
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3500);
  };

  const handleClearWorkspace = () => {
    abortControllerRef.current?.abort();
    setIsGenerating(false);
    setNote('');
    setGeneratedTitle('');
    setGeneratedStory('');
    setFallbackNotice(null);
    setGenerationError(null);
    setValidationError(null);
    setSavedBanner(false);
  };

  const activeProviderSummary = (() => {
    if (settings.providerMode === 'ollama') {
      return ollamaVerified
        ? `Verified Local Ollama (${settings.ollamaModel})`
        : `Local Ollama (${settings.ollamaModel} — Unverified, falls back to Sample if offline)`;
    }
    if (settings.providerMode === 'gemini') {
      return 'Cloud Inference (Google Gemini)';
    }
    return 'Offline Sample Mode (No external network requests)';
  })();

  return (
    <main className="relative z-10 max-w-[1360px] mx-auto px-6 py-10 animate-view-enter">
      {/* Header & Provider Transparency Strip */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-white/15">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#F87171] font-mono-tabular mb-2">
            01. GHOSTNOTE Story Console
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white font-serif-editorial">
            Transcribe a Memory Fragment
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-[#D1D5DB]">
          <span>Active Engine:</span>
          <span className="text-white font-mono-tabular">{activeProviderSummary}</span>
          <span aria-hidden="true">·</span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex items-center gap-1.5 text-[#F87171] hover:underline whitespace-nowrap shrink-0"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Configure Provider</span>
          </button>
        </div>
      </div>

      {/* Main Two-Column Split Console */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Smoked Glass Console Input & Parameters (5 cols) */}
        <section
          aria-label="Memory Input and Controls"
          className="lg:col-span-5 relative"
        >
          {/* Offset Secondary Frame Behind Panel (Reference Signature Detail) */}
          <div
            aria-hidden="true"
            className="hidden sm:block absolute -left-2.5 top-2.5 w-full h-full rounded-2xl bg-[#2B2E34]/30 border border-white/10 pointer-events-none"
          />

          <div className="relative archive-console-panel border border-white/20 rounded-2xl p-6 space-y-6">
            {/* Seed Fragment Quick-Loaders */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-medium text-[#D1D5DB]">
                  Recovered Field Notes
                </span>
                <span className="text-xs text-[#9CA3AF] font-mono-tabular">
                  Select to load
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SEED_PROMPTS.map((seed) => (
                  <button
                    key={seed.id}
                    type="button"
                    onClick={() => {
                      setNote(seed.note);
                      setStyle(seed.style);
                      setLength(seed.length);
                      setValidationError(null);
                    }}
                    className="text-left px-3 py-2 rounded-md bg-[#111317]/90 hover:bg-[#1E2229] border border-white/10 hover:border-white/30 transition-colors"
                  >
                    <p className="text-xs font-medium text-[#E5E7EB] truncate">
                      {seed.label}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">
                      {seed.style} · {seed.length}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea Input */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label
                  htmlFor="ghostnote-raw-input"
                  className="text-sm font-medium text-white"
                >
                  Raw Note, Paranormal Event, or Personal Memory
                </label>
                <span className="text-xs text-[#9CA3AF] font-mono-tabular">
                  {noteWordCount} words · {trimmedLength}/6000 chars
                </span>
              </div>

              <textarea
                id="ghostnote-raw-input"
                rows={6}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  if (validationError && e.target.value.trim().length >= 10) {
                    setValidationError(null);
                  }
                }}
                placeholder="Write down the unexplained sound in the hallway, the timestamp on an old tape, or a room you still visit in dreams..."
                className="w-full rounded-lg bg-[#0B0C0F] border border-white/20 focus:border-[#EF4444] px-4 py-3 text-sm text-white placeholder-[#6B7280] leading-relaxed resize-y focus:outline-none shadow-inner"
              />

              {validationError && (
                <div
                  role="alert"
                  className="mt-2 flex items-start gap-2 text-xs text-[#FCA5A5] bg-[#2A1215] border border-[#991B1B] rounded-md px-3 py-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            {/* Literary Style Selector */}
            <div>
              <span className="block text-sm font-medium text-white mb-2.5">
                Narrative Style
              </span>
              <div className="grid grid-cols-1 gap-2">
                {STORY_STYLES.map((item) => {
                  const active = style === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setStyle(item.id)}
                      aria-pressed={active}
                      className={`text-left px-3.5 py-2.5 rounded-lg border transition-all ${
                        active
                          ? 'bg-[#26171A] border-[#DC2626] text-white shadow-[0_0_20px_rgba(220,38,38,0.18)]'
                          : 'bg-[#111317]/90 border-white/10 text-[#D1D5DB] hover:border-white/25 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{item.label}</span>
                        {active && (
                          <span className="text-[11px] font-mono-tabular text-[#F87171]">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">{item.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Story Length Selector */}
            <div>
              <span className="block text-sm font-medium text-white mb-2">
                Manuscript Length
              </span>
              <div className="grid grid-cols-3 gap-2 bg-[#0B0C0F] p-1 rounded-lg border border-white/15">
                {STORY_LENGTHS.map((item) => {
                  const active = length === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setLength(item.id)}
                      aria-pressed={active}
                      className={`py-2 px-3 rounded-md text-center transition-colors ${
                        active
                          ? 'bg-[#27171A] text-[#FCA5A5] border border-[#DC2626]/50'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-semibold whitespace-nowrap">{item.label}</div>
                      <div className="text-[11px] text-[#9CA3AF] font-mono-tabular">
                        {item.targetWords}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Explicit Privacy Notice when Cloud Gemini is selected */}
            {settings.providerMode === 'gemini' && (
              <div className="text-xs text-[#D1D5DB] bg-[#16181D] border border-white/20 rounded-md px-3.5 py-2.5">
                <strong className="text-white">Cloud Provider Active:</strong> Your note will be
                sent to the Google Gemini API for story generation. Switch to{' '}
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-[#F87171] underline"
                >
                  Local Ollama or Sample Mode
                </button>{' '}
                to keep notes strictly on-device.
              </div>
            )}

            {/* Primary Action Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => handleGenerate(false)}
                disabled={isGenerating}
                className="flex-1 crimson-bracket-btn inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold tracking-[0.16em] uppercase text-[#EF4444] hover:text-white hover:bg-[#991B1B] disabled:opacity-50 rounded-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isGenerating ? 'Transcribing...' : 'Generate Story'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearWorkspace}
                className="px-4 py-3 text-xs font-medium text-[#D1D5DB] hover:text-[#F87171] bg-[#0B0C0F] hover:bg-[#221215] border border-white/15 rounded-sm transition-colors whitespace-nowrap shrink-0"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Bound Manuscript Folio Output & Actions (7 cols) */}
        <section
          aria-label="Generated Manuscript Folio"
          className="lg:col-span-7 manuscript-folio border border-white/20 rounded-2xl p-6 sm:p-10 min-h-[600px] flex flex-col justify-between"
        >
          {/* Fallback Notice Banner */}
          {fallbackNotice && (
            <div
              role="status"
              className="mb-6 flex items-start gap-2.5 text-xs text-[#E5E7EB] bg-[#1C1F26] border border-white/20 rounded-lg px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 text-[#F87171] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p>{fallbackNotice}</p>
                <button
                  type="button"
                  onClick={onOpenSettings}
                  className="text-[#F87171] underline font-medium"
                >
                  Review provider connection settings
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {generationError && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-2.5 text-xs text-[#FCA5A5] bg-[#281114] border border-[#7F1D1D] rounded-lg px-4 py-3"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Generation Failed</p>
                <p className="mt-0.5">{generationError}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isGenerating ? (
            <div className="my-auto py-16 text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full border-2 border-[#DC2626]/30 border-t-[#EF4444] animate-spin" />
              <div className="space-y-1">
                <h2 className="text-2xl font-serif-editorial text-white">
                  Inscribing the archival folio...
                </h2>
                <p className="text-xs text-[#9CA3AF] font-mono-tabular">
                  {style} · {length} · {activeProviderSummary}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="px-4 py-1.5 text-xs text-[#D1D5DB] hover:text-white border border-white/20 rounded-md"
              >
                Cancel Request
              </button>
            </div>
          ) : generatedStory ? (
            /* Populated Manuscript Folio View */
            <div className="space-y-6 animate-view-enter">
              <div className="border-b border-white/15 pb-6 space-y-2.5">
                {/* Zero-Pill Unboxed Metadata */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF] font-mono-tabular">
                  <span className="text-[#F87171]">{providerLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{style}</span>
                  <span aria-hidden="true">·</span>
                  <span>{length}</span>
                  <span aria-hidden="true">·</span>
                  <span>{outputWordCount} words</span>
                  {isSampleOutput && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="text-[#FBBF24]">Sample Output</span>
                    </>
                  )}
                </div>

                <h2 className="text-3xl sm:text-4xl font-semibold text-white font-serif-editorial leading-tight">
                  {generatedTitle}
                </h2>
              </div>

              {/* Story Body with Archival Folio Typography */}
              <article
                className={`space-y-5 text-[#E5E7EB] leading-[1.82] max-w-[68ch] ${
                  style === 'Haunted Terminal'
                    ? 'font-mono-tabular text-xs sm:text-sm bg-[#090A0D] p-6 rounded-lg border border-white/15'
                    : 'text-base sm:text-[17px]'
                }`}
              >
                {generatedStory.split(/\n\n+/).map((paragraph, index) => (
                  <p
                    key={index}
                    className={`whitespace-pre-line ${
                      index === 0 && style !== 'Haunted Terminal'
                        ? 'first-letter:text-4xl first-letter:font-serif-editorial first-letter:text-[#F87171] first-letter:mr-2 first-letter:float-left first-letter:leading-none'
                        : ''
                    }`}
                  >
                    {paragraph}
                  </p>
                ))}
              </article>

              {/* Saved Confirmation Notice */}
              {savedBanner && (
                <div
                  role="status"
                  className="flex items-center justify-between text-xs text-white bg-[#27171A] border border-[#DC2626]/50 rounded-md px-4 py-2.5"
                >
                  <span>Manuscript folio preserved in your local browser Catalog.</span>
                  <button
                    type="button"
                    onClick={onOpenArchive}
                    className="underline font-semibold text-[#FCA5A5]"
                  >
                    Inspect in Catalog
                  </button>
                </div>
              )}

              {/* Manuscript Action Toolbar */}
              <div className="pt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleSave}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#991B1B] hover:bg-[#B91C1C] border border-[#F87171]/40 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save to Catalog</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleGenerate(true)}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#16181D] hover:bg-[#22262E] border border-white/20 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Regenerate</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#16181D] hover:bg-[#22262E] border border-white/20 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#F87171]" />
                        <span className="text-[#FCA5A5]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Text</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setGeneratedTitle('');
                    setGeneratedStory('');
                    setFallbackNotice(null);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#9CA3AF] hover:text-[#F87171] transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Discard Draft</span>
                </button>
              </div>
            </div>
          ) : (
            /* Empty Manuscript State */
            <div className="my-auto py-16 text-center max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 mx-auto rounded-lg bg-[#16181D] border border-white/20 flex items-center justify-center text-[#F87171]">
                <BookOpen className="w-5 h-5" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif-editorial text-white">
                The Archival Folio Awaits
              </h2>
              <p className="text-sm text-[#9CA3AF] leading-relaxed">
                Enter an unexplained observation or choose one of the recovered field notes on the
                left, select your literary style and length, and press{' '}
                <strong className="text-white">Generate Story</strong>.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
};
