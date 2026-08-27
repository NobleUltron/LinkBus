import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { XIcon } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  bodyClassName?: string;
}

const widths = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
  xl: 'max-w-5xl',
  '2xl': 'max-w-7xl',
};

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  size = 'md',
  bodyClassName = 'p-5',
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 sm:items-center sm:p-6 overflow-hidden modal-portal-root">
          {/* Full-bleed Backdrop Overlay */}
          <motion.div
            data-modal-backdrop="true"
            className="modal-backdrop-overlay fixed inset-0 h-screen w-screen bg-slate-950/70 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`modal-modern relative z-10 flex max-h-[92vh] w-full flex-col shadow-2xl ${widths[size]}`}
            initial={{
              opacity: 0,
              scale: 0.96,
              y: 12,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.97,
              y: 8,
            }}
            transition={{
              duration: 0.24,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <header data-modal-header="true" className="flex items-center justify-between gap-4 border-b border-line px-4 sm:px-5 py-3 sm:py-3.5 bg-surface rounded-t-2xl sm:rounded-t-2xl shrink-0">
              <div className="min-w-0">
                <h2 className="truncate text-[0.9375rem] font-semibold leading-6 text-fg">
                  {title}
                </h2>
                {subtitle && (
                  <p className="mt-0.5 truncate text-[0.8125rem] leading-5 text-muted">
                    {subtitle}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mr-1.5 shrink-0 flex h-9 w-9 items-center justify-center rounded-xl text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg active:scale-95"
              >
                <XIcon className="h-4.5 w-4.5" aria-hidden />
              </button>
            </header>

            <div className={`thin-scroll flex-1 overflow-y-auto ${bodyClassName}`}>
              {children}
            </div>

            {footer && (
              <footer data-modal-footer="true" className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 sm:px-5 py-3 sm:py-3.5 bg-surface rounded-b-none sm:rounded-b-2xl pb-[max(env(safe-area-inset-bottom),0.75rem)] shrink-0">
                {footer}
              </footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}