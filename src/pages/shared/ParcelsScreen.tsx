import React, { useMemo, useState } from 'react';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  DollarSignIcon,
  FileSpreadsheetIcon,
  MapPinIcon,
  PackageCheckIcon,
  PackageIcon,
  PencilIcon,
  PhoneIcon,
  PlusIcon,
  PrinterIcon,
  ScaleIcon,
  SearchIcon,
  ShieldCheckIcon,
  Trash2Icon,
  TrendingUpIcon,
  TruckIcon,
  UserIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { DataTable, type Column } from '../../components/data/DataTable';
import { Pagination } from '../../components/data/Pagination';
import { Toolbar } from '../../components/data/Toolbar';
import { ParcelTagModal } from '../../components/modals/ParcelTagModal';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { DateInput } from '../../components/ui/Inputs';
import { SelectField, TextAreaField, TextField } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { Panel } from '../../components/ui/Panel';
import { EmptyState, ErrorState, SkeletonTable } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { ShiftOpenModal } from '../../components/modals/ShiftOpenModal';
import { useAsync, errorMessage } from '../../hooks/useAsync';
import { usePaginated } from '../../hooks/usePaginated';
import { hasActiveShift, recordParcelToActiveShift } from '../../services/reconciliations';
import {
  createParcel,
  deleteParcel,
  listParcels,
  updateParcel,
  type ParcelDetail,
} from '../../services/operations';
import { getActiveTerminals } from '../../services/trips';
import { formatDateTime, money, toDateInput } from '../../utils/format';

const presets = [
  { label: 'Today', days: 1 },
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function shiftDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - (days - 1));
  return toDateInput(date);
}

const statusOptions = [
  { value: 'received', label: 'Received at Station Desk' },
  { value: 'in_transit', label: 'In Coach Cargo Bay' },
  { value: 'arrived', label: 'Arrived at Destination Hub' },
  { value: 'delivered', label: 'Collected by Recipient' },
  { value: 'lost', label: 'Reported Lost / Damaged' },
];

