import { ButtonHTMLAttributes, forwardRef, InputHTMLAttributes, ReactNode, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { SpecularFx } from '@/components/shared/SpecularFx';

/* ---------------- Tokens (mirror prompt) ---------------- */
const NAVY = '#1F0F4D';
const INK = '#141414';
const HAIRLINE = '#E0E0E0';
const MUTED = '#737373';
const ERROR = '#B23B3B';
const GREY = '#F2F2F2';

/* ---------------- Field ---------------- */
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export const AuthField = forwardRef<HTMLInputElement, FieldProps>(
  ({ label, error, hint, id, className, ...rest }, ref) => {
    return (
      <div className="mb-5">
        <label
          htmlFor={id}
          className="font-body block mb-2"
          style={{ fontSize: '12.5px', color: INK, letterSpacing: '0.02em' }}
        >
          {label}
        </label>
        <input
          ref={ref}
          id={id}
          {...rest}
          className={`font-body w-full ${className ?? ''}`}
          style={{
            border: `1px solid ${error ? ERROR : HAIRLINE}`,
            borderRadius: 0,
            padding: '11px 13px',
            fontSize: '14.5px',
            color: INK,
            background: '#fff',
            outline: 'none',
            transition: 'border-color .15s ease',
          }}
          onFocus={(e) => {
            if (!error) e.currentTarget.style.borderColor = NAVY;
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            if (!error) e.currentTarget.style.borderColor = HAIRLINE;
            rest.onBlur?.(e);
          }}
        />
        {error ? (
          <p className="font-body mt-1.5" style={{ fontSize: '12.5px', color: ERROR }}>
            {error}
          </p>
        ) : hint ? (
          <p className="font-body mt-1.5" style={{ fontSize: '12.5px', color: MUTED }}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
AuthField.displayName = 'AuthField';

/* ---------------- PasswordField (show/hide) ---------------- */
interface PasswordFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
  error?: string;
  hint?: string;
}

export const AuthPasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  ({ label, error, hint, id, ...rest }, ref) => {
    const [show, setShow] = useState(false);
    return (
      <div className="mb-5">
        <label
          htmlFor={id}
          className="font-body block mb-2"
          style={{ fontSize: '12.5px', color: INK, letterSpacing: '0.02em' }}
        >
          {label}
        </label>
        <div className="relative">
          <input
            ref={ref}
            id={id}
            type={show ? 'text' : 'password'}
            {...rest}
            className="font-body w-full"
            style={{
              border: `1px solid ${error ? ERROR : HAIRLINE}`,
              borderRadius: 0,
              padding: '11px 42px 11px 13px',
              fontSize: '14.5px',
              color: INK,
              background: '#fff',
              outline: 'none',
            }}
            onFocus={(e) => {
              if (!error) e.currentTarget.style.borderColor = NAVY;
              rest.onFocus?.(e);
            }}
            onBlur={(e) => {
              if (!error) e.currentTarget.style.borderColor = HAIRLINE;
              rest.onBlur?.(e);
            }}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            tabIndex={-1}
            aria-label={show ? 'Hide password' : 'Show password'}
            className="absolute top-1/2 -translate-y-1/2"
            style={{ right: '12px', color: MUTED }}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {error ? (
          <p className="font-body mt-1.5" style={{ fontSize: '12.5px', color: ERROR }}>
            {error}
          </p>
        ) : hint ? (
          <p className="font-body mt-1.5" style={{ fontSize: '12.5px', color: MUTED }}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
AuthPasswordField.displayName = 'AuthPasswordField';

/* ---------------- Primary / Secondary / Grey buttons ---------------- */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'grey';
  block?: boolean;
}

export function AuthButton({
  variant = 'primary',
  block = true,
  className = '',
  style,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  const base = {
    fontFamily: "'Times New Roman', Times, Georgia, serif",
    fontSize: '15px',
    letterSpacing: '0.01em',
    padding: '12px 18px',
    border: '1px solid',
    borderRadius: 0,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    transition: 'background-color .15s ease, color .15s ease, border-color .15s ease',
    width: block ? '100%' : 'auto',
  } as const;

  const palettes = {
    primary: { background: NAVY, color: '#fff', borderColor: NAVY },
    outline: { background: '#fff', color: NAVY, borderColor: NAVY },
    grey: { background: GREY, color: INK, borderColor: HAIRLINE },
  } as const;

  const hover = {
    primary: { background: '#fff', color: NAVY, borderColor: NAVY },
    outline: { background: NAVY, color: '#fff', borderColor: NAVY },
    grey: { background: '#e8e8e8', color: INK, borderColor: '#d4d4d4' },
  } as const;

  return (
    <button
      {...rest}
      disabled={disabled}
      className={className}
      style={{ ...base, ...palettes[variant], position: 'relative', ...style }}
      onMouseEnter={(e) => {
        if (disabled) return;
        Object.assign(e.currentTarget.style, hover[variant]);
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        Object.assign(e.currentTarget.style, palettes[variant]);
        rest.onMouseLeave?.(e);
      }}
    >
      {/* Primary actions carry the specular border animation. */}
      {variant === 'primary' && !disabled && <SpecularFx />}
      <span style={{ position: 'relative', zIndex: 2 }}>{children}</span>
    </button>
  );
}

/* ---------------- Inline link (centred footer link) ---------------- */
export function AuthLink({ children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...rest}
      className="font-body"
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        color: NAVY,
        fontSize: '13.5px',
        textDecoration: 'underline',
        textUnderlineOffset: '3px',
        cursor: 'pointer',
      }}
    >
      {children}
    </button>
  );
}

/* ---------------- Error banner ---------------- */
export function AuthErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="font-body mb-5"
      style={{
        border: `1px solid ${ERROR}`,
        background: 'rgba(178,59,59,0.06)',
        color: ERROR,
        padding: '11px 13px',
        fontSize: '13.5px',
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}

/* ---------------- Numbered step list ---------------- */
interface StepsProps {
  items: ReactNode[];
}
export function AuthSteps({ items }: StepsProps) {
  return (
    <ol className="font-body mb-6" style={{ counterReset: 'st', listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            display: 'grid',
            gridTemplateColumns: '28px 1fr',
            gap: '12px',
            alignItems: 'start',
            marginBottom: '12px',
            color: INK,
            fontSize: '13.5px',
            lineHeight: 1.55,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              border: `1px solid ${NAVY}`,
              color: NAVY,
              fontFamily: "'Times New Roman', Times, Georgia, serif",
              fontSize: '13px',
            }}
          >
            {i + 1}
          </span>
          <span style={{ color: MUTED }}>{item}</span>
        </li>
      ))}
    </ol>
  );
}

export const AUTH_TOKENS = { NAVY, INK, HAIRLINE, MUTED, ERROR, GREY };
