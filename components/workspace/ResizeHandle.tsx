'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeHandleProps {
  direction: 'horizontal' | 'vertical';
  onDelta: (delta: number) => void;
  ariaLabel: string;
}

export function ResizeHandle({ direction, onDelta, ariaLabel }: ResizeHandleProps) {
  const [dragging, setDragging] = useState(false);
  const lastPosRef = useRef(0);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      lastPosRef.current = direction === 'horizontal' ? e.clientX : e.clientY;
      setDragging(true);
    },
    [direction]
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (e: PointerEvent) => {
      const current = direction === 'horizontal' ? e.clientX : e.clientY;
      const delta = current - lastPosRef.current;
      if (delta !== 0) {
        lastPosRef.current = current;
        onDelta(delta);
      }
    };

    const handleUp = () => {
      setDragging(false);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    document.body.style.cursor =
      direction === 'horizontal' ? 'col-resize' : 'row-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [dragging, direction, onDelta]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={isHorizontal ? 'vertical' : 'horizontal'}
      onPointerDown={handlePointerDown}
      className={`group relative shrink-0 select-none transition-colors ${
        isHorizontal
          ? 'w-1 cursor-col-resize hover:bg-sky-500/40'
          : 'h-1 cursor-row-resize hover:bg-sky-500/40'
      } ${dragging ? 'bg-sky-500/60' : 'bg-white/[0.06]'}`}
    />
  );
}
