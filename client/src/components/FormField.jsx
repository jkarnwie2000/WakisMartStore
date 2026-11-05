import { useId } from 'react';

/** Labelled input/select/textarea with accessible error + hint wiring. */
export default function FormField({ label, error, hint, as = 'input', required, className = '', children, ...props }) {
  const id = useId();
  const Tag = as;
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label htmlFor={id} className="field__label">
        {label}
        {required && <span className="field__required" aria-hidden="true"> *</span>}
      </label>
      <Tag id={id} className="field__control" aria-invalid={error ? true : undefined} aria-describedby={describedBy} required={required} {...props}>
        {children}
      </Tag>
      {hint && !error && (
        <p id={`${id}-hint`} className="field__hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="field__error">
          {error}
        </p>
      )}
    </div>
  );
}
