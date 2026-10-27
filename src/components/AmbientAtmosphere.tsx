import React, { useEffect, useState } from 'react';

interface AmbientAtmosphereProps {
  reducedMotion: boolean;
  lowEffectsMode: boolean;
}

const ARCHIVAL_GLYPHS = [
  'FOLIO_IV · SECTOR_09',
  'MEM_ADDR · 0x7F8A',
  'CAT_REF · MS-1894-B',
  'PARITY_ECHO · LOCKED',
  'VAULT_TEMP · 11.4°C',
  'SPECTRAL_INDEX · 04',
];

/**
 * Renders the reference image's signature background elements across the full website:
 * 1. The atmospheric dark Ronin/Pagoda reference backdrop with a diagonal ash-silver slash band
 * 2. Flock of ink ravens/crows with offset shadow duplicates soaring along the diagonal band
 * 3. Subtle pointer-responsive parallax and weathered stone watermark
 */
export const AmbientAtmosphere: React.FC<AmbientAtmosphereProps> = ({
  reducedMotion,
  lowEffectsMode,
}) => {
  const [activeGlyphIndex, setActiveGlyphIndex] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reducedMotion || lowEffectsMode) return;

    const interval = window.setInterval(() => {
      setActiveGlyphIndex((prev) => (prev + 1) % ARCHIVAL_GLYPHS.length);
    }, 5500);

    const onPointerMove = (e: PointerEvent) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 16;
      const ny = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 16;
      setParallax({ x: nx, y: ny });
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => {
      clearInterval(interval);
      window.removeEventListener('pointermove', onPointerMove);
    };
  }, [reducedMotion, lowEffectsMode]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none bg-[#0D0E11]"
    >
      {/* 1. Reference Image Atmospheric Backdrop Layer (subtle blend behind interior pages) */}
      <div
        className="absolute inset-0 opacity-28 transition-transform duration-300 ease-out"
        style={{
          backgroundImage: 'url("/assets/aistudio/9f82b5a8075304166d684ed7fa56da8d_70c5112c.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center center',
          transform:
            reducedMotion || lowEffectsMode
              ? 'scale(1.03)'
              : `scale(1.05) translate3d(${-parallax.x * 0.6}px, ${-parallax.y * 0.6}px, 0)`,
        }}
      />

      {/* 2. Signature Diagonal Ash-Silver Slash Band cutting from bottom-left to top-right */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'linear-gradient(148deg, transparent 34%, rgba(168, 172, 178, 0.28) 34.2%, rgba(156, 163, 175, 0.42) 52%, transparent 52.2%)',
        }}
      />

      {/* 3. SVG Flock of Ink Ravens / Crows with Offset Shadow Duplicates along the Diagonal Slash */}
      {!lowEffectsMode && (
        <svg
          viewBox="0 0 1440 900"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute inset-0 w-full h-full object-cover opacity-45"
          style={{
            transform:
              reducedMotion
                ? undefined
                : `translate3d(${parallax.x * 0.8}px, ${parallax.y * 0.8}px, 0)`,
          }}
        >
          {/* Shadow Duplicates of Ravens */}
          <g fill="#4B5563" opacity="0.35" transform="translate(-18, 14)">
            <path d="M1040 160 C1065 130, 1105 115, 1145 125 C1120 148, 1110 170, 1135 190 C1095 185, 1070 198, 1045 225 C1040 195, 1015 185, 975 190 C1005 170, 1025 165, 1040 160 Z" />
            <path d="M980 280 C1000 260, 1030 250, 1060 258 C1040 275, 1035 290, 1052 305 C1022 300, 1005 310, 985 330 C980 308, 960 300, 930 304 C952 288, 968 284, 980 280 Z" />
            <path d="M910 370 C925 355, 950 348, 972 354 C956 368, 952 380, 965 392 C942 388, 928 396, 914 412 C910 394, 895 388, 872 390 C888 378, 900 374, 910 370 Z" />
            <path d="M845 435 C856 422, 875 418, 892 422 C880 432, 876 442, 886 450 C868 448, 858 454, 848 466 C844 452, 832 448, 815 450 C828 440, 838 438, 845 435 Z" />
          </g>

          {/* Primary Ink-Black Ravens */}
          <g fill="#111317" opacity="0.88">
            <path d="M1040 160 C1065 130, 1105 115, 1145 125 C1120 148, 1110 170, 1135 190 C1095 185, 1070 198, 1045 225 C1040 195, 1015 185, 975 190 C1005 170, 1025 165, 1040 160 Z" />
            <path d="M980 280 C1000 260, 1030 250, 1060 258 C1040 275, 1035 290, 1052 305 C1022 300, 1005 310, 985 330 C980 308, 960 300, 930 304 C952 288, 968 284, 980 280 Z" />
            <path d="M910 370 C925 355, 950 348, 972 354 C956 368, 952 380, 965 392 C942 388, 928 396, 914 412 C910 394, 895 388, 872 390 C888 378, 900 374, 910 370 Z" />
            <path d="M845 435 C856 422, 875 418, 892 422 C880 432, 876 442, 886 450 C868 448, 858 454, 848 466 C844 452, 832 448, 815 450 C828 440, 838 438, 845 435 Z" />
          </g>
        </svg>
      )}

      {/* 4. Measured Dark Vignette Scrim to guarantee WCAG AA legibility for all foreground panels */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 45%, rgba(13, 14, 17, 0.55) 0%, rgba(10, 11, 14, 0.88) 85%)',
        }}
      />

      {/* 5. Subtle corner archival coordinates */}
      {!lowEffectsMode && (
        <>
          <div className="hidden lg:block absolute top-24 left-8 text-[10px] font-mono-tabular tracking-[0.2em] text-[#9CA3AF]/45">
            {ARCHIVAL_GLYPHS[activeGlyphIndex]}
          </div>
          <div className="hidden lg:block absolute bottom-16 right-8 text-[10px] font-mono-tabular tracking-[0.2em] text-[#9CA3AF]/45">
            {ARCHIVAL_GLYPHS[(activeGlyphIndex + 3) % ARCHIVAL_GLYPHS.length]}
          </div>
        </>
      )}
    </div>
  );
};
