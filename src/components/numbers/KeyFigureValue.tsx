import { formatKeyNumber, type KeyNumber } from '@/lib/key-numbers';
import './numbers.css';

/**
 * A key figure's text: final from the first render, never counted up.
 *
 * With no figure yet (a development server with no embedded data, on a
 * first visit) it renders an empty box of about the right size, with no
 * text at all, rather than a zero or a placeholder number.
 *
 * `reveal` splits the text into one span per character so a stats section
 * can let them rise into place (see numbers.css). The text content is
 * still exactly the figure, so a reader, a screen reader or a crawler
 * reading the page at any moment gets the final value.
 */
export function KeyFigureValue({ figure, reveal = false }: { figure: KeyNumber | null; reveal?: boolean }) {
  if (!figure) {
    return <span data-kn="pending" aria-hidden="true" className="inline-block align-middle" style={{ height: '1em', width: '2.2em' }} />;
  }
  const text = formatKeyNumber(figure);
  // `data-kn` marks a key figure for the number-rule checks, which read
  // its text frame by frame and fail if it ever differs from the final one.
  if (!reveal) return <span data-kn="">{text}</span>;
  return (
    <span data-kn="">
      {Array.from(text).map((ch, i) => (
        <span key={i} className="kn-ch" style={{ ['--kn-i' as string]: i }}>{ch}</span>
      ))}
    </span>
  );
}
