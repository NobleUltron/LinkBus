import React from 'react';
import { CalendarIcon, ChevronDownIcon, Loader2Icon, SearchIcon, XIcon } from 'lucide-react';

/**
 * Shared search / select / date controls.
 * Every one of them is 2.5rem tall, carries a leading icon in the same 1rem slot,
 * and reserves 2.625rem of left padding so placeholder text never overlaps icons.
 */

const ICON = 'pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2';

/** Brand outline used when a control is actively narrowing a list. */
export const ACTIVE_FIELD = 'border-brand-600 text-fg font-semibold shadow-[0_0_0_3px_rgba(22,163,74,0.12)]';

export const FIELD_WIDTH = {
  search: 'min-w-[14rem] flex-1',
  select: 'w-auto min-w-[10.5rem] max-w-[16rem]',
  date: 'w-auto min-w-[11rem] max-w-[13rem]',
};

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  id?: string;
  loading?: boolean;
  className?: string;
}

export function SearchInput({ value, onChange, placeholder, id, loading = false, className = '' }: SearchInputProps) {
  return (
    <div className={`relative ${className || FIELD_WIDTH.search}`}>
      {loading ? (
        <Loader2Icon className={`${ICON} animate-spin text-brand-600 dark:text-brand-400 z-10`} aria-hidden />
      ) : (
        <SearchIcon className={`${ICON} ${value ? 'text-brand-600 dark:text-brand-400' : 'text-muted'} z-10`} aria-hidden />
      )}
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="field field-has-icon w-full pr-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden"
      />

      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
        >
          <XIcon className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}

interface IconSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'value'> {
  icon: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  /** Renders the brand outline — used by list filters. */
  active?: boolean;
  className?: string;
}

export function IconSelect({ icon, value, options, placeholder, active = false, className = '', ...rest }: IconSelectProps) {
  const filled = active || (value !== '' && value !== null && value !== undefined);
  return (
    <div className={`relative shrink-0 ${className || FIELD_WIDTH.select}`}>
      <span
        className={`${ICON} flex items-center justify-center ${filled ? 'text-brand-600 dark:text-brand-400' : 'text-muted'} z-10`}
        aria-hidden
      >
        {icon}
      </span>
      <select
        {...rest}
        value={value}
        aria-label={rest['aria-label'] ?? placeholder}
        title={rest.title ?? placeholder}
        className={`field field-has-icon w-full cursor-pointer pr-8 ${filled ? ACTIVE_FIELD : 'text-muted'}`}
      >
        <option value="" className="bg-surface text-fg dark:bg-zinc-800 dark:text-zinc-100">
          {placeholder}
        </option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-surface text-fg dark:bg-zinc-800 dark:text-zinc-100"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface DateInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className' | 'value' | 'type'> {
  value: string;
  label: string;
  active?: boolean;
  onClear?: () => void;
  className?: string;
}

export function DateInput({ value, label, active = false, onClear, className = '', ...rest }: DateInputProps) {
  const filled = active || (value !== '' && value !== null && value !== undefined);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const openPicker = () => {
    if (inputRef.current) {
      if ('showPicker' in inputRef.current && typeof (inputRef.current as any).showPicker === 'function') {
        try {
          (inputRef.current as any).showPicker();
        } catch {
          inputRef.current.focus();
        }
      } else {
        inputRef.current.focus();
      }
    }
  };

  return (
    <div className={`relative shrink-0 ${className || FIELD_WIDTH.date}`}>
      <button
        type="button"
        onClick={openPicker}
        tabIndex={-1}
        className={`${ICON} flex items-center justify-center ${filled ? 'text-brand-600 dark:text-brand-400' : 'text-muted'} z-10`}
        aria-hidden
      >
        <CalendarIcon className="h-4 w-4" />
      </button>
      <input
        {...rest}
        ref={inputRef}
        type="date"
        value={value}
        aria-label={label}
        title={label}
        className={`field field-has-icon w-full cursor-pointer pr-7 ${filled ? ACTIVE_FIELD : 'text-muted'}`}
      />

      {filled && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          aria-label={`Clear ${label.toLowerCase()}`}
          className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg z-10"
        >
          <XIcon className="h-3 w-3" aria-hidden />
        </button>
      )}
    </div>
  );
}

/** Chevron re-export so callers can build bespoke selects that still match. */
export { ChevronDownIcon as FieldChevronIcon };