import { toast } from 'sonner';

/** Extracts promo code candidates like VIP20, EARLYBIRD, SAVE10 from campaign text. */
export function extractPromoCode(text?: string | null): string | null {
  if (!text) return null;
  const explicitMatch = text.match(/(?:promo|code|voucher|coupon|use)[:\s]+([A-Za-z0-9_-]{3,15})\b/i);
  if (explicitMatch && explicitMatch[1]) {
    return explicitMatch[1].toUpperCase();
  }
  const standaloneMatch = text.match(/\b([A-Z]{2,10}\d{1,4})\b/);
  if (standaloneMatch && standaloneMatch[1]) {
    return standaloneMatch[1].toUpperCase();
  }
  return null;
}

/** Handles claiming a promo offer: copies to clipboard, stores in session, and notifies user. */
export function handleClaimOffer(ad: { title?: string; description?: string | null; link_url?: string | null }) {
  const combined = `${ad.title || ''} ${ad.description || ''} ${ad.link_url || ''}`;
  const code = extractPromoCode(combined);

  if (code) {
    sessionStorage.setItem('linkbus_pending_promo', code);
    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(code);
      }
    } catch {
      // Ignore clipboard permission errors
    }
    toast.success(`🎟️ Promo code "${code}" copied!`, {
      description: 'It will be automatically applied to your booking at checkout.',
      duration: 5000,
    });
  }
}
