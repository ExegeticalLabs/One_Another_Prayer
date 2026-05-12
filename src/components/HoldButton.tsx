import React, { useRef, useState } from "react";

export function HoldButton({ onComplete }: { onComplete: (elapsed: number) => void }) {
  const [isPraying, setIsPraying] = useState(false);
  const [localDur, setLocalDur] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<{ start: number, raf: number | null }>({ start: 0, raf: null });

  const handleStart = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (btnRef.current && e.pointerId) btnRef.current.setPointerCapture(e.pointerId);
    
    setIsPraying(true);
    setLocalDur(0);
    timerRef.current.start = performance.now();

    const tick = () => {
      const s = Math.floor((performance.now() - timerRef.current.start) / 1000);
      setLocalDur(prev => (prev === s ? prev : s));
      timerRef.current.raf = requestAnimationFrame(tick);
    };
    timerRef.current.raf = requestAnimationFrame(tick);
  };

  const handleEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isPraying) return;
    if (timerRef.current.raf) cancelAnimationFrame(timerRef.current.raf);
    
    const finalElapsed = Math.floor((performance.now() - timerRef.current.start) / 1000);
    if (finalElapsed >= 2) {
      onComplete(finalElapsed);
    }

    setIsPraying(false);
    setLocalDur(0);
    if (btnRef.current && e.pointerId) btnRef.current.releasePointerCapture(e.pointerId);
  };

  return (
    <div className="holdWrap">
      <div className={`ripple r1 ${isPraying ? "active" : ""}`} />
      <div className={`ripple r2 ${isPraying ? "active" : ""}`} />
      <button
        ref={btnRef}
        className={`holdBtn ${isPraying ? "active" : ""}`}
        onPointerDown={handleStart}
        onPointerUp={handleEnd}
        onPointerCancel={handleEnd}
        onContextMenu={(e) => e.preventDefault()} // Mobile long-press fix
        style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' } as any}
      >
        {isPraying ? <span className="holdTime">{localDur}</span> : <span className="holdLabel">Pray</span>}
      </button>
      {isPraying && <div className="prayingText">Praying...</div>}
    </div>
  );
}
