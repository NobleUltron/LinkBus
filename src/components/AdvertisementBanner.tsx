import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, MegaphoneIcon, SparklesIcon } from 'lucide-react';
import { getActiveAdvertisements } from '../services/settings';
import type { Advertisement } from '../types/models';

/** Rotates through the active banner campaigns. */
export function AdvertisementBanner({
  type = 'banner' as Advertisement['type'],
  className = '',
}: {
  type?: Advertisement['type'];
  className?: string;
}) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getActiveAdvertisements(type)
      .then((rows) => {
        if (!cancelled) setAds(rows);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [type]);

  useEffect(() => {
    if (ads.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % ads.length),
      7000
    );
    return () => window.clearInterval(timer);
  }, [ads.length]);

  if (ads.length === 0) return null;

  const ad = ads[index % ads.length];
  const targetUrl = ad.link_url || '/search';
  const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

  const defaultImage =
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80';

  const isSidebar = type === 'sidebar';

  return (
    <aside
      className={`card-surface group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-line shadow-sm transition-all duration-300 hover:shadow-md ${className}`}
    >
      <div className={`grid gap-0 ${isSidebar ? 'grid-cols-1' : 'md:grid-cols-[1.3fr_1fr]'} items-stretch`}>
        {/* Left / Content Column */}
        <div className="flex flex-col justify-between p-6 sm:p-7 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[0.6875rem] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 shadow-sm">
                <SparklesIcon className="h-3.5 w-3.5" />
                {isSidebar ? 'Special Offer' : 'Featured Campaign'}
              </span>
            </div>

            <h2 className="mt-3 text-lg sm:text-2xl font-black tracking-tight text-fg leading-snug">
              {ad.title}
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed max-w-md">
              {ad.description}
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line/50 pt-4">
            {isExternal ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg active:scale-95"
              >
                Claim Offer & Book
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            ) : (
              <Link
                to={targetUrl}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition-all hover:bg-brand-700 hover:shadow-lg active:scale-95"
              >
                Claim Offer & Book
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}

            {ads.length > 1 && (
              <div className="flex items-center gap-1.5">
                {ads.map((item, dotIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(dotIndex)}
                    aria-label={`Show campaign ${dotIndex + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      dotIndex === index % ads.length ? 'w-5 bg-brand-600' : 'w-1.5 bg-line'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right / Visual Photo Column */}
        <div className={`relative min-h-[12rem] sm:min-h-[14rem] ${isSidebar ? 'h-44' : 'md:min-h-full'} w-full overflow-hidden bg-surface-2`}>
          <img
            src={ad.image_url || defaultImage}
            alt={ad.title}
            className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent md:bg-gradient-to-r md:from-surface md:via-transparent md:to-transparent" />
        </div>
      </div>
    </aside>
  );
}