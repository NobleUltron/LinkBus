import React from 'react';
import {
  BriefcaseIcon,
  CheckCircle2Icon,
  PrinterIcon,
  QrCodeIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import { useSettings } from '../../contexts/SettingsContext';
import type { LuggageDetail } from '../../services/operations';
import { formatDateTime, money } from '../../utils/format';
import { Barcode1D } from '../ui/Barcode1D';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { QrCode } from '../ui/QrCode';
import { StatusPill } from '../ui/StatusPill';

interface LuggageTagModalProps {
  item: LuggageDetail | null;
  open: boolean;
  onClose: () => void;
}

export function LuggageTagModal({ item, open, onClose }: LuggageTagModalProps) {
  const { settings } = useSettings();
  if (!item) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `LinkBus-LuggageTag-${item.tag_number}`;

    const existingClone = document.getElementById('luggage-tag-print-clone');
    if (existingClone) existingClone.remove();

    const printDoc = document.querySelector('.print-luggage-tag') as HTMLElement | null;
    let clone: HTMLElement | null = null;

    if (printDoc) {
      clone = printDoc.cloneNode(true) as HTMLElement;
      clone.id = 'luggage-tag-print-clone';
      document.body.appendChild(clone);
    }

    document.body.classList.add('is-printing-luggage-tag');

    const cleanup = () => {
      document.body.classList.remove('is-printing-luggage-tag');
      document.title = originalTitle;
      const c = document.getElementById('luggage-tag-print-clone');
      if (c) c.remove();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 3000);
    window.print();
  };

  const freeAllowance = settings.free_luggage_kg || 20;
  const ratePerKg = settings.excess_luggage_fee_per_kg || 2000;
  const isExcess = (item.weight_kg || 0) > freeAllowance;
  const excessKg = isExcess ? (item.weight_kg || 0) - freeAllowance : 0;
  const excessFee = excessKg * ratePerKg;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Baggage Identification Tag"
      subtitle={`Tag #${item.tag_number}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted">
            Thermal Bag Tag &amp; Passenger Claim Check (100mm)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button icon={<PrinterIcon className="h-4 w-4" />} onClick={handlePrint}>
              Print Tag (PDF)
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex justify-center p-1">
        {/* Main Luggage Tag Container */}
        <div className="print-doc print-luggage-tag w-full max-w-[100mm] mx-auto rounded-2xl border-2 border-slate-300 bg-white text-slate-900 shadow-md p-5 space-y-4">
          
          {/* Top Brand Header */}
          <div className="flex items-start justify-between border-b-2 border-slate-200 pb-3">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-700 text-white font-black text-xs">
                  LB
                </span>
                <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                  LINK BUS SERVICES LTD
                </span>
              </div>
              <p className="text-[0.625rem] text-slate-500 font-semibold mt-0.5">
                BAGGAGE CHECK-IN &amp; IDENTIFICATION TAG
              </p>
            </div>
            <span className="rounded bg-emerald-100 border border-emerald-300 px-2 py-0.5 font-mono text-[0.625rem] font-bold text-emerald-900">
              {item.status.toUpperCase()}
            </span>
          </div>

          {/* Big Prominent Tag Number & QR */}
          <div className="flex items-center justify-between gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div>
              <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500 block">
                Luggage Tracking ID
              </span>
              <p className="font-mono text-xl font-black text-slate-900 tracking-tight">
                {item.tag_number}
              </p>
              <p className="text-[0.6875rem] font-medium text-slate-600 truncate max-w-[160px]">
                {item.description || 'Standard Luggage'}
              </p>
            </div>
            <div className="flex flex-col items-center">
              <QrCode value={item.tag_number} size={70} />
            </div>
          </div>

          {/* Route Corridor Banner */}
          <div className="rounded-lg bg-emerald-700 text-white px-3 py-2 text-center shadow-xs">
            <span className="text-[0.5625rem] font-bold uppercase tracking-widest text-emerald-100 block">
              Transit Corridor
            </span>
            <p className="text-sm font-extrabold text-white mt-0.5">
              {item.route}
            </p>
          </div>

          {/* Passenger & Schedule Matrix */}
          <dl className="space-y-2 text-xs border-y border-slate-200 py-3 text-slate-700">
            <div className="flex justify-between">
              <dt className="text-slate-500 font-medium">Passenger Name</dt>
              <dd className="font-bold text-slate-900">{item.passenger_name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 font-medium">Booking Reference</dt>
              <dd className="font-mono font-bold text-slate-900">#{item.booking_number}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 font-medium">Assigned Seat</dt>
              <dd className="font-mono font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                Seat {item.seat_number ?? 'TBD'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500 font-medium">Scheduled Departure</dt>
              <dd className="font-medium text-slate-900">{formatDateTime(item.departure_time)}</dd>
            </div>
            
            {/* Weight & Excess Fee Breakdown Row */}
            <div className="flex justify-between items-start pt-2 border-t border-slate-100">
              <div>
                <dt className="text-slate-500 font-medium">Verified Scale Weight</dt>
                <p className="text-[0.5625rem] text-slate-400">
                  {freeAllowance} kg Free Allowance included
                </p>
              </div>
              <dd className="text-right">
                <span className="font-extrabold text-slate-900 tabular-nums text-sm">
                  {item.weight_kg} kg
                </span>
                {isExcess ? (
                  <div className="mt-1 flex flex-col items-end gap-0.5">
                    <span className="text-[0.625rem] font-bold text-amber-800 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded">
                      +{excessKg} kg Excess @ {money(ratePerKg)}/kg
                    </span>
                    <span className="text-xs font-black text-emerald-800 tabular-nums">
                      Excess Fee: {money(excessFee)} Paid
                    </span>
                  </div>
                ) : (
                  <p className="text-[0.625rem] font-bold text-emerald-700 mt-0.5">
                    ✓ Within Free Allowance
                  </p>
                )}
              </dd>
            </div>
          </dl>

          {/* 1D Laser Barcode */}
          <div className="space-y-1 text-center">
            <Barcode1D value={item.tag_number} height={26} />
            <p className="font-mono text-[0.5625rem] font-bold text-slate-500 tracking-wider">
              *{item.tag_number}*
            </p>
          </div>

          {/* Perforated Passenger Claim Stub */}
          <div className="relative border-t-2 border-dashed border-slate-300 pt-3 bg-slate-50 -mx-5 -mb-5 p-4 rounded-b-2xl">
            <div className="flex items-center justify-between text-[0.625rem]">
              <div>
                <span className="font-black uppercase tracking-widest text-emerald-800">
                  PASSENGER CLAIM STUB
                </span>
                <p className="font-mono font-bold text-slate-900 mt-0.5">
                  {item.tag_number} · {item.passenger_name}
                </p>
                <p className="text-[0.5625rem] text-slate-600 font-medium mt-0.5">
                  Weight: <strong>{item.weight_kg} kg</strong>
                  {isExcess && (
                    <strong className="text-emerald-800 ml-1">
                      (Excess: {money(excessFee)} Paid)
                    </strong>
                  )}
                </p>
              </div>
              <span className="text-[0.5625rem] text-slate-500 font-medium text-right max-w-[120px]">
                Present this stub to claim baggage at destination.
              </span>
            </div>
          </div>

        </div>
      </div>
    </Modal>
  );
}