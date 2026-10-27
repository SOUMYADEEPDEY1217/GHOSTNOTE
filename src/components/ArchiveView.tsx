import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Download,
  Upload,
  Trash2,
  Copy,
  Check,
  BookOpen,
  ArrowUpRight,
  RotateCcw,
  X,
} from 'lucide-react';
import { StoryEntry, StoryLength, StoryStyle } from '../types/ghostnote';

interface ArchiveViewProps {
  entries: StoryEntry[];
  onDeleteEntry: (id: string) => void;
  onRestoreStarters: () => void;
  onImportEntries: (imported: StoryEntry[]) => void;
  onLoadIntoWorkspace: (entry: StoryEntry) => void;
  onNavigateWorkspace: () => void;
}

const STYLE_FILTERS: Array<'ALL' | StoryStyle> = [
  'ALL',
  'Psychological Horror',
  'Haunted Terminal',
  'Urban Legend',
  'Bittersweet Remembrance',
];

const LENGTH_FILTERS: Array<'ALL' | StoryLength> = ['ALL', 'Short', 'Medium', 'Long'];

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  entries,
  onDeleteEntry,
  onRestoreStarters,
  onImportEntries,
  onLoadIntoWorkspace,
  onNavigateWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [styleFilter, setStyleFilter] = useState<'ALL' | StoryStyle>('ALL');
  const [lengthFilter, setLengthFilter] = useState<'ALL' | StoryLength>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedEntry, setSelectedEntry] = useState<StoryEntry | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return entries
      .filter((entry) => {
        if (styleFilter !== 'ALL' && entry.style !== styleFilter) return false;
        if (lengthFilter !== 'ALL' && entry.length !== lengthFilter) return false;
        if (q) {
          const hay = `${entry.title} ${entry.originalNote} ${entry.story} ${entry.style}`.toLowerCase();
          return hay.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        const tA = new Date(a.createdAt).getTime();
        const tB = new Date(b.createdAt).getTime();
        return sortOrder === 'newest' ? tB - tA : tA - tB;
      });
  }, [entries, searchQuery, styleFilter, lengthFilter, sortOrder]);

  const handleExportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      application: 'GHOSTNOTE',
      version: '1.0.0',
      count: entries.length,
      entries,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `ghostnote-archive-${dateStamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        const rawList = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.entries)
          ? parsed.entries
          : [];
        const validEntries: StoryEntry[] = rawList
          .filter(
            (item: Partial<StoryEntry>) =>
              item && typeof item.title === 'string' && typeof item.story === 'string'
          )
          .map((item: Partial<StoryEntry>, idx: number) => ({
            id: item.id || `imported-${Date.now()}-${idx}`,
            title: item.title || 'Imported Apparition',
            originalNote: item.originalNote || '',
            story: item.story || '',
            style: (item.style as StoryStyle) || 'Psychological Horror',
            length: (item.length as StoryLength) || 'Medium',
            createdAt: item.createdAt || new Date().toISOString(),
            wordCount: typeof item.wordCount === 'number' ? item.wordCount : 200,
            providerMode: item.providerMode || 'sample',
            providerLabel: item.providerLabel || 'Imported Entry',
            isSample: Boolean(item.isSample),
          }));

        if (validEntries.length === 0) {
          setImportMessage('No valid GHOSTNOTE entries found in the selected JSON file.');
        } else {
          onImportEntries(validEntries);
          setImportMessage(`Imported ${validEntries.length} archived entries.`);
        }
      } catch {
        setImportMessage('Failed to parse JSON file.');
      }
      setTimeout(() => setImportMessage(null), 4000);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyEntry = async (entry: StoryEntry) => {
    try {
      await navigator.clipboard.writeText(`${entry.title}\n\n${entry.story}`);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  return (
    <main className="relative z-10 max-w-[1360px] mx-auto px-6 py-10 space-y-8 animate-view-enter">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-white/15">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#F87171] font-mono-tabular mb-2">
            02. GHOSTNOTE Catalog Vault
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white font-serif-editorial">
            The Supernatural Archive
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleImportFile}
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#E5E7EB] bg-[#16181D] hover:bg-[#22262E] border border-white/20 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            disabled={entries.length === 0}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#991B1B] hover:bg-[#B91C1C] border border-[#F87171]/40 disabled:opacity-40 rounded-md transition-all whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON ({entries.length})</span>
          </button>
        </div>
      </div>

      {importMessage && (
        <div
          role="status"
          className="text-xs text-white bg-[#27171A] border border-[#DC2626]/50 rounded-md px-4 py-2.5"
        >
          {importMessage}
        </div>
      )}

      {/* Search & Interactive Filter Bar */}
      <section
        aria-label="Search and Filter Archive"
        className="archive-console-panel border border-white/20 rounded-2xl p-5 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search titles, original notes, or story manuscripts..."
              aria-label="Search archive entries"
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-[#0B0C0F] border border-white/20 focus:border-[#EF4444] rounded-lg text-white placeholder-[#6B7280] focus:outline-none"
            />
          </div>

          {/* Length Filter */}
          <div className="md:col-span-3 flex items-center gap-1 bg-[#0B0C0F] p-1 rounded-lg border border-white/15">
            {LENGTH_FILTERS.map((lf) => (
              <button
                key={lf}
                type="button"
                onClick={() => setLengthFilter(lf)}
                className={`flex-1 py-1.5 px-2 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  lengthFilter === lf
                    ? 'bg-[#27171A] text-[#FCA5A5]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {lf === 'ALL' ? 'All Lengths' : lf}
              </button>
            ))}
          </div>

          {/* Chronological Sort */}
          <div className="md:col-span-3 flex items-center justify-end gap-2">
            <label htmlFor="archive-sort" className="text-xs text-[#9CA3AF] whitespace-nowrap">
              Order:
            </label>
            <select
              id="archive-sort"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
              className="bg-[#0B0C0F] border border-white/20 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#EF4444]"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Interactive Style Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="flex flex-wrap items-center gap-1.5">
            {STYLE_FILTERS.map((sf) => (
              <button
                key={sf}
                type="button"
                onClick={() => setStyleFilter(sf)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                  styleFilter === sf
                    ? 'bg-[#27171A] text-[#FCA5A5] border border-[#DC2626]/50'
                    : 'text-[#9CA3AF] hover:text-white bg-[#0B0C0F] border border-white/10'
                }`}
              >
                {sf === 'ALL' ? 'All Styles' : sf}
              </button>
            ))}
          </div>

          <span className="text-xs text-[#9CA3AF] font-mono-tabular">
            Showing {filteredEntries.length} of {entries.length} folios
          </span>
        </div>
      </section>

      {/* Archive Floating Folios Grid */}
      {filteredEntries.length === 0 ? (
        <div className="archive-console-panel border border-white/20 rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <h2 className="text-2xl font-serif-editorial text-white">
            No Matching Manuscripts Found
          </h2>
          <p className="text-sm text-[#9CA3AF]">
            {entries.length === 0
              ? 'Your local browser archive is currently empty. Write a new entry in the Workspace or restore the curated starter collection.'
              : 'No archived stories match your active search query or filters.'}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            {entries.length === 0 ? (
              <>
                <button
                  type="button"
                  onClick={onNavigateWorkspace}
                  className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white bg-[#991B1B] rounded-md"
                >
                  Write First Entry
                </button>
                <button
                  type="button"
                  onClick={onRestoreStarters}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#E5E7EB] bg-[#16181D] border border-white/20 rounded-md"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Sample Archive</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStyleFilter('ALL');
                  setLengthFilter('ALL');
                }}
                className="px-4 py-2 text-xs font-medium text-[#FCA5A5] bg-[#16181D] border border-white/20 rounded-md"
              >
                Reset All Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEntries.map((entry, idx) => (
            <article
              key={entry.id}
              className="manuscript-folio border border-white/20 hover:border-white/40 rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="space-y-3.5">
                {/* Zero-Pill Unboxed Metadata Line */}
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#9CA3AF] font-mono-tabular">
                  <span className="text-[#D1D5DB]">
                    FOLIO #{String(filteredEntries.length - idx).padStart(2, '0')}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="text-[#F87171]">{entry.style}</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.length}</span>
                  <span aria-hidden="true">·</span>
                  <span>{entry.wordCount} words</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDate(entry.createdAt)}</span>
                </div>

                <h2 className="text-2xl font-semibold text-white font-serif-editorial leading-snug">
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="text-left hover:text-[#FCA5A5] transition-colors focus-visible:outline-2 focus-visible:outline-[#EF4444]"
                  >
                    {entry.title}
                  </button>
                </h2>

                <p className="text-xs text-[#9CA3AF] italic line-clamp-2">
                  Source Note: "{entry.originalNote}"
                </p>

                <p
                  className={`text-sm text-[#D1D5DB] leading-relaxed line-clamp-4 ${
                    entry.style === 'Haunted Terminal' ? 'font-mono-tabular text-xs' : ''
                  }`}
                >
                  {entry.story}
                </p>
              </div>

              <div className="pt-5 mt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#9CA3AF] font-mono-tabular truncate max-w-[220px]">
                  {entry.providerLabel}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedEntry(entry)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded bg-[#27171A] hover:bg-[#3B1C21] text-white border border-[#DC2626]/40 transition-colors whitespace-nowrap shrink-0"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-[#F87171]" />
                    <span>Open Folio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onLoadIntoWorkspace(entry)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded bg-[#0B0C0F] hover:bg-[#1A1D24] text-[#D1D5DB] hover:text-white border border-white/15 transition-colors whitespace-nowrap shrink-0"
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>Console</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopyEntry(entry)}
                    aria-label={`Copy ${entry.title}`}
                    className="p-1.5 rounded bg-[#0B0C0F] hover:bg-[#1A1D24] text-[#D1D5DB] hover:text-white border border-white/15 transition-colors"
                  >
                    {copiedId === entry.id ? (
                      <Check className="w-3.5 h-3.5 text-[#F87171]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEntry?.id === entry.id) setSelectedEntry(null);
                      onDeleteEntry(entry.id);
                    }}
                    aria-label={`Delete ${entry.title}`}
                    className="p-1.5 rounded bg-[#0B0C0F] hover:bg-[#2A1215] text-[#9CA3AF] hover:text-[#F87171] border border-white/15 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Full Manuscript Lightbox Modal */}
      {selectedEntry && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-manuscript-title"
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
          onClick={() => setSelectedEntry(null)}
        >
          <div
            className="manuscript-folio border border-white/30 rounded-2xl max-w-3xl w-full p-6 sm:p-10 space-y-6 max-h-[90vh] overflow-y-auto animate-view-enter"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/15 pb-5">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-[#9CA3AF] font-mono-tabular">
                  <span className="text-[#F87171]">{selectedEntry.style}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedEntry.length}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedEntry.wordCount} words</span>
                  <span aria-hidden="true">·</span>
                  <span>{formatDate(selectedEntry.createdAt)}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedEntry.providerLabel}</span>
                </div>
                <h2
                  id="modal-manuscript-title"
                  className="text-2xl sm:text-4xl font-semibold text-white font-serif-editorial"
                >
                  {selectedEntry.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                aria-label="Close manuscript reader"
                className="p-2 rounded-md text-[#9CA3AF] hover:text-white bg-[#0B0C0F] border border-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#0B0C0F] border border-white/15 rounded-lg p-4 text-xs text-[#9CA3AF]">
              <span className="uppercase tracking-wider text-[#6B7280] font-mono-tabular block mb-1">
                Source Memory Note
              </span>
              <p className="italic text-[#E5E7EB]">{selectedEntry.originalNote}</p>
            </div>

            <div
              className={`space-y-5 text-[#E5E7EB] leading-[1.82] ${
                selectedEntry.style === 'Haunted Terminal'
                  ? 'font-mono-tabular text-xs sm:text-sm'
                  : 'text-base sm:text-[17px]'
              }`}
            >
              {selectedEntry.story.split(/\n\n+/).map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>

            <div className="pt-5 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleCopyEntry(selectedEntry)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#27171A] border border-[#DC2626]/50 rounded-md"
                >
                  {copiedId === selectedEntry.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-[#F87171]" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Manuscript</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = selectedEntry;
                    setSelectedEntry(null);
                    onLoadIntoWorkspace(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#0B0C0F] border border-white/20 rounded-md"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Open in Story Console</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  const idToRemove = selectedEntry.id;
                  setSelectedEntry(null);
                  onDeleteEntry(idToRemove);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#F87171] hover:bg-[#2A1215] rounded-md"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Entry</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
