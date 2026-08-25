import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, MegaphoneIcon } from 'lucide-react';
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

  return (
    <aside className={`card-surface relative overflow-hidden rounded-2xl border border-line shadow-sm ${className}`}>
      <div className="grid gap-0 sm:grid-cols-[1.2fr_1fr]">
        <div className="flex flex-col justify-between p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-1.5 text-[0.6875rem] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
              <MegaphoneIcon className="h-3.5 w-3.5" />
              <span>Sponsored Campaign</span>
            </div>
            <h2 className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-fg">{ad.title}</h2>
            <p className="mt-1.5 text-xs sm:text-sm text-muted leading-relaxed">{ad.description}</p>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            {isExternal ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
              >
                Learn more
                <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
              </a>
            ) : (
              <Link
                to={targetUrl}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-95"
              >
                Learn more
                <ArrowRightIcon className="h-3.5 w-3.5" aria-hidden />
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
        <div className="relative min-h-[10rem] sm:min-h-full bg-surface-2">
          <img
            src={ad.image_url || defaultImage}
            alt={ad.title}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent sm:bg-gradient-to-r sm:from-surface sm:to-transparent sm:w-16" />
        </div>
      </div>
    </aside>
  );
}