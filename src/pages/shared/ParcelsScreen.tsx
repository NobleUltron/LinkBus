import React, { useState } from 'react';
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  ExternalLinkIcon,
  MapPinIcon,
  PackageCheckIcon,
  PackageIcon,
  PhoneIcon,
  PrinterIcon,
  ScaleIcon,
  TruckIcon,
  UserIcon,
} from 'lucide-react';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ParcelTagModal } from '../../components/modals/ParcelTagModal';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Panel';
import { ErrorState, SkeletonTable } from '../../components/ui/States';
import { StatusPill } from '../../components/ui/StatusPill';
import { useAsync } from '../../hooks/useAsync';
import {
  createParcel,
  deleteParcel,
  listParcels,
  updateParcel,
  type ParcelDetail,
} from '../../services/operations';
import { getActiveTerminals } from '../../services/trips';
import { formatDate, money } from '../../utils/format';

const statusOptions = [
  { value: 'received', label: 'Received at Station Desk' },
  { value: 'in_transit', label: 'In Coach Cargo Bay' },
  { value: 'arrived', label: 'Arrived at Destination Station' },
  { value: 'delivered', label: 'Collected by Recipient' },
  { value: 'lost', label: 'Reported Lost / Damaged' },
];

export function ParcelsScreen() {
  const [selectedTag, setSelectedTag] = useState<ParcelDetail | null>(null);
  const terminals = useAsync(() => getActiveTerminals(), []);

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

  const terminalOptions = terminals.data.map((terminal) => ({
    value: String(terminal.id),
    label: `${terminal.city} — ${terminal.name}`,
  }));

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
            Accepted {formatDate(parcel.created_at)}
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
      header: 'Recipient Details',
      hideBelow: 'md',
      render: (parcel) => (
        <div>
          <p className="font-bold text-fg text-xs">{parcel.recipient_name}</p>
          <a
            href={`tel:${parcel.recipient_phone}`}
            className="inline-flex items-center gap-1 font-mono text-[0.6875rem] text-brand-600 dark:text-brand-400 hover:underline"
          >
            <PhoneIcon className="h-2.5 w-2.5" />
            {parcel.recipient_phone}
          </a>
        </div>
      ),
    },
    {
      key: 'weight',
      header: 'Weight',
      align: 'right',
      hideBelow: 'sm',
      render: (parcel) => (
        <span className="tabular-nums font-bold text-fg text-xs">
          {parcel.weight_kg} kg
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Tracking Status',
      render: (parcel) => <StatusPill status={parcel.status} />,
    },
    {
      key: 'price',
      header: 'Freight Fee',
      align: 'right',
      render: (parcel) => (
        <span className="font-extrabold tabular-nums text-fg text-xs">
          {money(parcel.price)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (parcel) => (
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          icon={<PrinterIcon className="h-3.5 w-3.5" />}
          onClick={() => setSelectedTag(parcel)}
        >
          Tag Slip
        </Button>
      ),
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'sender_name',
      label: 'Sender Full Name',
      required: true,
      placeholder: 'e.g. Samuel Kigozi',
    },
    {
      name: 'sender_phone',
      label: 'Sender Phone Number',
      type: 'tel',
      required: true,
      placeholder: '0772 123456',
    },
    {
      name: 'recipient_name',
      label: 'Recipient Full Name',
      required: true,
      placeholder: 'e.g. Agnes Atuhaire',
    },
    {
      name: 'recipient_phone',
      label: 'Recipient Phone Number (SMS Notification)',
      type: 'tel',
      required: true,
      placeholder: '0701 987654',
      hint: 'Recipient receives an automated SMS with pickup PIN once parcel arrives at destination station.',
    },
    {
      name: 'origin_terminal_id',
      label: 'Origin Acceptance Station',
      type: 'select',
      options: terminalOptions,
      required: true,
    },
    {
      name: 'destination_terminal_id',
      label: 'Destination Station (Pickup Hub)',
      type: 'select',
      options: terminalOptions,
      required: true,
    },
    {
      name: 'weight_kg',
      label: 'Package Weight (kg)',
      type: 'number',
      step: '0.1',
      min: 0,
      required: true,
      placeholder: 'e.g. 5.5',
    },
    {
      name: 'price',
      label: 'Freight Fee (UGX)',
      type: 'number',
      min: 0,
      required: true,
      placeholder: 'e.g. 15000',
      hint: 'Standard freight fee collected at the parcel counter.',
    },
    {
      name: 'status',
      label: 'Delivery Status',
      type: 'select',
      options: statusOptions,
      required: true,
    },
    {
      name: 'description',
      label: 'Package Contents & Dimensions',
      type: 'textarea',
      required: true,
      placeholder: 'e.g. Sealed cardboard box with spare automotive parts',
      span: 2,
    },
    {
      name: 'notes',
      label: 'Handling & Fragile Instructions',
      type: 'textarea',
      placeholder: 'e.g. Do not stack heavy luggage on top, contains electronics',
      span: 2,
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    sender_name: String(values.sender_name),
    sender_phone: String(values.sender_phone),
    recipient_name: String(values.recipient_name),
    recipient_phone: String(values.recipient_phone),
    origin_terminal_id: Number(values.origin_terminal_id),
    destination_terminal_id: Number(values.destination_terminal_id),
    weight_kg: Number(values.weight_kg),
    price: Number(values.price),
    status: String(values.status) as ParcelDetail['status'],
    description: String(values.description),
    notes: String(values.notes ?? ''),
  });

  return (
    <>
      <ResourceScreen<ParcelDetail>
        title="Same-Day Courier & Parcels"
        subtitle="Track freight shipments moving between regional terminals with automated recipient SMS pickup PINs."
        singular="Parcel"
        plural="Parcels"
        searchPlaceholder="Search tracking number, sender, recipient or city…"
        emptyTitle="No parcels registered"
        emptyBody="Accept a parcel at the freight counter to generate an automated tracking number."
        columns={columns}
        fields={fields}
        filters={[
          {
            key: 'status',
            label: 'Any status',
            options: statusOptions,
          },
        ]}
        load={({ page, perPage, search, filters }) =>
          listParcels({
            page,
            perPage,
            search,
            status: filters.status,
            date: filters.date,
            date_from: filters.date_from,
            date_to: filters.date_to,
          })
        }
        withDateRange={true}
        renderCards={({ rows, meta }) => {
          const totalCount = meta.total || rows.length;
          const received = rows.filter((p) => p.status === 'received');
          const inTransit = rows.filter((p) => p.status === 'in_transit' || p.status === 'arrived');
          const delivered = rows.filter((p) => p.status === 'delivered');

          return (
            <>
              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <PackageIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-fg">Total Parcels</span>
                </div>
                <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                  {totalCount.toLocaleString()}
                </p>
                <p className="text-[0.6875rem] text-muted">All Courier Waybills</p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                    <PackageCheckIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-fg">Accepted / Desk</span>
                </div>
                <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                  {received.length.toLocaleString()}
                </p>
                <p className="text-[0.6875rem] text-muted">Awaiting Coach Dispatch</p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                    <TruckIcon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-fg">In Transit &amp; Hub</span>
                </div>
                <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                  {inTransit.length.toLocaleString()}
                </p>
                <p className="text-[0.6875rem] text-muted">En Route / At Terminal</p>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-4 shadow-sm hover-lift transition-all">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2Icon className="h-4 w-4" />
                  </span>
                  <span className="text-xs font-bold text-fg">Delivered &amp; Paid</span>
                </div>
                <p className="mt-2 font-extrabold text-xl text-fg tabular-nums">
                  {delivered.length.toLocaleString()}
                </p>
                <p className="text-[0.6875rem] text-muted">Collected by Recipient</p>
              </div>
            </>
          );
        }}
        toFormValues={(parcel) => ({
          sender_name: parcel?.sender_name ?? '',
          sender_phone: parcel?.sender_phone ?? '',
          recipient_name: parcel?.recipient_name ?? '',
          recipient_phone: parcel?.recipient_phone ?? '',
          origin_terminal_id: String(
            parcel?.origin_terminal_id ?? terminalOptions[0]?.value ?? ''
          ),
          destination_terminal_id: String(
            parcel?.destination_terminal_id ?? terminalOptions[1]?.value ?? ''
          ),
          weight_kg: parcel?.weight_kg ?? '',
          price: parcel?.price ?? '',
          status: parcel?.status ?? 'received',
          description: parcel?.description ?? '',
          notes: parcel?.notes ?? '',
        })}
        onCreate={async (values) => {
          const created = await createParcel(toPayload(values));
          setSelectedTag(created);
        }}
        onUpdate={async (parcel, values) => {
          await updateParcel(parcel.id, toPayload(values));
        }}
        onDelete={async (parcel) => {
          await deleteParcel(parcel.id);
        }}
        deleteConsequence={(parcel) =>
          `Waybill #${parcel.tracking_number} will be removed. The sender and recipient will no longer be able to track this shipment.`
        }
        headerActions={
          <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
            <PackageIcon className="h-4 w-4 text-brand-600" aria-hidden />
            Automated Waybills with Recipient SMS Verification
          </span>
        }
      />

      <ParcelTagModal
        item={selectedTag}
        open={Boolean(selectedTag)}
        onClose={() => setSelectedTag(null)}
      />
    </>
  );
}