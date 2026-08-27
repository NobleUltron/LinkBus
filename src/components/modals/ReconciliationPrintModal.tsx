import React, { useState } from 'react';
import {
  BanknoteIcon,
  CheckCircle2Icon,
  FileSpreadsheetIcon,
  PrinterIcon,
  ReceiptTextIcon,
  ShieldCheckIcon,
  TagIcon,
} from 'lucide-react';
import type { ShiftReconciliation } from '../../types/models';
import { formatDateTime, money } from '../../utils/format';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { StatusPill } from '../ui/StatusPill';

interface ReconciliationPrintModalProps {
  reconciliation: ShiftReconciliation | null;
  open: boolean;
  onClose: () => void;
}

export function ReconciliationPrintModal({
  reconciliation,
  open,
  onClose,
}: ReconciliationPrintModalProps) {
  const [printFormat, setPrintFormat] = useState<'thermal' | 'a4'>('thermal');

  if (!reconciliation) return null;

  const handlePrint = () => {
    const originalTitle = document.title;
    document.title = `LinkBus-ShiftReconciliation-${reconciliation.shift_code}`;

    const existingClone = document.getElementById('reconciliation-print-clone');
    if (existingClone) existingClone.remove();

    const targetClass = printFormat === 'thermal' ? '.print-thermal-shift' : '.print-a4-audit';
    const printDoc = document.querySelector(targetClass) as HTMLElement | null;
    let clone: HTMLElement | null = null;

    if (printDoc) {
      clone = printDoc.cloneNode(true) as HTMLElement;
      clone.id = 'reconciliation-print-clone';
      document.body.appendChild(clone);
    }

    document.body.classList.add('is-printing-reconciliation');

    const cleanup = () => {
      document.body.classList.remove('is-printing-reconciliation');
      document.title = originalTitle;
      const c = document.getElementById('reconciliation-print-clone');
      if (c) c.remove();
    };

    window.addEventListener('afterprint', cleanup, { once: true });
    setTimeout(cleanup, 3000);
    window.print();
  };

  const d = reconciliation.denominations;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Shift Reconciliation &amp; Cash Closeout Record"
      subtitle={`Shift #${reconciliation.shift_code} · ${reconciliation.terminal_name}`}
      size="2xl"
      footer={
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 w-full">
          {/* Format Switcher */}
          <div className="flex items-center gap-1.5 bg-surface-2 p-1 rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                printFormat === 'thermal'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <ReceiptTextIcon className="h-3.5 w-3.5" />
              80mm Thermal Slip (POS)
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                printFormat === 'a4'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-muted hover:text-fg'
              }`}
            >
              <FileSpreadsheetIcon className="h-3.5 w-3.5" />
              A4 Station Audit Sheet
            </button>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={onClose} className="text-xs">
              Close
            </Button>
            <Button
              icon={<PrinterIcon className="h-4 w-4" />}
              onClick={handlePrint}
              className="text-xs bg-brand-600 hover:bg-brand-700 text-white font-bold"
            >
              Print {printFormat === 'thermal' ? 'Thermal Receipt (80mm)' : 'A4 Document'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex justify-center p-1 overflow-x-auto">
        {printFormat === 'thermal' ? (
          /* ─── 80mm POS Thermal Receipt Preview ─── */
          <div className="print-doc print-thermal-shift w-full max-w-[80mm] mx-auto rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-md p-4 text-[0.6875rem] font-mono leading-tight space-y-3">
            <div className="text-center border-b border-dashed border-slate-400 pb-2.5">
              <h2 className="text-xs font-black uppercase tracking-wider">LINK BUS SERVICES LTD</h2>
              <p className="text-[0.625rem] text-slate-600">Uganda Intercity Express &amp; Cargo</p>
              <p className="text-[0.625rem] font-bold text-slate-800 mt-1">{reconciliation.terminal_name}</p>
              <div className="mt-1.5 inline-block bg-slate-900 text-white px-2 py-0.5 rounded text-[0.625rem] font-black uppercase">
                SHIFT CLOSEOUT SLIP (Z-REPORT)
              </div>
            </div>

            <div className="space-y-1 text-[0.625rem] border-b border-dashed border-slate-400 pb-2">
              <div className="flex justify-between">
                <span>Shift Code:</span>
                <strong className="font-bold">{reconciliation.shift_code}</strong>
              </div>
              <div className="flex justify-between">
                <span>Cashier:</span>
                <span>{reconciliation.cashier_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Supervisor:</span>
                <span>{reconciliation.supervisor_name || 'Station Manager'}</span>
              </div>
              <div className="flex justify-between">
                <span>Date &amp; Time:</span>
                <span>{formatDateTime(reconciliation.closed_at)}</span>
              </div>
            </div>

            {/* Drawer Math Equation Summary */}
            <div className="space-y-1 border-b border-dashed border-slate-400 pb-2 text-[0.625rem]">
              <div className="font-black text-slate-900 uppercase">DRAWER CASH LIFECYCLE</div>
              <div className="flex justify-between">
                <span>Opening Float:</span>
                <span>{money(reconciliation.opening_float || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span>+ Cash Inflows (Sales &amp; Top-up):</span>
                <span>{money(reconciliation.ticket_sales_cash + reconciliation.luggage_fees_cash + reconciliation.parcel_fees_cash + (reconciliation.cash_in_total || 0))}</span>
              </div>
              {(reconciliation.cash_out_expenses > 0 || reconciliation.safe_drops_total > 0) && (
                <div className="flex justify-between text-rose-700">
                  <span>- Expenses &amp; Safe Drops:</span>
                  <span>-{money((reconciliation.cash_out_expenses || 0) + (reconciliation.safe_drops_total || 0))}</span>
                </div>
              )}
              <div className="flex justify-between font-black pt-1 border-t border-slate-200">
                <span>EXPECTED DRAWER CASH:</span>
                <span>{money(reconciliation.system_expected_cash)}</span>
              </div>
            </div>

            {/* Physical Count & Variance */}
            <div className="space-y-1 border-b border-dashed border-slate-400 pb-2 text-[0.625rem]">
              <div className="font-black text-slate-900 uppercase">PHYSICAL CASH COUNT</div>
              <div className="flex justify-between font-black text-emerald-800">
                <span>Physical Counted Cash:</span>
                <span>{money(reconciliation.actual_counted_cash)}</span>
              </div>
              <div
                className={`flex justify-between font-black pt-1 border-t border-slate-300 ${
                  reconciliation.variance_cash === 0
                    ? 'text-emerald-700'
                    : reconciliation.variance_cash > 0
                    ? 'text-blue-700'
                    : 'text-rose-700'
                }`}
              >
                <span>VARIANCE / DISCREPANCY:</span>
                <span>
                  {reconciliation.variance_cash === 0
                    ? '0 UGX (BALANCED)'
                    : reconciliation.variance_cash > 0
                    ? `+${money(reconciliation.variance_cash)} (OVER)`
                    : `${money(reconciliation.variance_cash)} (SHORT)`}
                </span>
              </div>
              {reconciliation.variance_reason && (
                <div className="text-[0.5625rem] text-slate-600 italic mt-0.5">
                  Reason: {reconciliation.variance_reason}
                </div>
              )}
            </div>

            {/* Denominations */}
            {d && (
              <div className="space-y-0.5 text-[0.5625rem] border-b border-dashed border-slate-400 pb-2">
                <div className="font-black uppercase text-slate-900 mb-0.5">DENOMINATION BREAKDOWN</div>
                <div className="flex justify-between">
                  <span>50,000 UGX x {d.notes_50k || 0}</span>
                  <span>{money((d.notes_50k || 0) * 50000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>20,000 UGX x {d.notes_20k || 0}</span>
                  <span>{money((d.notes_20k || 0) * 20000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>10,000 UGX x {d.notes_10k || 0}</span>
                  <span>{money((d.notes_10k || 0) * 10000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>5,000 UGX x {d.notes_5k || 0}</span>
                  <span>{money((d.notes_5k || 0) * 5000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>2,000 UGX x {d.notes_2k || 0}</span>
                  <span>{money((d.notes_2k || 0) * 2000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>1,000 UGX x {d.notes_1k || 0}</span>
                  <span>{money((d.notes_1k || 0) * 1000)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coins Total</span>
                  <span>{money(d.coins || 0)}</span>
                </div>
              </div>
            )}

            {/* Digital Settlements */}
            <div className="space-y-0.5 text-[0.5625rem] border-b border-dashed border-slate-400 pb-2">
              <div className="font-black uppercase text-slate-900 mb-0.5">DIGITAL SETTLEMENTS</div>
              <div className="flex justify-between">
                <span>MTN Mobile Money:</span>
                <span>{money(reconciliation.system_expected_momo)}</span>
              </div>
              <div className="flex justify-between">
                <span>Airtel Money:</span>
                <span>{money(reconciliation.system_expected_airtel)}</span>
              </div>
              <div className="flex justify-between">
                <span>Card (POS):</span>
                <span>{money(reconciliation.system_expected_card)}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-2 space-y-3 text-[0.5625rem]">
              <div className="flex justify-between items-end">
                <div>
                  <div className="border-b border-slate-400 w-24 h-4 mb-0.5" />
                  <span>Cashier Signature</span>
                </div>
                <div>
                  <div className="border-b border-slate-400 w-24 h-4 mb-0.5" />
                  <span>Supervisor Signature</span>
                </div>
              </div>
              <p className="text-center text-[0.5rem] text-slate-500">
                Official LinkBus Terminal Cashier Closeout Record · Keep for audit
              </p>
            </div>
          </div>
        ) : (
          /* ─── A4 Official Station Audit Document Preview ─── */
          <div className="print-doc print-a4-audit w-full max-w-[210mm] mx-auto rounded-xl border-2 border-slate-300 bg-white text-slate-900 shadow-md p-8 text-xs space-y-6">
            {/* A4 Header */}
            <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-800 text-white font-black text-sm">
                    LB
                  </span>
                  <div>
                    <h1 className="text-base font-black uppercase tracking-wider text-emerald-900">
                      LINK BUS SERVICES LIMITED
                    </h1>
                    <p className="text-[0.6875rem] text-slate-600 font-semibold">
                      Head Office: Namayiba Terminal, Nakivubo Rd, Kampala · Tel: +256 700 123 456
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-block bg-slate-900 text-white px-3 py-1 rounded text-xs font-black uppercase">
                  DAILY CASHIER AUDIT &amp; RECONCILIATION
                </span>
                <p className="font-mono font-bold text-slate-700 mt-1">
                  Shift Ref: {reconciliation.shift_code}
                </p>
              </div>
            </div>

            {/* Terminal & Duty Details */}
            <div className="grid grid-cols-4 gap-4 p-3 bg-slate-100 rounded-lg text-xs font-medium border border-slate-200">
              <div>
                <span className="text-slate-500 block text-[0.625rem] font-bold uppercase">Terminal Station</span>
                <strong className="text-slate-900">{reconciliation.terminal_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[0.625rem] font-bold uppercase">Cashier Name</span>
                <strong className="text-slate-900">{reconciliation.cashier_name}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[0.625rem] font-bold uppercase">Duty Supervisor</span>
                <strong className="text-slate-900">{reconciliation.supervisor_name || 'Station Manager'}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[0.625rem] font-bold uppercase">Date &amp; Shift Time</span>
                <strong className="text-slate-900">{formatDateTime(reconciliation.closed_at)}</strong>
              </div>
            </div>

            {/* Category Revenue Breakdown Table */}
            <div>
              <h2 className="text-xs font-black uppercase text-slate-900 mb-2">
                1. REVENUE COLLECTION AUDIT BY REVENUE STREAM
              </h2>
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-200 border-b border-slate-300 text-slate-700 text-left">
                    <th className="p-2">Revenue Category</th>
                    <th className="p-2 text-center">Volume / Qty</th>
                    <th className="p-2 text-right">Cash Collected</th>
                    <th className="p-2 text-right">MTN MoMo</th>
                    <th className="p-2 text-right">Airtel Money</th>
                    <th className="p-2 text-right">Card / POS</th>
                    <th className="p-2 text-right">Gross Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  <tr>
                    <td className="p-2 font-bold text-slate-900">🎟️ Passenger Ticket Fares</td>
                    <td className="p-2 text-center font-mono">{reconciliation.ticket_count} tickets</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-800">{money(reconciliation.ticket_sales_cash)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.ticket_sales_momo)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.ticket_sales_airtel)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.ticket_sales_card)}</td>
                    <td className="p-2 text-right font-mono font-bold">{money(reconciliation.ticket_sales_total)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-900">🧳 Excess Luggage Surcharges</td>
                    <td className="p-2 text-center font-mono">{reconciliation.luggage_count} bags</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-800">{money(reconciliation.luggage_fees_cash)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.luggage_fees_momo)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.luggage_fees_airtel)}</td>
                    <td className="p-2 text-right font-mono">0 UGX</td>
                    <td className="p-2 text-right font-mono font-bold">{money(reconciliation.luggage_fees_total)}</td>
                  </tr>
                  <tr>
                    <td className="p-2 font-bold text-slate-900">📦 Parcel &amp; Cargo Waybills</td>
                    <td className="p-2 text-center font-mono">{reconciliation.parcel_count} parcels</td>
                    <td className="p-2 text-right font-mono font-bold text-emerald-800">{money(reconciliation.parcel_fees_cash)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.parcel_fees_momo)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.parcel_fees_airtel)}</td>
                    <td className="p-2 text-right font-mono">0 UGX</td>
                    <td className="p-2 text-right font-mono font-bold">{money(reconciliation.parcel_fees_total)}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t-2 border-slate-400 font-black">
                    <td className="p-2 uppercase" colSpan={2}>Grand Shift Totals</td>
                    <td className="p-2 text-right font-mono text-emerald-900">{money(reconciliation.system_expected_cash)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.system_expected_momo)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.system_expected_airtel)}</td>
                    <td className="p-2 text-right font-mono">{money(reconciliation.system_expected_card)}</td>
                    <td className="p-2 text-right font-mono text-slate-900">{money(reconciliation.system_expected_total)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Denominations & Variance Side by Side */}
            <div className="grid grid-cols-2 gap-6">
              {/* Denominations Box */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                <h3 className="text-[0.6875rem] font-black uppercase text-slate-900 mb-2">
                  2. PHYSICAL CASH DENOMINATION COUNT
                </h3>
                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between">
                    <span>UGX 50,000 Notes x {d?.notes_50k || 0}</span>
                    <strong>{money((d?.notes_50k || 0) * 50000)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>UGX 20,000 Notes x {d?.notes_20k || 0}</span>
                    <strong>{money((d?.notes_20k || 0) * 20000)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>UGX 10,000 Notes x {d?.notes_10k || 0}</span>
                    <strong>{money((d?.notes_10k || 0) * 10000)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>UGX 5,000 Notes x {d?.notes_5k || 0}</span>
                    <strong>{money((d?.notes_5k || 0) * 5000)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>UGX 2,000 Notes x {d?.notes_2k || 0}</span>
                    <strong>{money((d?.notes_2k || 0) * 2000)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>UGX 1,000 Notes x {d?.notes_1k || 0}</span>
                    <strong>{money((d?.notes_1k || 0) * 1000)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Coins (500/200/100/50 UGX)</span>
                    <strong>{money(d?.coins || 0)}</strong>
                  </div>
                  <div className="border-t border-slate-300 pt-1.5 mt-1.5 flex justify-between font-black text-sm text-emerald-900">
                    <span>TOTAL PHYSICAL COUNT:</span>
                    <span>{money(reconciliation.actual_counted_cash)}</span>
                  </div>
                </div>
              </div>

              {/* Variance & Audit Box */}
              <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 flex flex-col justify-between">
                <div>
                  <h3 className="text-[0.6875rem] font-black uppercase text-slate-900 mb-2">
                    3. CASH DRAWER VARIANCE &amp; BALANCE STATUS
                  </h3>
                  <dl className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Opening Float:</dt>
                      <dd className="font-mono font-bold">{money(reconciliation.opening_float || 0)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Expected Cash in Drawer:</dt>
                      <dd className="font-mono font-bold">{money(reconciliation.system_expected_cash)}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-600">Physical Counted Cash:</dt>
                      <dd className="font-mono font-bold text-emerald-800">{money(reconciliation.actual_counted_cash)}</dd>
                    </div>
                    <div className="flex justify-between border-t border-slate-300 pt-1 font-bold">
                      <dt>Discrepancy / Variance:</dt>
                      <dd
                        className={`font-mono font-black ${
                          reconciliation.variance_cash === 0
                            ? 'text-emerald-700'
                            : reconciliation.variance_cash > 0
                            ? 'text-blue-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {reconciliation.variance_cash === 0
                          ? '0 UGX (BALANCED)'
                          : reconciliation.variance_cash > 0
                          ? `+${money(reconciliation.variance_cash)} (OVERAGE)`
                          : `${money(reconciliation.variance_cash)} (SHORTAGE)`}
                      </dd>
                    </div>
                  </dl>

                  {reconciliation.variance_reason && (
                    <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded text-[0.6875rem] text-amber-900">
                      <strong>Variance Explanation:</strong> {reconciliation.variance_reason}
                    </div>
                  )}

                  {reconciliation.closing_notes && (
                    <div className="mt-2 text-[0.6875rem] text-slate-600">
                      <strong>Handover Notes:</strong> {reconciliation.closing_notes}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-300 flex justify-between items-center">
                  <span className="text-[0.6875rem] font-bold text-slate-500 uppercase">Audit Clearance:</span>
                  <StatusPill status={reconciliation.status} />
                </div>
              </div>
            </div>

            {/* Official Sign-Off Section */}
            <div className="grid grid-cols-3 gap-6 pt-4 border-t-2 border-slate-900">
              <div className="space-y-4">
                <div className="border-b border-slate-400 h-10" />
                <div>
                  <strong className="block text-xs font-bold text-slate-900">{reconciliation.cashier_name}</strong>
                  <span className="text-[0.625rem] text-slate-500 uppercase">Counter Cashier (Handed Over)</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border-b border-slate-400 h-10" />
                <div>
                  <strong className="block text-xs font-bold text-slate-900">{reconciliation.supervisor_name || 'Duty Supervisor'}</strong>
                  <span className="text-[0.625rem] text-slate-500 uppercase">Station Supervisor (Verified)</span>
                </div>
              </div>

              <div className="border border-slate-300 rounded p-2 text-center flex flex-col justify-center items-center">
                <span className="text-[0.625rem] text-slate-400 font-bold uppercase block mb-1">
                  Terminal Official Stamp Box
                </span>
                <div className="h-10 w-24 border border-dashed border-slate-300 rounded flex items-center justify-center text-[0.5625rem] text-slate-400">
                  [STAMP HERE]
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
