import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon } from 'lucide-react';
import { getActiveAdvertisements } from '../services/settings';
import type { Advertisement } from '../types/models';

/** Rotates through the active banner campaigns. */
export function AdvertisementBanner({
  type = 'banner' as Advertisement['type']


}: {type?: Advertisement['type'];}) {
  const [ads, setAds] = useState<Advertisement[]>([]);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    let cancelled = false;
    getActiveAdvertisements(type).then((rows) => {
      if (!cancelled) setAds(rows);
    }).catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [type]);
  useEffect(() => {
    if (ads.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % ads.length), 7000);
    return () => window.clearInterval(timer);
  }, [ads.length]);
  if (ads.length === 0) return null;
  const ad = ads[index % ads.length];
  return <aside className="card-surface relative overflow-hidden">
      <div className="grid gap-0 sm:grid-cols-[1.1fr_1fr]">
        <div className="p-5">
          <p className="text-[0.6875rem] font-bold uppercase tracking-widest text-brand-600 dark:text-brand-400">
            Sponsored
          </p>
          <h2 className="mt-1.5 text-lg font-bold tracking-tight text-fg">{ad.title}</h2>
          <p className="mt-1.5 text-sm text-muted">{ad.description}</p>
          <Link to={ad.link_url} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors duration-150 hover:text-brand-700 dark:text-brand-400">
            Learn more
            <ArrowRightIcon className="h-4 w-4" aria-hidden />
          </Link>

          {ads.length > 1 && <div className="mt-4 flex gap-1.5">
              {ads.map((item, dotIndex) => <button key={item.id} type="button" onClick={() => setIndex(dotIndex)} aria-label={`Show campaign ${dotIndex + 1}`} className={`h-1.5 rounded-full transition-[width,background-color] duration-150 ${dotIndex === index % ads.length ? 'w-5 bg-brand-600' : 'w-1.5 bg-line'}`} />)}
            </div>}
        </div>
        <div className="relative min-h-[9rem]">
          <img src={ad.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        </div>
      </div>
    </aside>;
}