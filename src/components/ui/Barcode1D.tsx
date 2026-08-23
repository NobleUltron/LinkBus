import React from 'react';

interface Barcode1DProps {
  value: string;
  height?: number;
  className?: string;
  showText?: boolean;
}

export function Barcode1D({
  value,
  height = 36,
  className = '',
  showText = false,
}: Barcode1DProps) {
  // Deterministically generate a realistic Code128-like alternating bar width pattern from string
  const bars: number[] = [];
  let seed = 0;
  for (let i = 0; i < value.length; i++) {
    seed = (seed * 31 + value.charCodeAt(i)) & 0xffffffff;
  }
  const str = Math.abs(seed).toString() + '1092837465928174';

  // Fixed quiet zones and standard guard bars
  bars.push(2, 1, 1, 1);
  for (let i = 0; i < 28; i++) {
    const digit = parseInt(str[i % str.length] ?? '3', 10);
    const w1 = (digit % 3) + 1;
    const w2 = ((digit >> 1) % 2) + 1;
    bars.push(w1, w2);
  }
  bars.push(1, 1, 2);

  let currentX = 0;
  const elements = bars.map((w, idx) => {
    const isBar = idx % 2 === 0;
    const x = currentX;
    currentX += w;
    if (!isBar) return null;
    return (
      <rect
        key={idx}
        x={x}
        y={0}
        width={w}
        height={height}
        fill="#000000"
        style={{ fill: '#000000' }}
      />
    );
  });

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${currentX} ${height}`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        style={{ display: 'block' }}
      >
        {elements}
      </svg>
      {showText && (
        <span className="mt-0.5 font-mono text-[0.5625rem] font-bold text-fg tracking-widest uppercase">
          {value}
        </span>
      )}
    </div>
  );
}
