import React from 'react';
import {
  CalendarIcon,
  ExternalLinkIcon,
  EyeIcon,
  ImageIcon,
  LayersIcon,
  MegaphoneIcon,
  SparklesIcon,
} from 'lucide-react';
import type { Column } from '../../components/data/DataTable';
import type { FieldConfig, FieldValue } from '../../components/data/ResourceModal';
import { ResourceScreen } from '../../components/data/ResourceScreen';
import { StatusPill } from '../../components/ui/StatusPill';
import { advertisementsApi } from '../../services/crud';
import type { Advertisement } from '../../types/models';
import { formatDate, titleCase } from '../../utils/format';

const typeOptions = [
  { value: 'banner', label: '📢 Hero Top Banner' },
  { value: 'sidebar', label: '📐 Sidebar Promo Card' },
  { value: 'popup', label: '⚡ Flash Modal Popup' },
];

const statusOptions = [
  { value: 'active', label: 'Active & Running' },
  { value: 'inactive', label: 'Inactive / Paused' },
];

export function Advertisements() {
  const isLive = (ad: Advertisement) => {
    const now = Date.now();
    return (
      ad.status === 'active' &&
      new Date(ad.start_date).getTime() <= now &&
      new Date(ad.end_date).getTime() >= now
    );
  };

  const isUpcoming = (ad: Advertisement) => {
    const now = Date.now();
    return ad.status === 'active' && new Date(ad.start_date).getTime() > now;
  };

  const columns: Column<Advertisement>[] = [
    {
      key: 'campaign',
      header: 'Campaign & Creative',
      render: (ad) => (
        <div className="flex items-center gap-3 py-1">
          {ad.image_url ? (
            <img
              src={ad.image_url}
              alt=""
              className="h-10 w-16 shrink-0 rounded-lg object-cover border border-line shadow-sm"
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
          ) : (
            <span className="flex h-10 w-16 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-muted border border-line">
              <ImageIcon className="h-5 w-5" aria-hidden />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-extrabold text-fg text-sm truncate">{ad.title}</p>
            <p className="truncate text-xs text-muted max-w-[240px]">{ad.description}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Placement',
      render: (ad) => {
        const typeStyle =
          ad.type === 'banner'
            ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30'
            : ad.type === 'popup'
            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30'
            : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';

        return (
          <span
            className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-bold ${typeStyle}`}
          >
            {ad.type === 'banner' && '📢'}
            {ad.type === 'sidebar' && '📐'}
            {ad.type === 'popup' && '⚡'}
            {titleCase(ad.type)}
          </span>
        );
      },
    },
    {
      key: 'link',
      header: 'Link Target',
      hideBelow: 'lg',
      render: (ad) => (
        <a
          href={ad.link_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-mono text-xs text-brand-600 dark:text-brand-400 hover:underline"
        >
          {ad.link_url}
          <ExternalLinkIcon className="h-3 w-3 opacity-70" />
        </a>
      ),
    },
    {
      key: 'window',
      header: 'Campaign Window',
      hideBelow: 'md',
      render: (ad) => (
        <div className="text-xs">
          <p className="text-fg font-semibold flex items-center gap-1">
            <CalendarIcon className="h-3 w-3 text-brand-600" />
            {formatDate(ad.start_date)} ➔ {formatDate(ad.end_date)}
          </p>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Rotation Order',
      align: 'right',
      hideBelow: 'lg',
      render: (ad) => (
        <span className="font-mono text-xs font-bold text-fg bg-surface-2 px-2 py-0.5 rounded border border-line">
          Priority #{ad.priority}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Broadcast Status',
      render: (ad) => {
        if (isLive(ad)) {
          return (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Live Broadcast
            </span>
          );
        }
        if (isUpcoming(ad)) {
          return (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
              Scheduled
            </span>
          );
        }
        return <StatusPill status="inactive" label="Inactive / Expired" />;
      },
    },
  ];

  const fields: FieldConfig[] = [
    {
      name: 'title',
      label: 'Campaign Headline',
      required: true,
      placeholder: 'e.g. Flash Easter Discount - 20% Off to Gulu & Arua',
      span: 2,
    },
    {
      name: 'description',
      label: 'Promotional Subtitle / Supporting Copy',
      type: 'textarea',
      required: true,
      placeholder: 'e.g. Book your holiday travel early with code EASTER20. Limited VIP seats available.',
      span: 2,
    },
    {
      name: 'image_url',
      label: 'Creative Image / Banner URL',
      type: 'url',
      required: true,
      span: 2,
      placeholder: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800',
      hint: 'Paste any direct image link (e.g. from Unsplash, Postimages, or company website). Landscape 16:9 works best.',
    },
    {
      name: 'link_url',
      label: 'Call to Action Target Link (Where button leads)',
      required: true,
      placeholder: '/search or /services',
      hint: 'The destination page when clicked: use /search for booking, /services for VIP, or https://... for external links.',
    },
    {
      name: 'type',
      label: 'Screen Placement',
      type: 'select',
      options: typeOptions,
      required: true,
    },
    {
      name: 'start_date',
      label: 'Campaign Start Date',
      type: 'date',
      required: true,
    },
    {
      name: 'end_date',
      label: 'Campaign End Date',
      type: 'date',
      required: true,
    },
    {
      name: 'priority',
      label: 'Display Priority Weight',
      type: 'number',
      min: 1,
      required: true,
      placeholder: '1',
      hint: 'Priority 1 displays first in rotation, followed by 2, 3, etc.',
    },
    {
      name: 'status',
      label: 'Campaign Status',
      type: 'select',
      options: statusOptions,
      required: true,
    },
  ];

  const toPayload = (values: Record<string, FieldValue>) => ({
    title: String(values.title),
    description: String(values.description),
    image_url: String(values.image_url),
    link_url: String(values.link_url),
    type: String(values.type) as Advertisement['type'],
    status: String(values.status) as Advertisement['status'],
    start_date: String(values.start_date),
    end_date: String(values.end_date),
    priority: Number(values.priority),
  });

  return (
    <ResourceScreen<Advertisement>
      title="Marketing & Campaign Banners"
      subtitle="Configure targeted promotional banners, sidebar announcements, and flash popups served to passenger screens."
      singular="Campaign"
      plural="Campaigns"
      searchPlaceholder="Search campaign headline, subtitle or placement…"
      emptyTitle="No promotional campaigns yet"
      emptyBody="Create a promotional banner to market intercity corridors, seasonal discounts, or parcel offers."
      columns={columns}
      fields={fields}
      filters={[
        {
          key: 'type',
          label: 'Any placement',
          options: typeOptions,
          icon: <LayersIcon className="h-4 w-4 text-brand-600" aria-hidden />,
        },
        {
          key: 'status',
          label: 'Any status',
          options: statusOptions,
        },
      ]}
      load={({ page, perPage, search, filters }) =>
        advertisementsApi.list({
          page,
          perPage,
          search,
          filters,
        })
      }
      toFormValues={(ad) => ({
        title: ad?.title ?? '',
        description: ad?.description ?? '',
        image_url: ad?.image_url ?? '',
        link_url: ad?.link_url ?? '/search',
        type: ad?.type ?? 'banner',
        status: ad?.status ?? 'active',
        start_date: ad?.start_date ? ad.start_date.substring(0, 10) : '',
        end_date: ad?.end_date ? ad.end_date.substring(0, 10) : '',
        priority: ad?.priority ?? 1,
      })}
      onCreate={async (values) => {
        await advertisementsApi.create(toPayload(values));
      }}
      onUpdate={async (ad, values) => {
        await advertisementsApi.update(ad.id, toPayload(values));
      }}
      onDelete={async (ad) => {
        await advertisementsApi.remove(ad.id);
      }}
      deleteConsequence={(ad) =>
        `Campaign “${ad.title}” will stop broadcasting immediately.`
      }
      headerActions={
        <span className="hidden items-center gap-1.5 text-xs text-muted sm:flex">
          <MegaphoneIcon className="h-4 w-4 text-brand-600" aria-hidden />
          Live Rotation by Priority Weight
        </span>
      }
    />
  );
}