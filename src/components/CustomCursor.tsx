import React, { useEffect, useRef, useState } from 'react';

interface CustomCursorProps {
  disabled: boolean;
}

/**
 * Desktop-only subtle spectral reticle that follows the pointer without
 * hiding or replacing native OS cursor or interfering with accessibility.
 */
export const CustomCursor: React.FC<CustomCursorProps> = ({ disabled }) => {
  const ringRef = useRef<HTMLDivElement | null>(null);
  const [isFinePointer, setIsFinePointer] = useState(false);
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(pointer: fine)');
    setIsFinePointer(mq.matches);

    const onChange = (e: MediaQueryListEvent) => setIsFinePointer(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (disabled || !isFinePointer) return;

    let rafId = 0;
    const target = { x: -100, y: -100 };
    const current = { x: -100, y: -100 };

    const onPointerMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (!isVisible) setIsVisible(true);

      const el = e.target as HTMLElement | null;
      const interactive = Boolean(
        el?.closest('button, a, input, textarea, select, [role="button"], [data-artifact-hover="true"]')
      );
      setIsHoveringInteractive(interactive);
    };

    const onPointerLeave = () => {
      setIsVisible(false);
    };

    const animate = () => {
      current.x += (target.x - current.x) * 0.22;
      current.y += (target.y - current.y) * 0.22;

      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
      }
      rafId = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.addEventListener('mouseleave', onPointerLeave);
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('mouseleave', onPointerLeave);
    };
  }, [disabled, isFinePointer, isVisible]);

  if (disabled || !isFinePointer || !isVisible) return null;

  return (
    <div
      ref={ringRef}
      aria-hidden="true"
      className="fixed top-0 left-0 z-50 pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200"
    >
      <div
        className={`rounded-full transition-all duration-150 ${
          isHoveringInteractive
            ? 'w-9 h-9 -ml-4.5 -mt-4.5 border border-[#EF4444]/70 bg-[#DC2626]/15 shadow-[0_0_20px_rgba(220,38,38,0.32)]'
            : 'w-6 h-6 -ml-3 -mt-3 border border-[#D1D5DB]/35 bg-transparent'
        }`}
      />
    </div>
  );
};
