import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, MegaphoneIcon, SparklesIcon } from 'lucide-react';
import { getActiveAdvertisements } from '../services/settings';
import { handleClaimOffer } from '../utils/promoHelper';
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
      className={`group relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/10 bg-slate-950 text-white shadow-xl transition-all duration-300 hover:shadow-2xl ${className}`}
    >
      {/* Background Hero Photograph */}
      <img
        src={ad.image_url || defaultImage}
        alt={ad.title}
        className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src = defaultImage;
        }}
      />

      {/* Atmospheric Glassmorphic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-900/30 sm:bg-gradient-to-r sm:from-slate-950/95 sm:via-slate-900/80 sm:to-slate-900/25 backdrop-blur-[1.5px]" />

      {/* Decorative Emerald Glow Mesh */}
      <div className="pointer-events-none absolute -left-12 -top-12 h-56 w-56 rounded-full bg-emerald-500/20 blur-3xl" />

      {/* Content Container */}
      <div className={`relative z-10 flex flex-col justify-between p-6 sm:p-8 ${isSidebar ? 'min-h-[14rem]' : 'min-h-[15rem] sm:min-h-[17rem]'}`}>
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/40 bg-emerald-500/25 px-3 py-1 text-[0.6875rem] font-black uppercase tracking-wider text-emerald-300 backdrop-blur-md shadow-sm">
              <SparklesIcon className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
              {isSidebar ? 'Exclusive Offer' : 'Special Feature'}
            </span>
          </div>

          <h2 className="mt-3.5 text-xl sm:text-3xl font-black tracking-tight text-white leading-tight drop-shadow-md max-w-xl">
            {ad.title}
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-slate-200/90 leading-relaxed max-w-lg font-medium drop-shadow-sm">
            {ad.description}
          </p>
        </div>

        {/* Action Row */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-4">
          {isExternal ? (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClaimOffer(ad)}
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-[0_4px_20px_rgba(16,185,129,0.45)] transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_6px_28px_rgba(16,185,129,0.65)] hover:scale-[1.02] active:scale-95"
            >
              <span>Claim Offer & Book</span>
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          ) : (
            <Link
              to={targetUrl}
              onClick={() => handleClaimOffer(ad)}
              className="inline-flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-xs sm:text-sm font-black text-white shadow-[0_4px_20px_rgba(16,185,129,0.45)] transition-all hover:from-emerald-400 hover:to-emerald-500 hover:shadow-[0_6px_28px_rgba(16,185,129,0.65)] hover:scale-[1.02] active:scale-95"
            >
              <span>Claim Offer & Book</span>
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          )}

          {ads.length > 1 && (
            <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-md border border-white/10">
              {ads.map((item, dotIndex) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setIndex(dotIndex)}
                  aria-label={`Show campaign ${dotIndex + 1}`}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    dotIndex === index % ads.length
                      ? 'w-6 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'
                      : 'w-1.5 bg-white/40 hover:bg-white/70'
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