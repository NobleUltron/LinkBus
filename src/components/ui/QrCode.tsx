import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCode({
  value,
  size = 112,
  className = '',
}: QrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    if (!value) return;

    QRCode.toDataURL(value, {
      width: size * 2, // 2x for sharp retina display
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => setDataUrl(url))
      .catch((err) => console.error('Failed to generate real QR code:', err));
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center rounded-md bg-white p-1 border border-slate-200 ${className}`}
      >
        <span className="text-[9px] font-mono text-slate-400 animate-pulse">Generating...</span>
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt={`QR code for ${value}`}
      width={size}
      height={size}
      className={`rounded-md bg-white p-1 border border-slate-200 shadow-xs ${className}`}
      style={{ display: 'block' }}
    />
  );
}