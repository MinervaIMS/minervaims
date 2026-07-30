import { useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { citySuggestions, normaliseCity } from '@/lib/city-format';

// =====================================================================
// CityInput — a city field that completes itself.
// ---------------------------------------------------------------------
// The person filling the form types "milan" and the record is stored as
// "Milan, Italy". Suggestions appear while typing so the country is a
// choice rather than a guess, and whatever is left in the box is
// normalised on blur, so the canonical form is reached even when nobody
// touches the list. A city the register does not recognise is tidied and
// kept as typed.
// =====================================================================

interface Props {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  placeholder?: string;
  className?: string;
}

export function CityInput({ value, onChange, id, placeholder = 'e.g. Milan', className }: Props) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | null>(null);

  const options = useMemo(() => {
    const list = citySuggestions(value, 6);
    // Nothing to offer once the box already holds the only suggestion.
    if (list.length === 1 && list[0].toLowerCase() === value.trim().toLowerCase()) return [];
    return list;
  }, [value]);

  const commit = () => {
    const canonical = normaliseCity(value);
    if (canonical !== value) onChange(canonical);
  };

  return (
    <div className="relative">
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let a click on a suggestion land before the list disappears.
          blurTimer.current = window.setTimeout(() => { setOpen(false); commit(); }, 120);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && open && options.length > 0) {
            e.preventDefault();
            onChange(options[0]);
            setOpen(false);
          } else if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
      />
      {open && options.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-md">
          {options.map((option) => (
            <li key={option}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left font-body text-sm hover:bg-accent/10"
                onMouseDown={(e) => {
                  // Fires before blur, so the value is set before the list closes.
                  e.preventDefault();
                  if (blurTimer.current) window.clearTimeout(blurTimer.current);
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CityInput;
