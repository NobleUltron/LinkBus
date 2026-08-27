import React, { useState } from 'react';
import {
  FileSpreadsheetIcon,
  PackageIcon,
  PhoneIcon,
  PrinterIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import type { ParcelDetail } from '../../services/operations';
import { formatDate, formatDateTime, money } from '../../utils/format';
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
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

  if (!item) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `LinkBus-Waybill-${item.tracking_number}`;

    const existingClone = document.getElementById('parcel-tag-print-clone');
    if (existingClone) existingClone.remove();

    const targetClass = printFormat === 'thermal' ? '.print-parcel-thermal' : '.print-parcel-a4';
    const printDoc = document.querySelector(targetClass) as HTMLElement | null;
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
      size="lg"
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
          {/* Format Selector Pills */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-2 border border-line">
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                printFormat === 'thermal'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <ReceiptTextIcon className="h-3.5 w-3.5" />
              80mm Thermal Tag (POS)
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                printFormat === 'a4'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <FileSpreadsheetIcon className="h-3.5 w-3.5" />
              A4 Consignment Sheet
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button
              icon={<PrinterIcon className="h-4 w-4" />}
              onClick={handlePrint}
            >
              Print {printFormat === 'thermal' ? '80mm Slip' : 'A4 Sheet'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="p-1 space-y-4">
        {/* ── 1. 80mm POS Thermal Slip Preview ── */}
        {printFormat === 'thermal' && (
          <div className="flex justify-center">
            <div className="print-doc print-parcel-thermal w-full max-w-[80mm] mx-auto rounded-xl border-2 border-dashed border-slate-300 bg-white p-4 text-slate-900 shadow-sm space-y-3 font-mono text-xs">
              {/* Slip Header */}
              <div className="text-center border-b border-dashed border-slate-300 pb-2.5">
                <div className="flex items-center justify-center gap-1">
                  <span className="h-5 w-5 rounded bg-emerald-700 text-white font-black text-[0.625rem] flex items-center justify-center">
                    LB
                  </span>
                  <span className="font-extrabold text-sm tracking-tight text-slate-900">
                    LINK BUS COURIER
                  </span>
                </div>
                <p className="text-[0.625rem] text-slate-500 mt-0.5">
                  Express Freight &amp; Cargo Logistics
                </p>
                <p className="text-[0.5625rem] text-slate-400">
                  TIN: 1002938481 · Tel: 0800 220 300
                </p>
              </div>

              {/* Waybill Code & QR */}
              <div className="flex flex-col items-center justify-center text-center py-1">
                <QrCode value={item.tracking_number} size={90} />
                <p className="mt-1 font-black text-lg tracking-wider text-slate-900">
                  {item.tracking_number}
                </p>
                <p className="text-[0.625rem] text-slate-500">
                  {formatDateTime(item.created_at)}
                </p>
              </div>

              {/* Route Corridor Banner */}
              <div className="rounded-lg bg-slate-100 p-2 text-center border border-slate-300">
                <span className="text-[0.5625rem] font-bold uppercase tracking-wider text-slate-500">
                  Destination Hub
                </span>
                <p className="text-sm font-black text-slate-900 mt-0.5">
                  {item.origin_city} ➔ {item.destination_city}
                </p>
              </div>

              {/* Sender & Recipient Matrix */}
              <div className="space-y-2 border-t border-b border-dashed border-slate-300 py-2.5 text-[0.6875rem]">
                <div>
                  <span className="text-slate-500 font-bold block text-[0.5625rem] uppercase">
                    Sender:
                  </span>
                  <p className="font-bold text-slate-900">{item.sender_name}</p>
                  <p className="text-slate-600">{item.sender_phone}</p>
                </div>
                <div>
                  <span className="text-slate-500 font-bold block text-[0.5625rem] uppercase">
                    Recipient (Collect Hub):
                  </span>
                  <p className="font-black text-slate-900 text-xs">{item.recipient_name}</p>
                  <p className="font-bold text-emerald-800">{item.recipient_phone}</p>
                </div>
              </div>

              {/* Package Specs */}
              <div className="space-y-1 text-[0.6875rem]">
                <div className="flex justify-between">
                  <span className="text-slate-500">Contents:</span>
                  <span className="font-bold text-slate-900 text-right truncate max-w-[130px]">
                    {item.description}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Scale Weight:</span>
                  <span className="font-black text-slate-900">{item.weight_kg} kg</span>
                </div>
                <div className="flex justify-between text-sm pt-1 border-t border-slate-200">
                  <span className="font-black text-slate-900">Freight Paid:</span>
                  <span className="font-black text-emerald-800">{money(item.price)}</span>
                </div>
              </div>

              {item.notes && (
                <div className="rounded bg-amber-50 border border-amber-300 p-1.5 text-[0.5625rem] text-amber-900">
                  <strong>Notice:</strong> {item.notes}
                </div>
              )}

              {/* Footer Notice */}
              <div className="border-t border-dashed border-slate-300 pt-2 text-center text-[0.5625rem] text-slate-500 space-y-0.5">
                <p className="font-bold">★ RECIPIENT ID + SMS PIN REQUIRED ★</p>
                <p>Present SMS code at destination station counter.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. A4 Official Consignment Audit Note Preview ── */}
        {printFormat === 'a4' && (
          <div className="print-doc print-parcel-a4 w-full rounded-2xl border-2 border-slate-300 bg-white p-6 text-slate-900 shadow-sm space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 font-black text-white text-sm">
                    LB
                  </span>
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-slate-900">
                      LINK BUS SERVICES LTD
                    </h2>
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      Commercial Freight &amp; Express Cargo Consignment Note
                    </p>
                  </div>
                </div>
                <p className="mt-1 text-[0.6875rem] text-slate-500">
                  Head Office: Plot 18 Kyaggwe Rd, Kampala · TIN: 1002938481 · Toll-Free: 0800 220 300
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-900 border border-emerald-300">
                  OFFICIAL AUDIT COPY
                </span>
                <p className="font-mono text-base font-black text-slate-900 mt-1">
                  #{item.tracking_number}
                </p>
                <p className="text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
              </div>
            </div>

            {/* Hub Corridor Route Box */}
            <div className="rounded-xl border-2 border-slate-300 bg-slate-50 p-3 text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Authorized Transit Route
              </span>
              <p className="text-lg font-black text-slate-900 mt-0.5">
                {item.origin_city} Station ➔ {item.destination_city} Regional Hub
              </p>
            </div>

            {/* Sender & Recipient Columns */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-300 bg-slate-50/70 p-3.5 text-xs space-y-1.5">
                <span className="font-extrabold uppercase tracking-wider text-slate-600 block text-[0.6875rem]">
                  1. Consignor (Sender)
                </span>
                <p className="font-black text-slate-900 text-sm">{item.sender_name}</p>
                <p className="font-mono text-slate-700 flex items-center gap-1 font-semibold">
                  <PhoneIcon className="h-3 w-3 text-emerald-700" />
                  {item.sender_phone}
                </p>
                <p className="text-[0.6875rem] text-slate-500 pt-1">
                  Acceptance Station: <strong>{item.origin_city}</strong>
                </p>
              </div>

              <div className="rounded-xl border-2 border-emerald-400 bg-emerald-50/40 p-3.5 text-xs space-y-1.5">
                <span className="font-extrabold uppercase tracking-wider text-emerald-800 block text-[0.6875rem]">
                  2. Consignee (Recipient)
                </span>
                <p className="font-black text-slate-900 text-sm">{item.recipient_name}</p>
                <p className="font-mono text-emerald-900 flex items-center gap-1 font-bold">
                  <PhoneIcon className="h-3 w-3 text-emerald-700" />
                  {item.recipient_phone}
                </p>
                <p className="text-[0.6875rem] text-emerald-800 pt-1">
                  Destination Pickup Hub: <strong>{item.destination_city}</strong>
                </p>
              </div>
            </div>

            {/* Consignment Item Matrix Table */}
            <table className="w-full text-left border-collapse text-xs border border-slate-300 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <tr>
                  <th className="p-2.5">Item Description &amp; Contents</th>
                  <th className="p-2.5 text-center">Scale Weight</th>
                  <th className="p-2.5 text-center">Handling Status</th>
                  <th className="p-2.5 text-right">Freight Charges (UGX)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="p-2.5 font-semibold text-slate-900">
                    {item.description}
                    {item.notes && (
                      <p className="text-[0.6875rem] text-amber-800 font-normal mt-0.5">
                        Note: {item.notes}
                      </p>
                    )}
                  </td>
                  <td className="p-2.5 text-center font-bold">{item.weight_kg} kg</td>
                  <td className="p-2.5 text-center">
                    <StatusPill status={item.status} />
                  </td>
                  <td className="p-2.5 text-right font-black tabular-nums text-emerald-800 text-sm">
                    {money(item.price)}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-black">
                <tr>
                  <td colSpan={3} className="p-2.5 text-right text-slate-700">
                    TOTAL SETTLED FREIGHT:
                  </td>
                  <td className="p-2.5 text-right text-base text-emerald-800 tabular-nums">
                    {money(item.price)}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Verification Signatures & Stamp */}
            <div className="grid grid-cols-3 gap-4 border-t-2 border-slate-200 pt-4 text-[0.6875rem]">
              <div className="space-y-6">
                <p className="font-bold text-slate-700">Sender Signature:</p>
                <div className="border-b border-slate-400 pb-1" />
                <p className="text-slate-400">Declared contents are accurate</p>
              </div>

              <div className="space-y-6">
                <p className="font-bold text-slate-700">Issuing Cashier &amp; Stamp:</p>
                <div className="border-b border-slate-400 pb-1" />
                <p className="text-slate-400">Terminal Dispatch Officer</p>
              </div>

              <div className="space-y-6">
                <p className="font-bold text-slate-700">Recipient Release Sign:</p>
                <div className="border-b border-slate-400 pb-1" />
                <p className="text-slate-400">Verified ID &amp; SMS PIN</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
