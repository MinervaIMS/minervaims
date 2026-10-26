import { useAuth } from '@/contexts/AuthContext';
import {
  downloadGreenbook, greenbookRegister, removeGreenbook, uploadGreenbook,
  type Greenbook,
} from '@/lib/brainteasers-api';
import { BookView, type BookCopy } from '../BookView';

// =====================================================================
// The greenbook: the one file of Career > Brainteasers that can be
// downloaded, and only as the reader's own copy, with their name, email
// and the date on every page (see _shared/pdf-watermark.ts). Every
// download is recorded. The President and the admin account replace or
// remove it and can see who has taken a copy.
//
// The card and its actions are the Career section's book view (BookView,
// shared with the guides of IB Questions since Step 101); what is the
// greenbook's own is here: its words, and where its chapters meet the
// types of question.
// =====================================================================

// Where the book's chapters meet the types of question here (the first
// edition's chapters), so the two are read together.
const CHAPTERS: { ch: string; title: string; types: string }[] = [
  { ch: '2', title: 'Brain Teasers', types: 'Reasoning' },
  { ch: '3', title: 'Calculus and Linear Algebra', types: 'Math' },
  { ch: '4', title: 'Probability Theory', types: 'Probability, Statistics' },
  { ch: '5', title: 'Stochastic Process and Stochastic Calculus', types: 'Probability' },
  { ch: '6', title: 'Finance', types: 'Option Theory, Finance' },
];

// What the greenbook is, who it is for, and why it matters.
const ABOUT: { label: string; text: string }[] = [
  { label: 'What it is', text: '"A Practical Guide to Quantitative Finance Interviews" by Xinfeng Zhou, known as the greenbook for its cover: interview problems in brain teasers, probability, calculus and linear algebra, stochastic processes and finance, each with a worked solution.' },
  { label: 'Who it is for', text: 'Anyone preparing for quantitative trading, quantitative research, sales and trading or market making interviews, and anyone whose interviews include brain teasers, probability or option questions.' },
  { label: 'Why it matters', text: 'It is the standard preparation for these interviews: many questions asked in first rounds are variations of its problems. Working through it teaches the methods, so you can solve a question you have never seen, quickly and out loud.' },
];

export function GreenbookView({ greenbook, canReplace, perDay, onChange }: {
  greenbook: Greenbook | null;
  canReplace: boolean;
  perDay: number;
  onChange: (g: Greenbook | null) => void;
}) {
  const { session } = useAuth();
  const isTheBook = !!greenbook && /quantitative finance interviews/i.test(greenbook.title || '');

  const copy: BookCopy = {
    cardTitle: 'The greenbook',
    cardSubtitle: 'The one file you can download here',
    help: { page: 'career-brainteasers', topic: 'greenbook' },
    name: 'Greenbook',
    filePrefix: 'Greenbook',
    inSentence: 'the greenbook',
    emptyTitle: 'The greenbook is on its way',
    emptyBody: 'It appears here, to download as your own copy, once the President has uploaded it.',
    pdfLabel: 'Choose the greenbook PDF',
    about: ABOUT,
    aboutTitle: 'What the greenbook is',
    aboutSubtitle: 'Who it is for, and why it matters',
    readWith: (
      <>
        <h3 className="mb-1 mt-6 border-b border-separator pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-accent">Read it with the questions</h3>
        {isTheBook ? (
          <ul className="divide-y divide-separator">
            {CHAPTERS.map((c) => (
              <li key={c.ch} className="flex items-baseline gap-3 py-2.5">
                <span className="w-8 shrink-0 font-serif text-lg text-accent">{c.ch}</span>
                <span className="min-w-0"><span className="block text-[15px] text-foreground">{c.title}</span><span className="block text-xs text-muted-foreground">Questions: {c.types}</span></span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Work through a chapter, then filter the questions by the same type and test yourself: the book explains the method, the questions check that it stuck.</p>
        )}
      </>
    ),
  };

  return (
    <BookView
      book={greenbook} canReplace={canReplace} perDay={perDay} onChange={onChange} copy={copy}
      actions={{
        download: () => downloadGreenbook(session),
        upload: (file, title) => uploadGreenbook(session, file, title),
        remove: () => removeGreenbook(session),
        register: () => greenbookRegister(session),
      }}
    />
  );
}

export default GreenbookView;
