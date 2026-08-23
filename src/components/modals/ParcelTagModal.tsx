import React from 'react';
import { PackageIcon, PhoneIcon, PrinterIcon, ShieldCheckIcon } from 'lucide-react';
import type { ParcelDetail } from '../../services/operations';
import { formatDate, money } from '../../utils/format';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { QrCode } from '../ui/QrCode';
import { StatusPill } from '../ui/StatusPill';

interface ParcelTagModalProps {
  item: ParcelDetail | null;
  open: boolean;
  onClose: () => void;
}

export function ParcelTagModal({ item, open, onClose }: ParcelTagModalProps) {
  if (!item) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `LinkBus-Waybill-${item.tracking_number}`;

    const existingClone = document.getElementById('parcel-tag-print-clone');
    if (existingClone) existingClone.remove();

    const printDoc = document.querySelector('.print-parcel-tag') as HTMLElement | null;
    let clone: HTMLElement | null = null;

    if (printDoc) {
      clone = printDoc.cloneNode(true) as HTMLElement;
      clone.id = 'parcel-tag-print-clone';
      document.body.appendChild(clone);
    }

    document.body.classList.add('is-printing-parcel-tag');

    const cleanup = () => {
      document.body.classList.remove('is-printing-parcel-tag');
      document.title = originalTitle;
      const c = document.getElementById('parcel-tag-print-clone');
      if (c) c.remove();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 3000);
    window.print();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Parcel Dispatch Tag & Waybill"
      subtitle={`Waybill #${item.tracking_number}`}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-muted">
            Official Courier Waybill &amp; Manifest Slip (140mm)
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              icon={<PrinterIcon className="h-4 w-4" />}
              onClick={handlePrint}
            >
              Print Waybill (PDF)
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex justify-center p-1">
        <div className="print-doc print-parcel-tag w-full max-w-[140mm] mx-auto rounded-2xl border-2 border-slate-300 bg-white p-5 text-slate-900 shadow-md space-y-4">
        {/* Tag Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-700 text-white font-bold text-xs">
                LB
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-800">
                LinkBus Express Courier
              </span>
            </div>
            <p className="mt-1.5 font-mono text-2xl font-black tracking-tight text-slate-900">
              {item.tracking_number}
            </p>
            <p className="text-[0.6875rem] text-slate-500 font-medium">
              Accepted: {formatDate(item.created_at)}
            </p>
          </div>
          <div className="flex flex-col items-center">
            <QrCode value={item.tracking_number} size={84} />
            <span className="mt-1 font-mono text-[0.625rem] text-slate-500 font-bold">Scan to Verify</span>
          </div>
        </div>

        {/* Route Corridor Banner */}
        <div className="rounded-xl bg-slate-100 p-3 text-center border border-slate-200">
          <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">
            Transit Corridor
          </span>
          <p className="mt-0.5 text-base font-extrabold text-slate-900">
            {item.origin_city} ➔ {item.destination_city}
          </p>
        </div>

        {/* Sender & Recipient Box */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-slate-500">
              Sender (Dispatch)
            </span>
            <p className="mt-1 font-bold text-slate-900 text-sm">{item.sender_name}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-600 flex items-center gap-1">
              <PhoneIcon className="h-3 w-3 text-emerald-700" />
              {item.sender_phone}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-3 text-xs">
            <span className="text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-800">
              Recipient (Pickup Hub)
            </span>
            <p className="mt-1 font-bold text-slate-900 text-sm">{item.recipient_name}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-900 font-semibold flex items-center gap-1">
              <PhoneIcon className="h-3 w-3 text-emerald-700" />
              {item.recipient_phone}
            </p>
          </div>
        </div>

        {/* Specifications & Billing */}
        <dl className="space-y-2 text-xs border-t border-dashed border-slate-300 pt-3">
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Package Contents</dt>
            <dd className="font-semibold text-slate-900 text-right">{item.description}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Scale Weight</dt>
            <dd className="font-extrabold text-slate-900 tabular-nums">{item.weight_kg} kg</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-slate-500">Freight Fee Paid</dt>
            <dd className="font-extrabold text-emerald-700 tabular-nums">
              {money(item.price)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-slate-500">Courier Status</dt>
            <dd>
              <StatusPill status={item.status} />
            </dd>
          </div>
        </dl>

        {item.notes && (
          <div className="rounded-lg bg-amber-50 border border-amber-300 p-2.5 text-[0.6875rem] text-amber-900">
            <strong>Handling Notice:</strong> {item.notes}
          </div>
        )}

          {/* Footer Security Notice */}
          <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-[0.625rem] text-slate-500">
            <span className="flex items-center gap-1">
              <ShieldCheckIcon className="h-3 w-3 text-emerald-700" />
              Recipient ID + SMS PIN Required at Station Desk
            </span>
            <span>LinkBus Freight Logistics</span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
