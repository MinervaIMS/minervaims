import { useState } from 'react';
import { X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { TAGS_MAX, TAG_LENGTH_MAX, normaliseTags } from '@/lib/report-meta';

// Tags of a report: typed and confirmed with Enter or a comma; at most
// TAGS_MAX, each at most TAG_LENGTH_MAX characters, a tag listed once
// whatever its capitals (the same rules the server applies).

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  id?: string;
}

export function TagsInput({ value, onChange, placeholder = 'Add a tag and press Enter', id }: Props) {
  const [draft, setDraft] = useState('');
  const commit = () => {
    const parts = draft.split(',').map((t) => t.trim()).filter(Boolean);
    if (parts.length) onChange(normaliseTags([...value, ...parts]));
    setDraft('');
  };
  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((t) => (
            <li key={t} className="inline-flex items-center gap-1 border border-separator px-2 py-0.5 font-body text-sm">
              {t}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== t))} aria-label={`Remove the tag ${t}`} className="text-muted-foreground hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.length < TAGS_MAX && (
        <Input
          id={id}
          value={draft}
          maxLength={TAG_LENGTH_MAX * 3}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); }
            if (e.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={commit}
          placeholder={placeholder}
        />
      )}
      <p className="font-body text-xs text-muted-foreground">Up to {TAGS_MAX} tags of {TAG_LENGTH_MAX} characters, e.g. a sector, a country or a method.</p>
    </div>
  );
}

export default TagsInput;
