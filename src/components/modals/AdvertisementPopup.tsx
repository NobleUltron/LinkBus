import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, SparklesIcon, XIcon, ZapIcon } from 'lucide-react';
import { getActiveAdvertisements } from '../../services/settings';
import { handleClaimOffer } from '../../utils/promoHelper';
import type { Advertisement } from '../../types/models';

export function AdvertisementPopup() {
  const [popup, setPopup] = useState<Advertisement | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Check if dismissed in this session
    const dismissedId = sessionStorage.getItem('linkbus_dismissed_popup_id');

    getActiveAdvertisements('popup')
      .then((popups) => {
        if (cancelled || !popups || popups.length === 0) return;
        const activeAd = popups[0];

        if (dismissedId === String(activeAd.id)) return;

        setPopup(activeAd);
        // Show after a gentle 1.5s delay
        const timer = setTimeout(() => {
          if (!cancelled) setOpen(true);
        }, 1500);

        return () => clearTimeout(timer);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const handleDismiss = () => {
    if (popup) {
      sessionStorage.setItem('linkbus_dismissed_popup_id', String(popup.id));
    }
    setOpen(false);
  };

  if (!open || !popup) return null;

  const targetUrl = popup.link_url || '/search';
  const isExternal = targetUrl.startsWith('http://') || targetUrl.startsWith('https://');

  const defaultImage =
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=800&auto=format&fit=crop&q=80';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-line bg-surface shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="popup-ad-title"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-3.5 top-3.5 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform hover:scale-110 active:scale-95"
          aria-label="Close promotion modal"
        >
          <XIcon className="h-4 w-4" />
        </button>

        {/* Banner Graphic Creative */}
        <div className="relative h-48 sm:h-56 w-full overflow-hidden bg-surface-2">
          <img
            src={popup.image_url || defaultImage}
            alt={popup.title}
            className="h-full w-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = defaultImage;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent" />
          <span className="absolute bottom-3 left-4 inline-flex items-center gap-1 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold text-white shadow-lg">
            <ZapIcon className="h-3.5 w-3.5" />
            Special Flash Announcement
          </span>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-7 pt-2">
          <h3 id="popup-ad-title" className="text-xl sm:text-2xl font-extrabold text-fg tracking-tight">
            {popup.title}
          </h3>
          <p className="mt-2 text-sm text-muted leading-relaxed">
            {popup.description}
          </p>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
            {isExternal ? (
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  handleClaimOffer(popup);
                  handleDismiss();
                }}
                className="inline-flex w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-700 active:scale-95"
              >
                <SparklesIcon className="h-4 w-4" />
                Claim Offer & Book
                <ArrowRightIcon className="h-4 w-4" />
              </a>
            ) : (
              <Link
                to={targetUrl}
                onClick={() => {
                  handleClaimOffer(popup);
                  handleDismiss();
                }}
                className="inline-flex w-full sm:flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md transition-all hover:bg-brand-700 active:scale-95"
              >
                <SparklesIcon className="h-4 w-4" />
                Claim Offer & Book
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full sm:w-auto rounded-xl border border-line px-4 py-3 text-xs font-semibold text-muted transition-colors hover:bg-surface-2 hover:text-fg"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
