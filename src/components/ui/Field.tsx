import React from 'react';
interface BaseProps {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  id: string;
  className?: string;
}
function Wrapper({
  label,
  hint,
  error,
  required,
  id,
  className = '',
  children


}: BaseProps & {children: React.ReactNode;}) {
  return <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[0.8125rem] font-medium leading-5 text-fg">
        {label}
        {required && <span className="ml-0.5 text-brand-600">*</span>}
      </label>
      {children}
      {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-medium leading-4 text-red-600 dark:text-red-300">
          {error}
        </p> : hint && <p className="mt-1 text-xs leading-4 text-muted">{hint}</p>}
    </div>;
}
type InputProps = BaseProps & React.InputHTMLAttributes<HTMLInputElement>;
export function TextField({
  label,
  hint,
  error,
  required,
  id,
  className,
  ...rest
}: InputProps) {
  return <Wrapper label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <input id={id} {...rest} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`field ${error ? 'border-red-500 focus:border-red-500' : ''}`} />
    </Wrapper>;
}
type SelectProps = BaseProps & React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: {
    value: string;
    label: string;
  }[];
  placeholder?: string;
};
export function SelectField({
  label,
  hint,
  error,
  required,
  id,
  className,
  options,
  placeholder,
  ...rest
}: SelectProps) {
  return <Wrapper label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <select id={id} {...rest} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`field ${error ? 'border-red-500' : ''}`}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.value} value={option.value}>
            {option.label}
          </option>)}
      </select>
    </Wrapper>;
}
type TextAreaProps = BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>;
export function TextAreaField({
  label,
  hint,
  error,
  required,
  id,
  className,
  ...rest
}: TextAreaProps) {
  return <Wrapper label={label} hint={hint} error={error} required={required} id={id} className={className}>
      <textarea id={id} rows={3} {...rest} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className={`field resize-y ${error ? 'border-red-500' : ''}`} />
    </Wrapper>;
}
export function ToggleField({
  label,
  hint,
  id,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  id: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface-2/60 px-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="cursor-pointer text-[0.8125rem] font-medium leading-5 text-fg">
          {label}
        </label>
        {hint && <p className="mt-0.5 text-xs leading-4 text-muted">{hint}</p>}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-600/30 ${
          checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-zinc-700'
        }`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}