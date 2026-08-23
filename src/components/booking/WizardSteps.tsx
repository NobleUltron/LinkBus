import React from 'react';
import { CheckIcon } from 'lucide-react';
interface WizardStepsProps {
  steps: string[];
  current: number;
}

/** Horizontal step indicator; the numbers carry real sequence meaning here. */
export function WizardSteps({
  steps,
  current
}: WizardStepsProps) {
  return <ol className="flex items-center gap-2 overflow-x-auto" aria-label="Progress">
      {steps.map((step, index) => {
      const done = index < current;
      const active = index === current;
      return <li key={step} className="flex flex-1 items-center gap-2">
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-150 ease-smooth ${done ? 'bg-brand-600 text-white' : active ? 'bg-brand-600 text-white' : 'bg-surface-2 text-faint ring-1 ring-line'}`} aria-current={active ? 'step' : undefined}>
              {done ? <CheckIcon className="h-3.5 w-3.5" aria-hidden /> : index + 1}
            </span>
            <span className={`hidden whitespace-nowrap text-xs font-semibold sm:block ${active ? 'text-fg' : 'text-muted'}`}>
              {step}
            </span>
            {index < steps.length - 1 && <span className="h-0.5 min-w-4 flex-1 rounded bg-line" aria-hidden />}
          </li>;
    })}
    </ol>;
}