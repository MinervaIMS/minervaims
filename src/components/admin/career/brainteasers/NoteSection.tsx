import { useEffect, useRef, useState } from 'react';

// =====================================================================
// "My notes" under a question: private to the member, saved by itself a
// moment after they stop typing, and when they leave the question.
// Shared by Brainteasers and IB Questions (Step 101); `idPrefix` keeps
// each page's ids its own.
// =====================================================================

const NOTE_MAX = 2000;

export function NoteSection({ pid, initial, onNote, idPrefix = 'bt', placeholder = 'The trick, a formula, where you went wrong...' }: {
  /** The question the note belongs to. */
  pid: string | undefined;
  /** The note as it is stored. */
  initial: string | null | undefined;
  /** Saves the note of the question it was written for; resolves when it is stored. */
  onNote: (id: string, note: string) => Promise<void>;
  idPrefix?: string;
  placeholder?: string;
}) {
  const [note, setNote] = useState(initial ?? '');
  const [noteState, setNoteState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const saved = useRef(initial ?? '');
  const timer = useRef<number | null>(null);
  // The question the note on screen belongs to. It changes only once the
  // next question's note is in place, so a note still being saved as the
  // reader moves on is saved where it was written, never on the next one.
  const noteFor = useRef(pid);

  // A different question brings its own note.
  useEffect(() => {
    noteFor.current = pid;
    setNote(initial ?? '');
    saved.current = initial ?? '';
    setNoteState('idle');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pid]);

  const flush = async (value: string) => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    const id = noteFor.current;
    if (!id || value.trim() === saved.current.trim()) return;
    setNoteState('saving');
    try {
      await onNote(id, value);
      if (noteFor.current === id) { saved.current = value; setNoteState('saved'); }
    } catch { if (noteFor.current === id) setNoteState('error'); }
  };
  const onNoteChange = (v: string) => {
    setNote(v);
    setNoteState('idle');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flush(v); }, 1200);
  };
  // Leaving the question (or the page) keeps what was typed.
  const latest = useRef({ note, flush });
  latest.current = { note, flush };
  useEffect(() => () => { if (timer.current) void latest.current.flush(latest.current.note); }, [pid]);

  const id = `${idPrefix}-note`;
  return (
    <section aria-labelledby={id} className="border-t border-separator pt-5">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 id={id} className="font-body text-xs font-semibold uppercase tracking-wider text-accent">My notes</h3>
        <span className="text-xs text-muted-foreground" aria-live="polite">
          {noteState === 'saving' ? 'Saving...' : noteState === 'saved' ? 'Saved' : noteState === 'error' ? 'Not saved: check your connection' : 'Only you can read them'}
        </span>
      </div>
      <textarea
        data-ro value={note} maxLength={NOTE_MAX} rows={3}
        onChange={(e) => onNoteChange(e.target.value)} onBlur={() => void flush(note)}
        aria-labelledby={id} placeholder={placeholder}
        className="w-full resize-y rounded-md border border-input bg-background px-3 py-2 font-body text-base outline-none focus-visible:ring-2 focus-visible:ring-ring md:text-sm"
      />
    </section>
  );
}

export default NoteSection;
