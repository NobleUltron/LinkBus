import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CameraIcon, ImageIcon, Trash2Icon, UploadCloudIcon } from 'lucide-react';
import { getMediaUrl } from '../../utils/format';
import { Button } from '../ui/Button';
import { SelectField, TextAreaField, TextField, ToggleField } from '../ui/Field';
import { Modal } from '../ui/Modal';
import { InlineError } from '../ui/States';

export type FieldValue = string | number | boolean;

export interface FieldConfig {
  name: string;
  label: string;
  type?:
    | 'text'
    | 'email'
    | 'password'
    | 'tel'
    | 'url'
    | 'number'
    | 'select'
    | 'textarea'
    | 'date'
    | 'datetime-local'
    | 'toggle'
    | 'image';
  options?: {
    value: string;
    label: string;
  }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  span?: 1 | 2;
  step?: string;
  min?: number;
}

interface ResourceModalProps {
  open: boolean;
  title: string;
  subtitle?: string;
  fields: FieldConfig[];
  values: Record<string, FieldValue>;
  submitLabel?: string;
  onClose: () => void;
  onSubmit: (values: Record<string, FieldValue>) => Promise<void>;
}

function validate(field: FieldConfig, value: FieldValue): string | undefined {
  if (field.type === 'toggle' || field.type === 'image') return undefined;
  const raw = String(value ?? '').trim();
  if (field.required && raw === '') return `${field.label} is required.`;
  if (raw === '') return undefined;
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) return 'Enter a valid email address.';
  if (field.type === 'number' && Number.isNaN(Number(raw))) return 'Enter a number.';
  if (field.type === 'number' && field.min !== undefined && Number(raw) < field.min) return `Must be at least ${field.min}.`;
  return undefined;
}

/** One form for every managed resource, generated from a field config. */
export function ResourceModal({
  open,
  title,
  subtitle,
  fields,
  values,
  submitLabel = 'Save',
  onClose,
  onSubmit,
}: ResourceModalProps) {
  const [form, setForm] = useState<Record<string, FieldValue>>(values);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(values);
      setErrors({});
      setTouched({});
      setFormError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, JSON.stringify(values)]);

  const set = (name: string, value: FieldValue) => {
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
    if (touched[name]) {
      const field = fields.find((f) => f.name === name);
      if (field)
        setErrors((current) => ({
          ...current,
          [name]: validate(field, value) ?? '',
        }));
    }
  };

  const blur = (field: FieldConfig) => {
    setTouched((current) => ({
      ...current,
      [field.name]: true,
    }));
    setErrors((current) => ({
      ...current,
      [field.name]: validate(field, form[field.name]) ?? '',
    }));
  };

  const hasErrors = useMemo(() => Object.values(errors).some(Boolean), [errors]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: Record<string, string> = {};
    fields.forEach((field) => {
      const message = validate(field, form[field.name]);
      if (message) nextErrors[field.name] = message;
    });
    setErrors(nextErrors);
    setTouched(
      fields.reduce<Record<string, boolean>>(
        (acc, field) => ({
          ...acc,
          [field.name]: true,
        }),
        {},
      ),
    );
    if (Object.keys(nextErrors).length > 0) return;

    setPending(true);
    setFormError(null);
    try {
      await onSubmit(form);
      onClose();
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'That could not be saved.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" form="resource-form" loading={pending} disabled={hasErrors}>
            {submitLabel}
          </Button>
        </>
      }
    >
      <form id="resource-form" onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        {formError && (
          <div className="sm:col-span-2">
            <InlineError message={formError} />
          </div>
        )}

        {fields.map((field) => {
          const id = `field-${field.name}`;
          const span = field.span === 2 ? 'sm:col-span-2' : '';
          const error = touched[field.name] ? errors[field.name] || undefined : undefined;

          if (field.type === 'select') {
            return (
              <SelectField
                key={field.name}
                id={id}
                className={span}
                label={field.label}
                hint={field.hint}
                error={error}
                required={field.required}
                options={field.options ?? []}
                placeholder={field.placeholder ?? 'Select…'}
                value={String(form[field.name] ?? '')}
                onBlur={() => blur(field)}
                onChange={(event) => set(field.name, event.target.value)}
              />
            );
          }

          if (field.type === 'textarea') {
            return (
              <TextAreaField
                key={field.name}
                id={id}
                className={span || 'sm:col-span-2'}
                label={field.label}
                hint={field.hint}
                error={error}
                required={field.required}
                placeholder={field.placeholder}
                value={String(form[field.name] ?? '')}
                onBlur={() => blur(field)}
                onChange={(event) => set(field.name, event.target.value)}
              />
            );
          }

          if (field.type === 'toggle') {
            return (
              <div key={field.name} className={span}>
                <ToggleField
                  id={id}
                  label={field.label}
                  hint={field.hint}
                  checked={Boolean(form[field.name])}
                  onChange={(value) => set(field.name, value)}
                />
              </div>
            );
          }

          if (field.type === 'image') {
            return (
              <ImageUploadField
                key={field.name}
                id={id}
                className={span || 'sm:col-span-2'}
                label={field.label}
                hint={field.hint}
                value={String(form[field.name] ?? '')}
                onChange={(base64) => set(field.name, base64)}
              />
            );
          }

          return (
            <TextField
              key={field.name}
              id={id}
              className={span}
              label={field.label}
              hint={field.hint}
              error={error}
              required={field.required}
              type={field.type ?? 'text'}
              step={field.step}
              min={field.min}
              placeholder={field.placeholder}
              value={String(form[field.name] ?? '')}
              onBlur={() => blur(field)}
              onChange={(event) => set(field.name, event.target.value)}
            />
          );
        })}
      </form>
    </Modal>
  );
}

function ImageUploadField({
  id,
  className = '',
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  className?: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [compressing, setCompressing] = useState(false);
  const previewUrl = getMediaUrl(value);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WebP).');
      return;
    }

    setCompressing(true);
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          onChange(compressedDataUrl);
        }
        setCompressing(false);
      };
      img.onerror = () => setCompressing(false);
      img.src = readerEvent.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label htmlFor={id} className="block text-xs font-bold text-fg">
        {label}
      </label>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl border border-dashed border-line bg-surface-2/60 p-4 transition-colors hover:border-brand-500/50">
        {/* Preview Thumbnail */}
        {previewUrl ? (
          <div className="relative h-24 w-36 shrink-0 overflow-hidden rounded-xl border border-line bg-surface shadow-sm">
            <img src={previewUrl} alt="Terminal Preview" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-lg bg-red-600/90 text-white shadow-sm hover:bg-red-700 transition-colors"
              title="Remove photo"
            >
              <Trash2Icon className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex h-24 w-36 shrink-0 flex-col items-center justify-center rounded-xl border border-line bg-surface text-muted">
            <ImageIcon className="h-8 w-8 stroke-1 text-muted/60 mb-1" />
            <span className="text-[0.625rem] font-semibold text-muted">No photo</span>
          </div>
        )}

        {/* Upload Controls */}
        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={compressing}
              icon={<UploadCloudIcon className="h-4 w-4 text-brand-600" />}
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? 'Change Local Photo' : 'Upload from Local Storage'}
            </Button>

            {previewUrl && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-600 hover:bg-red-500/10 text-xs"
                onClick={() => onChange('')}
              >
                Clear Photo
              </Button>
            )}
          </div>

          <p className="text-[0.6875rem] text-muted">
            {hint || 'Select a JPG, PNG, or WebP photo from your computer. Image is automatically optimized.'}
          </p>
        </div>
      </div>
    </div>
  );
}