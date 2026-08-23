import React from 'react';
import { Loader2Icon } from 'lucide-react';
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
}
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 focus-visible:outline-brand-600 disabled:hover:bg-brand-600',
  secondary: 'bg-gold-500 text-[#231a00] hover:bg-gold-400 focus-visible:outline-gold-500 disabled:hover:bg-gold-500',
  outline: 'border border-line bg-surface text-fg hover:bg-surface-2 focus-visible:outline-brand-600',
  ghost: 'text-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-brand-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:outline-red-600'
};
const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-[0.8125rem] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2'
};
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  block = false,
  className = '',
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return <button {...rest} disabled={disabled || loading} className={['inline-flex items-center justify-center rounded-xl font-semibold', 'transition-[background-color,color,border-color,transform,box-shadow] duration-150 ease-smooth', 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2', 'active:translate-y-px disabled:cursor-not-allowed disabled:opacity-60 disabled:active:translate-y-0', 'whitespace-nowrap', variants[variant], sizes[size], block ? 'w-full' : '', className].join(' ')}>
      {loading ? <Loader2Icon className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>;
}