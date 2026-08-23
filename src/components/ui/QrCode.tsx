import React, { useMemo } from 'react';
import { qrMatrix } from '../../utils/qr';
interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}
export function QrCode({
  value,
  size = 112,
  className = ''
}: QrCodeProps) {
  const matrix = useMemo(() => qrMatrix(value), [value]);
  const modules = matrix.length;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${modules} ${modules}`}
      role="img"
      aria-label={`QR code for ${value}`}
      className={`rounded-md bg-white p-1 ${className}`}
      shapeRendering="crispEdges"
      style={{ backgroundColor: '#ffffff', display: 'block' }}
    >
      {matrix.map((row, y) =>
        row.map((filled, x) =>
          filled ? (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill="#000000"
              style={{ fill: '#000000' }}
            />
          ) : null
        )
      )}
    </svg>
  );
}