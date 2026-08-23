import React from 'react';
import { Button } from './Button';
import { Modal } from './Modal';
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Always state the consequence, including any fee. */
  consequence: string;
  detail?: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}
export function ConfirmDialog({
  open,
  title,
  consequence,
  detail,
  confirmLabel = 'Confirm',
  destructive = true,
  pending = false,
  onConfirm,
  onClose
}: ConfirmDialogProps) {
  return <Modal open={open} onClose={onClose} title={title} size="sm" footer={<>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Keep it
          </Button>
          <Button variant={destructive ? 'danger' : 'primary'} onClick={onConfirm} loading={pending}>
            {confirmLabel}
          </Button>
        </>}>
      <p className="text-sm text-muted">{consequence}</p>
      {detail && <div className="mt-4">{detail}</div>}
    </Modal>;
}