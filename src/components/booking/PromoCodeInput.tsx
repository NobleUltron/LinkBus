import React, { useState } from 'react';
import { CheckCircle2Icon, TagIcon, XIcon } from 'lucide-react';
import { validatePromoCode } from '../../services/bookings';
import type { PromoValidation } from '../../types/api';
import { errorMessage } from '../../hooks/useAsync';
import { money } from '../../utils/format';
import { Button } from '../ui/Button';
import { InlineError } from '../ui/States';
interface PromoCodeInputProps {
  subtotal: number;
  applied: PromoValidation | null;
  onApply: (promo: PromoValidation | null) => void;
}
export function PromoCodeInput({
  subtotal,
  applied,
  onApply
}: PromoCodeInputProps) {
  const [code, setCode] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    setPending(true);
    setError(null);
    try {
      const promo = await validatePromoCode({
        code,
        subtotal
      });
      onApply(promo);
      setCode('');
    } catch (err) {
      setError(errorMessage(err));
      onApply(null);
    } finally {
      setPending(false);
    }
  };
  if (applied) {
    return <div className="flex items-start justify-between gap-3 rounded-xl bg-brand-600/10 px-3.5 py-3">
        <div className="flex gap-2.5">
          <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-fg">
              {applied.code} · −{money(applied.discount)}
            </p>
            <p className="text-xs text-muted">{applied.description}</p>
          </div>
        </div>
        <button type="button" onClick={() => onApply(null)} aria-label="Remove promo code" className="rounded-lg p-1 text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg">
          <XIcon className="h-4 w-4" aria-hidden />
        </button>
      </div>;
  }
  return <div>
      <form onSubmit={submit} className="flex gap-2">
        <div className="relative flex-1">
          <TagIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="Enter Promo Code"
            aria-label="Promo code"
            className="field field-has-icon uppercase text-xs font-semibold tracking-wider placeholder:normal-case placeholder:font-normal placeholder:text-muted"
          />
        </div>
        <Button type="submit" variant="outline" loading={pending} disabled={!code.trim()}>
          Apply
        </Button>
      </form>
      {error && <div className="mt-2">{<InlineError message={error} />}</div>}
    </div>;
}