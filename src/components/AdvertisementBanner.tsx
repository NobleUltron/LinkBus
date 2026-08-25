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

  const isSidebar = type === 'sidebar';

  if (isSidebar) {
    return (
      <aside className={`card-surface overflow-hidden rounded-2xl border border-line shadow-sm ${className}`}>
        <div className="relative h-36 w-full overflow-hidden bg-surface-2">
          <img
            src={ad.image_url || defaultImage}
            alt={ad.title}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultImage;
            }}
          />
          <span className="absolute bottom-2 left-2.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            <MegaphoneIcon className="h-3 w-3" />
            Promo Card
          </span>
        </div>
        <div className="p-4">
          <h3 className="text-sm font-bold text-fg line-clamp-1">{ad.title}</h3>
          <p className="mt-1 text-xs text-muted leading-relaxed line-clamp-2">{ad.description}</p>
          <div className="mt-3 flex items-center justify-between">
            {isExternal ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Learn more
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </a>
            ) : (
              <Link
                to={targetUrl}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline"
              >
                Learn more
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            )}

            {ads.length > 1 && (
              <div className="flex items-center gap-1">
                {ads.map((item, dotIndex) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIndex(dotIndex)}
                    aria-label={`Show promo ${dotIndex + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      dotIndex === index % ads.length ? 'w-4 bg-brand-600' : 'w-1.5 bg-line'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>
    );
  }

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