export function ParcelsScreen() {
  const [selectedTag, setSelectedTag] = useState<ParcelDetail | null>(null);
  const [deleting, setDeleting] = useState<ParcelDetail | null>(null);
  const [deletePending, setDeletePending] = useState(false);

  // Add Parcel State
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    sender_name: '',
    sender_phone: '',
    recipient_name: '',
    recipient_phone: '',
    origin_terminal_id: '',
    destination_terminal_id: '',
    weight_kg: '5.0',
    price: '15000',
    payment_method: 'cash',
    description: '',
    notes: '',
  });
  const [addErrors, setAddErrors] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [openShiftModal, setOpenShiftModal] = useState(false);

  // Edit Parcel State
  const [editingItem, setEditingItem] = useState<ParcelDetail | null>(null);
  const [editForm, setEditForm] = useState({
    sender_name: '',
    sender_phone: '',
    recipient_name: '',
    recipient_phone: '',
    origin_terminal_id: '',
    destination_terminal_id: '',
    weight_kg: '',
    price: '',
    status: 'received' as ParcelDetail['status'],
    description: '',
    notes: '',
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [editPending, setEditPending] = useState(false);

  // Terminal Reference Data
  const terminals = useAsync(() => getActiveTerminals(), []);

  // Date Range State
  const [range, setRange] = useState({
    date_from: shiftDays(30),
    date_to: toDateInput(new Date()),
  });
  const [applied, setApplied] = useState(range);

  // Paginated Parcels State
  const state = usePaginated<ParcelDetail>(({ page, perPage, search, filters }) =>
    listParcels({
      page,
      perPage,
      search,
      status: filters.status,
      date_from: applied.date_from,
      date_to: applied.date_to,
    })
  );

  React.useEffect(() => {
    state.reload();
  }, [applied.date_from, applied.date_to]);

  const terminalOptions = useMemo(() => {
    if (!terminals.data) return [];
    return terminals.data.map((t) => ({
      value: String(t.id),
      label: `${t.city} — ${t.name}`,
    }));
  }, [terminals.data]);

  // Set default terminals when data loads
  React.useEffect(() => {
    if (terminalOptions.length >= 2 && !addForm.origin_terminal_id) {
      setAddForm((prev) => ({
        ...prev,
        origin_terminal_id: terminalOptions[0]?.value || '',
        destination_terminal_id: terminalOptions[1]?.value || '',
      }));
    }
  }, [terminalOptions]);

  // Operational & Financial Metrics
  const metrics = useMemo(() => {
    const rows = state.rows;
    const totalVolume = rows.reduce((acc, r) => acc + (r.price || 0), 0);
    const receivedCount = rows.filter((r) => r.status === 'received').length;
    const inTransitCount = rows.filter((r) => r.status === 'in_transit' || r.status === 'arrived').length;
    const deliveredCount = rows.filter((r) => r.status === 'delivered').length;

    return {
      totalVolume,
      totalCount: state.meta.total || rows.length,
      receivedCount,
      inTransitCount,
      deliveredCount,
    };
  }, [state.rows, state.meta.total]);

  // Auto calculate freight price based on weight
  const handleWeightChange = (rawWeight: string, isEdit = false) => {
    const num = parseFloat(rawWeight);
    const calculatedFee = !isNaN(num) && num > 0 ? Math.max(10000, Math.round(num * 2500)) : 10000;

    if (isEdit) {
      setEditForm((prev) => ({
        ...prev,
        weight_kg: rawWeight,
        price: String(calculatedFee),
      }));
    } else {
      setAddForm((prev) => ({
        ...prev,
        weight_kg: rawWeight,
        price: String(calculatedFee),
      }));
    }
  };

  const submitAddParcel = async (event: React.FormEvent) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!addForm.sender_name.trim()) errors.sender_name = 'Sender name is required.';
    if (!addForm.sender_phone.trim()) errors.sender_phone = 'Sender phone number is required.';
    if (!addForm.recipient_name.trim()) errors.recipient_name = 'Recipient name is required.';
    if (!addForm.recipient_phone.trim()) errors.recipient_phone = 'Recipient phone is required.';
    if (!addForm.origin_terminal_id) errors.origin_terminal_id = 'Select origin station.';
    if (!addForm.destination_terminal_id) errors.destination_terminal_id = 'Select destination hub.';
    if (addForm.origin_terminal_id === addForm.destination_terminal_id) {
      errors.destination_terminal_id = 'Origin and destination hubs must be different.';
    }
    const weight = parseFloat(addForm.weight_kg);
    if (!addForm.weight_kg || isNaN(weight) || weight <= 0) {
      errors.weight_kg = 'Enter valid scale weight.';
    }
    const price = parseFloat(addForm.price);
    if (!addForm.price || isNaN(price) || price <= 0) {
      errors.price = 'Enter valid freight price.';
    }
    if (!addForm.description.trim()) {
      errors.description = 'Describe parcel contents and packaging.';
    }

    setAddErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const isCash = addForm.payment_method === 'cash' || !addForm.payment_method;
    if (isCash && !hasActiveShift()) {
      toast.error('Cash Drawer is Closed! You must open your shift float to collect cash, or choose MTN MoMo / Airtel / Card payment.');
      setOpenShiftModal(true);
      return;
    }

    setAdding(true);
    try {
      const created = await createParcel({
        sender_name: addForm.sender_name.trim(),
        sender_phone: addForm.sender_phone.trim(),
        recipient_name: addForm.recipient_name.trim(),
        recipient_phone: addForm.recipient_phone.trim(),
        origin_terminal_id: Number(addForm.origin_terminal_id),
        destination_terminal_id: Number(addForm.destination_terminal_id),
        weight_kg: weight,
        price: price,
        status: 'received',
        description: addForm.description.trim(),
        notes: addForm.notes.trim(),
      });

      recordParcelToActiveShift({
        amount: price,
        payment_method: addForm.payment_method || 'cash',
      });

      toast.success(`Waybill #${created.tracking_number} issued. Freight of ${money(price)} collected & logged to Payments.`);
      setAddOpen(false);
      setAddForm({
        sender_name: '',
        sender_phone: '',
        recipient_name: '',
        recipient_phone: '',
        origin_terminal_id: terminalOptions[0]?.value || '',
        destination_terminal_id: terminalOptions[1]?.value || '',
        weight_kg: '5.0',
        price: '15000',
        payment_method: 'cash',
        description: '',
        notes: '',
      });
      setSelectedTag(created);
      state.reload();
    } catch (error) {
      setAddErrors({ description: errorMessage(error) });
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (parcel: ParcelDetail) => {
    setEditingItem(parcel);
    setEditForm({
      sender_name: parcel.sender_name,
      sender_phone: parcel.sender_phone,
      recipient_name: parcel.recipient_name,
      recipient_phone: parcel.recipient_phone,
      origin_terminal_id: String(parcel.origin_terminal_id),
      destination_terminal_id: String(parcel.destination_terminal_id),
      weight_kg: String(parcel.weight_kg),
      price: String(parcel.price),
      status: parcel.status,
      description: parcel.description,
      notes: parcel.notes || '',
    });
    setEditErrors({});
  };

  const submitEditParcel = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingItem) return;
    const errors: Record<string, string> = {};
    if (!editForm.sender_name.trim()) errors.sender_name = 'Sender name is required.';
    if (!editForm.recipient_name.trim()) errors.recipient_name = 'Recipient name is required.';
    const weight = parseFloat(editForm.weight_kg);
    if (!editForm.weight_kg || isNaN(weight) || weight <= 0) errors.weight_kg = 'Valid weight required.';
    const price = parseFloat(editForm.price);
    if (!editForm.price || isNaN(price) || price <= 0) errors.price = 'Valid price required.';
    if (!editForm.description.trim()) errors.description = 'Description is required.';

    setEditErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setEditPending(true);
    try {
      await updateParcel(editingItem.id, {
        sender_name: editForm.sender_name.trim(),
        sender_phone: editForm.sender_phone.trim(),
        recipient_name: editForm.recipient_name.trim(),
        recipient_phone: editForm.recipient_phone.trim(),
        origin_terminal_id: Number(editForm.origin_terminal_id),
        destination_terminal_id: Number(editForm.destination_terminal_id),
        weight_kg: weight,
        price: price,
        status: editForm.status,
        description: editForm.description.trim(),
        notes: editForm.notes.trim(),
      });
      toast.success(`Waybill #${editingItem.tracking_number} updated successfully.`);
      setEditingItem(null);
      state.reload();
    } catch (error) {
      setEditErrors({ description: errorMessage(error) });
    } finally {
      setEditPending(false);
    }
  };

  const handleQuickStatusChange = async (parcel: ParcelDetail, nextStatus: ParcelDetail['status']) => {
    try {
      await updateParcel(parcel.id, {
        sender_name: parcel.sender_name,
        sender_phone: parcel.sender_phone,
        recipient_name: parcel.recipient_name,
        recipient_phone: parcel.recipient_phone,
        origin_terminal_id: parcel.origin_terminal_id,
        destination_terminal_id: parcel.destination_terminal_id,
        weight_kg: parcel.weight_kg,
        price: parcel.price,
        description: parcel.description,
        notes: parcel.notes || '',
        status: nextStatus,
      });
      toast.success(`Waybill #${parcel.tracking_number} status updated to ${nextStatus.toUpperCase()}`);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setDeletePending(true);
    try {
      await deleteParcel(deleting.id);
      toast.success(`Waybill #${deleting.tracking_number} removed.`);
      setDeleting(null);
      state.reload();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeletePending(false);
    }
  };

  const handleExportCsv = () => {
    if (!state.rows.length) {
      toast.error('No parcel shipments to export');
      return;
    }
    const headers = [
      'Waybill Tracking #',
      'Origin Station',
      'Destination Hub',
      'Sender Name',
      'Sender Phone',
      'Recipient Name',
      'Recipient Phone',
      'Weight (kg)',
      'Freight Fee (UGX)',
      'Status',
      'Accepted Date',
    ];

    const csvRows = state.rows.map((p) => [
      `"${p.tracking_number}"`,
      `"${p.origin_city}"`,
      `"${p.destination_city}"`,
      `"${p.sender_name}"`,
      `"${p.sender_phone}"`,
      `"${p.recipient_name}"`,
      `"${p.recipient_phone}"`,
      p.weight_kg,
      p.price,
      `"${p.status}"`,
      `"${p.created_at}"`,
    ]);

    const csvContent = [headers.join(','), ...csvRows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `linkbus_freight_manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Parcel manifest exported to CSV');
  };

  const columns: Column<ParcelDetail>[] = [
    {
      key: 'tracking',
      header: 'Waybill Tracking #',
      render: (parcel) => (
        <div className="py-1">
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line shadow-sm">
            <PackageIcon className="h-3 w-3 text-brand-600" />
            {parcel.tracking_number}
          </span>
          <p className="text-[0.6875rem] text-muted mt-0.5">
            {formatDateTime(parcel.created_at)}
          </p>
        </div>
      ),
    },
    {
      key: 'route',
      header: 'Corridor & Stations',
      render: (parcel) => (
        <div>
          <span className="font-bold text-fg text-xs">
            {parcel.origin_city} ➔ {parcel.destination_city}
          </span>
          <p className="text-[0.6875rem] text-muted truncate max-w-[180px]">
            {parcel.description}
          </p>
        </div>
      ),
    },
    {
      key: 'sender',
      header: 'Sender Details',
      hideBelow: 'sm',
      render: (parcel) => (
        <div>
          <p className="font-bold text-fg text-xs">{parcel.sender_name}</p>
          <a
            href={`tel:${parcel.sender_phone}`}
            className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-muted hover:text-brand-600"
          >
            <PhoneIcon className="h-2.5 w-2.5" />
            {parcel.sender_phone}
          </a>
        </div>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient & PIN',
      hideBelow: 'md',
      render: (parcel) => (
        <div>
          <p className="font-bold text-fg text-xs">{parcel.recipient_name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <a
              href={`tel:${parcel.recipient_phone}`}
              className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-brand-600 dark:text-brand-400 hover:underline"
            >
              <PhoneIcon className="h-2.5 w-2.5" />
              {parcel.recipient_phone}
            </a>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/30 px-1 py-0.2 text-[0.5625rem] font-bold text-emerald-800 dark:text-emerald-300">
              SMS PIN
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'weight',
      header: 'Scale Weight',
      align: 'right',
      hideBelow: 'sm',
      render: (parcel) => (
        <span className="tabular-nums font-extrabold text-fg text-xs">
          {parcel.weight_kg} kg
        </span>
      ),
    },
    {
      key: 'price',
      header: 'Freight Fee',
      align: 'right',
      render: (parcel) => (
        <div className="text-right">
          <span className="font-extrabold tabular-nums text-fg text-sm">
            {money(parcel.price)}
          </span>
          <span className="block text-[0.625rem] font-bold text-emerald-600 dark:text-emerald-400">
            ✓ Paid
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Delivery Status',
      render: (parcel) => <StatusPill status={parcel.status} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (parcel) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PrinterIcon className="h-3.5 w-3.5" />}
            onClick={() => setSelectedTag(parcel)}
          >
            Tag Slip
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="text-xs"
            icon={<PencilIcon className="h-3.5 w-3.5" />}
            onClick={() => openEditModal(parcel)}
          >
            Edit
          </Button>

          <select
            aria-label={`Status for ${parcel.tracking_number}`}
            value={parcel.status}
            onChange={(event) =>
              handleQuickStatusChange(parcel, event.target.value as ParcelDetail['status'])
            }
            className="field !h-8 w-auto text-xs font-semibold"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setDeleting(parcel)}
            aria-label={`Remove ${parcel.tracking_number}`}
            className="rounded-lg p-1.5 text-muted transition-colors hover:bg-red-500/15 hover:text-red-600"
          >
            <Trash2Icon className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ),
    },
  ];

  const renderMobileParcelCard = (parcel: ParcelDetail) => {
    return (
      <div className="p-4 bg-surface hover:bg-surface-2/60 transition-colors space-y-3">
        {/* Top row: Tracking #, Date, Status */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 font-mono text-xs font-black text-fg bg-surface-2 px-2 py-0.5 rounded-md border border-line">
              <PackageIcon className="h-3 w-3 text-brand-600" />
              #{parcel.tracking_number}
            </span>
            <span className="text-[0.6875rem] text-muted">{formatDateTime(parcel.created_at)}</span>
          </div>
          <StatusPill status={parcel.status} />
        </div>

        {/* Corridor */}
        <div className="rounded-xl bg-surface-2/80 p-2.5 border border-line/60">
          <div className="flex items-center gap-1.5 font-bold text-sm text-fg">
            <span>{parcel.origin_city}</span>
            <span className="text-brand-600 font-extrabold">➔</span>
            <span>{parcel.destination_city}</span>
          </div>
          {parcel.description && (
            <p className="text-xs text-muted truncate mt-0.5">{parcel.description}</p>
          )}
        </div>

        {/* Sender & Recipient */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg border border-line bg-surface p-2">
            <span className="text-[0.625rem] text-muted block">Sender</span>
            <p className="font-bold text-fg truncate">{parcel.sender_name}</p>
            {parcel.sender_phone && (
              <a href={`tel:${parcel.sender_phone}`} className="text-[0.6875rem] font-mono text-muted hover:text-brand-600 block">
                {parcel.sender_phone}
              </a>
            )}
          </div>
          <div className="rounded-lg border border-line bg-surface p-2">
            <span className="text-[0.625rem] text-muted block">Recipient</span>
            <p className="font-bold text-fg truncate">{parcel.recipient_name}</p>
            {parcel.recipient_phone && (
              <a href={`tel:${parcel.recipient_phone}`} className="text-[0.6875rem] font-mono text-brand-600 dark:text-brand-400 hover:underline block">
                {parcel.recipient_phone}
              </a>
            )}
          </div>
        </div>

        {/* Weight & Price */}
        <div className="flex items-center justify-between pt-1 border-t border-line/40 text-xs">
          <span className="text-muted">Weight: <strong className="text-fg font-extrabold">{parcel.weight_kg} kg</strong></span>
          <span className="font-extrabold text-sm tabular-nums text-fg">{money(parcel.price)}</span>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t border-line/50">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[38px] text-xs font-bold"
            icon={<PrinterIcon className="h-3.5 w-3.5 text-brand-600" />}
            onClick={() => setSelectedTag(parcel)}
          >
            Waybill Tag
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="flex-1 min-h-[38px] text-xs font-bold"
            icon={<PencilIcon className="h-3.5 w-3.5 text-amber-600" />}
            onClick={() => openEditModal(parcel)}
          >
            Edit
          </Button>

          <select
            aria-label={`Status for parcel ${parcel.tracking_number}`}
            value={parcel.status}
            onChange={(event) =>
              handleQuickStatusChange(parcel, event.target.value as ParcelDetail['status'])
            }
            className="field !h-[38px] w-auto text-xs font-semibold"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setDeleting(parcel)}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 p-2 text-xs font-bold text-red-600 hover:bg-red-500/20 active:scale-95 transition-all"
          >
            <Trash2Icon className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  };

  if (terminals.loading) {
    return (
      <Panel bodyClassName="">
        <SkeletonTable rows={8} columns={6} />
      </Panel>
    );
  }

  if (terminals.error || !terminals.data) {
    return (
      <Panel>
        <ErrorState
          message={terminals.error ?? 'Terminals could not be loaded.'}
          onRetry={terminals.reload}
        />
      </Panel>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">
            Same-Day Courier &amp; Freight Logistics
          </h1>
          <p className="text-xs text-muted">
            Live tracking of regional freight consignments, automatic recipient SMS pickup PINs, and freight fee revenue.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            icon={<FileSpreadsheetIcon className="h-4 w-4" />}
            onClick={handleExportCsv}
          >
            Export Manifest CSV
          </Button>
          <Button
            icon={<PlusIcon className="h-4 w-4" />}
            onClick={() => setAddOpen(true)}
          >
            + Accept &amp; Tag New Parcel
          </Button>
        </div>
      </div>

      {/* ── Financial & Operational KPI Scorecards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Gross Freight Volume */}
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white font-bold">
              <TrendingUpIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 uppercase tracking-wider">
              Freight Takings
            </span>
          </div>
          <p className="mt-2 font-extrabold text-2xl text-emerald-950 dark:text-emerald-100 tabular-nums">
            {money(metrics.totalVolume)}
          </p>
          <p className="text-[0.6875rem] text-emerald-800 dark:text-emerald-300">
            Total courier fee revenue on active ledger
          </p>
        </div>

        {/* Accepted at Station Desk */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <PackageCheckIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Accepted at Desk</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.receivedCount} Packages
          </p>
          <p className="text-[0.6875rem] text-muted">
            Staged at station awaiting coach dispatch
          </p>
        </div>

        {/* In Transit En Route */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <TruckIcon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">In Transit &amp; Hubs</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.inTransitCount} Shipments
          </p>
          <p className="text-[0.6875rem] text-muted">
            En route in coach bays or at destination hub
          </p>
        </div>

        {/* Claimed & Delivered */}
        <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="h-4 w-4" />
            </span>
            <span className="text-xs font-bold text-fg">Delivered &amp; Paid</span>
          </div>
          <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
            {metrics.deliveredCount} Consignments
          </p>
          <p className="text-[0.6875rem] text-muted">
            Verified with recipient SMS PIN
          </p>
        </div>
      </div>

      {/* ── Unified Date Range Filter Toolbar ── */}
      <div className="rounded-2xl border border-line bg-surface p-3.5 sm:p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs font-bold uppercase tracking-wider text-muted hidden sm:inline-block">
              Presets:
            </span>
            {presets.map((preset) => {
              const active =
                applied.date_from === shiftDays(preset.days) &&
                applied.date_to === toDateInput(new Date());
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    const next = {
                      date_from: shiftDays(preset.days),
                      date_to: toDateInput(new Date()),
                    };
                    setRange(next);
                    setApplied(next);
                  }}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                    active
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'border border-line bg-surface text-muted hover:bg-surface-2 hover:text-fg'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">From</span>
              <DateInput
                id="parcel-from"
                value={range.date_from}
                max={range.date_to}
                onChange={(e) => setRange({ ...range, date_from: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted">To</span>
              <DateInput
                id="parcel-to"
                value={range.date_to}
                min={range.date_from}
                max={toDateInput(new Date())}
                onChange={(e) => setRange({ ...range, date_to: e.target.value })}
              />
            </div>
            <Button
              size="sm"
              onClick={() => setApplied(range)}
              loading={state.loading}
            >
              Apply Filter
            </Button>
          </div>
        </div>
      </div>

      {/* ── Parcels Data Table ── */}
      <Panel bodyClassName="">
        <Toolbar
          search={state.search}
          onSearch={state.setSearch}
          searchPlaceholder="Search waybill #, sender, recipient, phone or city..."
          filters={[
            {
              key: 'status',
              label: 'Any status',
              options: statusOptions,
            },
          ]}
          values={state.filters}
          onFilter={state.setFilter}
          onClear={state.clearFilters}
          activeFilterCount={state.activeFilterCount}
        />
        <DataTable<ParcelDetail>
          columns={columns}
          rows={state.rows}
          rowKey={(parcel) => parcel.id}
          loading={state.loading}
          error={state.error}
          onRetry={state.reload}
          caption="Courier Shipments"
          mobileCardRender={renderMobileParcelCard}
          empty={
            <EmptyState
              icon={<PackageIcon className="h-6 w-6 text-brand-600" aria-hidden />}
              title={
                state.activeFilterCount > 0
                  ? 'No packages match those filters'
                  : 'No courier shipments recorded yet'
              }
              body={
                state.activeFilterCount > 0
                  ? 'Try clearing the search query or status filter.'
                  : 'Accept a parcel at the station freight desk to issue an official waybill.'
              }
              action={
                state.activeFilterCount > 0 ? (
                  <Button variant="outline" onClick={state.clearFilters}>
                    Clear filters
                  </Button>
                ) : undefined
              }
            />
          }
        />
        <Pagination meta={state.meta} onPageChange={state.setPage} onPerPageChange={state.setPerPage} label="parcels" />
      </Panel>

      {/* ── Accept & Tag New Parcel Modal ── */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Accept &amp; Dispatch New Parcel"
        subtitle="Issue official courier waybill tag with automated recipient SMS PIN"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button type="submit" form="add-parcel-form" loading={adding}>
              Accept Parcel &amp; Generate Waybill
            </Button>
          </>
        }
      >
        <form id="add-parcel-form" onSubmit={submitAddParcel} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="parcel-sender-name"
              label="Sender Full Name"
              required
              placeholder="e.g. Samuel Kigozi"
              value={addForm.sender_name}
              error={addErrors.sender_name}
              onChange={(e) => setAddForm({ ...addForm, sender_name: e.target.value })}
            />
            <TextField
              id="parcel-sender-phone"
              label="Sender Phone Number"
              type="tel"
              required
              placeholder="0772 123456"
              value={addForm.sender_phone}
              error={addErrors.sender_phone}
              onChange={(e) => setAddForm({ ...addForm, sender_phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="parcel-recipient-name"
              label="Recipient Full Name"
              required
              placeholder="e.g. Agnes Atuhaire"
              value={addForm.recipient_name}
              error={addErrors.recipient_name}
              onChange={(e) => setAddForm({ ...addForm, recipient_name: e.target.value })}
            />
            <TextField
              id="parcel-recipient-phone"
              label="Recipient Phone (For SMS Pickup PIN)"
              type="tel"
              required
              placeholder="0701 987654"
              value={addForm.recipient_phone}
              error={addErrors.recipient_phone}
              hint="Recipient automatically receives SMS with tracking # and secret pickup PIN."
              onChange={(e) => setAddForm({ ...addForm, recipient_phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="parcel-origin-terminal"
              label="Origin Station (Acceptance Desk)"
              required
              value={addForm.origin_terminal_id}
              error={addErrors.origin_terminal_id}
              options={terminalOptions}
              onChange={(e) => setAddForm({ ...addForm, origin_terminal_id: e.target.value })}
            />
            <SelectField
              id="parcel-dest-terminal"
              label="Destination Hub (Pickup Terminal)"
              required
              value={addForm.destination_terminal_id}
              error={addErrors.destination_terminal_id}
              options={terminalOptions}
              onChange={(e) => setAddForm({ ...addForm, destination_terminal_id: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="parcel-weight"
              label="Scale Weight (kg)"
              type="number"
              step="0.1"
              min={0}
              required
              placeholder="e.g. 5.5"
              value={addForm.weight_kg}
              error={addErrors.weight_kg}
              onChange={(e) => handleWeightChange(e.target.value, false)}
            />
            <TextField
              id="parcel-price"
              label="Freight Fee (UGX)"
              type="number"
              min={0}
              required
              placeholder="e.g. 15000"
              value={addForm.price}
              error={addErrors.price}
              onChange={(e) => setAddForm({ ...addForm, price: e.target.value })}
            />
            <SelectField
              id="parcel-payment-method"
              label="Payment Method"
              value={addForm.payment_method}
              options={[
                { value: 'cash', label: 'Station Cash (Till)' },
                { value: 'mtn_mobile_money', label: 'MTN Mobile Money (Direct Gateway)' },
                { value: 'airtel_money', label: 'Airtel Money (Direct Gateway)' },
                { value: 'card', label: 'Visa / POS Card (Electronic)' },
              ]}
              onChange={(e) => setAddForm({ ...addForm, payment_method: e.target.value })}
            />
          </div>

          {(addForm.payment_method === 'cash' || !addForm.payment_method) && !hasActiveShift() ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 rounded-lg border border-rose-500/40 bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-bold">🔒 Cash shift is closed:</span>
                <span>Open float or select Mobile Money / Card above.</span>
              </div>
              <Button
                size="sm"
                type="button"
                variant="outline"
                className="text-xs bg-surface text-rose-700 dark:text-rose-300 border-rose-300 shrink-0 font-bold"
                onClick={() => setOpenShiftModal(true)}
              >
                Open Float Now
              </Button>
            </div>
          ) : addForm.payment_method !== 'cash' ? (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs">
              <CheckCircle2Icon className="h-4 w-4 text-emerald-600 shrink-0" />
              <span><strong>Digital Settlement:</strong> Waybill fees can be collected electronically even if the physical till is closed.</span>
            </div>
          ) : null}

          <TextAreaField
            id="parcel-description"
            label="Package Description & Contents"
            required
            placeholder="e.g. Sealed carton containing electrical spares and accessories"
            value={addForm.description}
            error={addErrors.description}
            onChange={(e) => setAddForm({ ...addForm, description: e.target.value })}
          />

          <TextAreaField
            id="parcel-notes"
            label="Handling & Fragile Instructions (Optional)"
            placeholder="e.g. Fragile glassware, keep upright in coach bay"
            value={addForm.notes}
            onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* ── Edit Parcel Modal ── */}
      <Modal
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title="Edit Courier Waybill Record"
        subtitle={editingItem ? `Waybill #${editingItem.tracking_number}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setEditingItem(null)} disabled={editPending}>
              Cancel
            </Button>
            <Button type="submit" form="edit-parcel-form" loading={editPending}>
              Save &amp; Update Waybill
            </Button>
          </>
        }
      >
        <form id="edit-parcel-form" onSubmit={submitEditParcel} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-parcel-sender-name"
              label="Sender Full Name"
              required
              value={editForm.sender_name}
              error={editErrors.sender_name}
              onChange={(e) => setEditForm({ ...editForm, sender_name: e.target.value })}
            />
            <TextField
              id="edit-parcel-sender-phone"
              label="Sender Phone Number"
              type="tel"
              required
              value={editForm.sender_phone}
              error={editErrors.sender_phone}
              onChange={(e) => setEditForm({ ...editForm, sender_phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              id="edit-parcel-recipient-name"
              label="Recipient Full Name"
              required
              value={editForm.recipient_name}
              error={editErrors.recipient_name}
              onChange={(e) => setEditForm({ ...editForm, recipient_name: e.target.value })}
            />
            <TextField
              id="edit-parcel-recipient-phone"
              label="Recipient Phone Number"
              type="tel"
              required
              value={editForm.recipient_phone}
              error={editErrors.recipient_phone}
              onChange={(e) => setEditForm({ ...editForm, recipient_phone: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="edit-parcel-origin"
              label="Origin Station"
              value={editForm.origin_terminal_id}
              options={terminalOptions}
              onChange={(e) => setEditForm({ ...editForm, origin_terminal_id: e.target.value })}
            />
            <SelectField
              id="edit-parcel-dest"
              label="Destination Hub"
              value={editForm.destination_terminal_id}
              options={terminalOptions}
              onChange={(e) => setEditForm({ ...editForm, destination_terminal_id: e.target.value })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <TextField
              id="edit-parcel-weight"
              label="Scale Weight (kg)"
              type="number"
              step="0.1"
              min={0}
              required
              value={editForm.weight_kg}
              error={editErrors.weight_kg}
              onChange={(e) => handleWeightChange(e.target.value, true)}
            />
            <TextField
              id="edit-parcel-price"
              label="Freight Fee (UGX)"
              type="number"
              min={0}
              required
              value={editForm.price}
              error={editErrors.price}
              onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
            />
            <SelectField
              id="edit-parcel-status"
              label="Courier Status"
              value={editForm.status}
              options={statusOptions}
              onChange={(e) => setEditForm({ ...editForm, status: e.target.value as ParcelDetail['status'] })}
            />
          </div>

          <TextAreaField
            id="edit-parcel-description"
            label="Package Description"
            required
            value={editForm.description}
            error={editErrors.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          />

          <TextAreaField
            id="edit-parcel-notes"
            label="Handling Instructions"
            value={editForm.notes}
            onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
          />
        </form>
      </Modal>

      {/* ── Printable Waybill Tag Modal ── */}
      <ParcelTagModal
        item={selectedTag}
        open={Boolean(selectedTag)}
        onClose={() => setSelectedTag(null)}
      />

      {/* ── Delete Confirmation Dialog ── */}
      <ConfirmDialog
        open={Boolean(deleting)}
        title="Remove this courier waybill?"
        consequence={
          deleting
            ? `Waybill #${deleting.tracking_number} for ${deleting.sender_name} ➔ ${deleting.recipient_name} will be permanently removed. Senders and recipients will no longer be able to track it.`
            : ''
        }
        confirmLabel="Remove Record"
        pending={deletePending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />

      <ShiftOpenModal
        open={openShiftModal}
        onClose={() => setOpenShiftModal(false)}
        onSuccess={() => {
          setOpenShiftModal(false);
          toast.success('Duty shift float opened successfully.');
        }}
      />
    </div>
  );
}