import React, { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  AlertTriangleIcon,
  CameraIcon,
  CheckCircle2Icon,
  FlashlightIcon,
  FlashlightOffIcon,
  Loader2Icon,
  Maximize2Icon,
  RefreshCwIcon,
  ScanLineIcon,
  SwitchCameraIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react';
import { soundEffects } from '../../utils/audioFeedback';

interface CameraQrScannerProps {
  onScan: (decodedText: string) => void;
  active?: boolean;
  autoBoard?: boolean;
  className?: string;
}

export function CameraQrScanner({
  onScan,
  active = true,
  autoBoard = false,
  className = '',
}: CameraQrScannerProps) {
  const containerId = useId().replace(/:/g, '_') + '_qr_reader';
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ text: string; time: number }>({ text: '', time: 0 });

  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isStarting, setIsStarting] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);

  // Discover available cameras
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setCameras(devices);
          // Prefer back/environment camera if available
          const backCam = devices.find(
            (d) =>
              d.label.toLowerCase().includes('back') ||
              d.label.toLowerCase().includes('rear') ||
              d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.id : devices[0].id);
        } else {
          setCameraError('No video cameras detected on this device.');
          setIsStarting(false);
        }
      })
      .catch((err) => {
        const msg = String(err?.message || err || '');
        if (msg.includes('Permission') || msg.includes('NotAllowedError')) {
          setCameraError('Camera access permission was denied. Please allow camera permissions in your browser bar.');
        } else {
          setCameraError('Could not initialize camera: ' + msg);
        }
        setIsStarting(false);
      });
  }, []);

  // Start / restart camera when active state or selected camera changes
  useEffect(() => {
    if (!active || !selectedCameraId) {
      stopScanner();
      return;
    }

    let isCancelled = false;
    setIsStarting(true);
    setCameraError(null);

    const qr = new Html5Qrcode(containerId, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
      ],
      verbose: false,
    });

    scannerRef.current = qr;

    const qrConfig = {
      fps: 15,
      qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxEdge = Math.floor(minEdge * 0.75);
        return {
          width: qrboxEdge,
          height: qrboxEdge,
        };
      },
      aspectRatio: 1.333333,
    };

    qr.start(
      selectedCameraId,
      qrConfig,
      (decodedText) => {
        if (isCancelled) return;
        const now = Date.now();
        // Prevent duplicate trigger for identical code within 2 seconds
        if (
          lastScanRef.current.text === decodedText &&
          now - lastScanRef.current.time < 2000
        ) {
          return;
        }

        lastScanRef.current = { text: decodedText, time: now };
        setLastScannedCode(decodedText);

        if (soundEnabled) {
          soundEffects.playSuccessBeep();
        }

        onScan(decodedText);
      },
      () => {
        // Frame did not contain a QR code (standard background scan frame)
      }
    )
      .then(() => {
        if (isCancelled) {
          qr.stop().catch(() => undefined);
          return;
        }
        setIsRunning(true);
        setIsStarting(false);

        // Check if torch/flashlight is supported
        try {
          const capabilities = qr.getRunningTrackCapabilities();
          if (capabilities && (capabilities as any).torch) {
            setHasTorch(true);
          }
        } catch {
          setHasTorch(false);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          setIsStarting(false);
          setIsRunning(false);
          setCameraError(
            err?.message || 'Could not start camera feed. Please ensure no other application is using the camera.'
          );
        }
      });

    return () => {
      isCancelled = true;
      stopScanner();
    };
  }, [active, selectedCameraId, containerId]);

  const stopScanner = () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current
        .stop()
        .then(() => {
          setIsRunning(false);
          setIsStarting(false);
        })
        .catch(() => undefined);
    }
  };

  const toggleTorch = async () => {
    if (!scannerRef.current || !hasTorch) return;
    try {
      const nextTorch = !torchOn;
      await scannerRef.current.applyVideoConstraints({
        advanced: [{ torch: nextTorch } as any],
      });
      setTorchOn(nextTorch);
    } catch {
      setHasTorch(false);
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-line bg-slate-950 text-white shadow-xl ${className}`}
    >
      {/* Top Controls Overlay */}
      <div className="absolute top-0 inset-x-0 z-20 flex items-center justify-between p-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isRunning ? 'bg-emerald-400 opacity-75' : 'bg-amber-400 opacity-75'}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isRunning ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200 drop-shadow">
            {isRunning ? 'Live Camera Scanner' : 'Initializing…'}
          </span>
          {autoBoard && (
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/50 px-2 py-0.5 text-[0.625rem] font-extrabold uppercase text-emerald-400">
              ⚡ Rapid Auto-Board
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {hasTorch && (
            <button
              type="button"
              onClick={toggleTorch}
              title={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
              className={`rounded-xl p-2 transition-colors ${
                torchOn ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {torchOn ? <FlashlightOffIcon className="h-4 w-4" /> : <FlashlightIcon className="h-4 w-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'Mute scan sounds' : 'Enable scan sounds'}
            className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
          >
            {soundEnabled ? <Volume2Icon className="h-4 w-4 text-emerald-400" /> : <VolumeXIcon className="h-4 w-4 text-slate-400" />}
          </button>
        </div>
      </div>

      {/* Video Viewport Container */}
      <div className="relative min-h-[300px] sm:min-h-[360px] flex items-center justify-center bg-black">
        <div id={containerId} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

        {/* Loading Spinner */}
        {isStarting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center space-y-3">
            <Loader2Icon className="h-8 w-8 animate-spin text-brand-500" />
            <p className="text-xs font-semibold text-slate-300">
              Connecting camera stream…
            </p>
          </div>
        )}

        {/* Error Fallback Box */}
        {cameraError && !isStarting && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 p-6 text-center space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 border border-red-500/30">
              <AlertTriangleIcon className="h-6 w-6" />
            </div>
            <p className="text-xs font-bold text-red-300 max-w-sm">
              {cameraError}
            </p>
            <p className="text-[0.6875rem] text-slate-400 max-w-xs">
              You can still scan tickets using a handheld USB barcode scanner or manual keyboard entry below.
            </p>
            <button
              type="button"
              onClick={() => {
                setIsStarting(true);
                setCameraError(null);
                setSelectedCameraId(selectedCameraId);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
            >
              <RefreshCwIcon className="h-3.5 w-3.5" />
              Retry Camera
            </button>
          </div>
        )}

        {/* Viewfinder Target Framing & Animated Laser Beam */}
        {isRunning && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
            {/* Darkened corner vignettes */}
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.35)] overflow-hidden">
              {/* Four Corner Target Reticles */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />

              {/* Animated Laser Scanning Line */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,1)] animate-[bounce_2s_infinite]" />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Bar: Camera Switcher & Last Scanned Badge */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-900 border-t border-slate-800 text-xs">
        {/* Camera Selector Dropdown */}
        {cameras.length > 1 ? (
          <div className="flex items-center gap-2">
            <SwitchCameraIcon className="h-4 w-4 text-slate-400 shrink-0" />
            <select
              value={selectedCameraId}
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.slice(0, 5)}`}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-400 text-[0.6875rem]">
            <CameraIcon className="h-3.5 w-3.5 text-emerald-400" />
            <span>Point camera at QR code or Barcode</span>
          </div>
        )}

        {lastScannedCode && (
          <div className="flex items-center gap-1.5 text-[0.6875rem] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md truncate max-w-[200px]">
            <CheckCircle2Icon className="h-3 w-3 shrink-0" />
            <span className="truncate">{lastScannedCode}</span>
          </div>
        )}
      </div>
    </div>
  );
}
