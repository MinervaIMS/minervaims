import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  ONE_ASSOCIATION, commitmentText, myDeclarations, signCommitment, textOfSignature, typedNameOk,
  type MyDeclarations, type SignedDocument,
} from '@/lib/declarations-api';

// =====================================================================
// The semester commitment and the member's signed documents (Step 97),
// on My Profile.
// ---------------------------------------------------------------------
// When the semester's commitment waits for an answer, the panel sits at
// the top of the page (the email's button lands here, ?commitment=1):
// confirm or decline, with the text of each, a ticked box and a typed
// name. While the Board asks for it, confirming also signs the
// one-association declaration, as a separate signature with its own box
// and name. Answered, the answer becomes one line, with what the member
// has signed beside it (SignaturesStrip). Nothing waits: nothing shows.
// =====================================================================

const shell = 'w-full rounded-xl border border-separator bg-background p-5 sm:p-6';

function TextBox({ intro, clauses, closing }: { intro: string; clauses: string[]; closing?: string }) {
  return (
    <div className="border border-separator p-3 text-sm text-foreground space-y-2">
      <p>{intro}</p>
      <ol className="list-decimal pl-5 space-y-1">{clauses.map((c) => <li key={c}>{c}</li>)}</ol>
      {closing && <p>{closing}</p>}
    </div>
  );
}

export function useMyDeclarations() {
  const { session } = useAuth();
  const [data, setData] = useState<MyDeclarations | null>(null);
  const load = async () => {
    try { setData(await myDeclarations(session)); } catch { setData(null); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, []);
  return { data, reload: load };
}

export function CommitmentPanel({ data, onDone }: { data: MyDeclarations | null; onDone: () => void }) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [params] = useSearchParams();
  const ref = useRef<HTMLElement>(null);
  const [decision, setDecision] = useState<'confirmed' | 'declined' | ''>('');
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState('');
  const [declAgreed, setDeclAgreed] = useState(false);
  const [declName, setDeclName] = useState('');
  const [busy, setBusy] = useState(false);

  // From the email's button: bring the panel into view.
  useEffect(() => {
    if (data?.request && params.get('commitment') === '1') ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [data, params]);

  if (!data?.campaign || !data.request) return null;
  const semester = data.campaign.semester_label;

  // Answered: the one line is SignaturesStrip's.
  if (data.request.status !== 'pending') return null;

  const needsDeclaration = decision === 'confirmed' && data.required && !data.declarationSigned;
  const text = decision ? commitmentText(semester, decision) : null;
  const ready = !!decision && agreed && typedNameOk(name) && (!needsDeclaration || (declAgreed && typedNameOk(declName)));

  const submit = async () => {
    if (!decision || !ready) return;
    setBusy(true);
    try {
      await signCommitment(session, {
        decision, typed_name: name.trim(), agreed,
        declaration: needsDeclaration ? { typed_name: declName.trim(), agreed: declAgreed } : undefined,
      });
      toast({ title: 'Thank you, your answer is recorded', description: needsDeclaration ? 'Two short receipts are on their way to your email address: your answer, and the declaration.' : 'A receipt is on its way to your email address.' });
      onDone();
    } catch (e) {
      toast({ title: 'Could not record your answer', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally { setBusy(false); }
  };

  return (
    <section ref={ref} id="commitment" aria-labelledby="commitment-heading" className={`${shell} mb-4 lg:shrink-0 border-accent/40`}>
      <div className="mb-4 pb-3 border-b border-separator">
        <h2 id="commitment-heading" className="font-serif text-xl text-accent leading-tight">Your commitment for {semester}</h2>
        <p className="mt-1 text-sm text-muted-foreground">Every member is asked once a semester. Please answer: if you cannot commit, the Board would rather know now.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <RadioGroup value={decision} onValueChange={(v) => { setDecision(v as 'confirmed' | 'declined'); setAgreed(false); }} className="gap-2" aria-label="Your answer">
            {([['confirmed', 'I confirm my commitment for this semester'], ['declined', 'I cannot commit this semester']] as const).map(([v, l]) => (
              <label key={v} htmlFor={`cm-${v}`} className={`flex items-center gap-3 border p-3 cursor-pointer text-sm ${decision === v ? 'border-accent bg-accent/5' : 'border-separator'}`}>
                <RadioGroupItem id={`cm-${v}`} value={v} />
                <span>{l}</span>
              </label>
            ))}
          </RadioGroup>
          {text && (
            <>
              <TextBox intro={text.intro} clauses={text.clauses} />
              <label htmlFor="cm-agree" className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox id="cm-agree" checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span>{text.agreement}</span>
              </label>
              <div className="space-y-1.5">
                <Label htmlFor="cm-name">Sign by writing your full name</Label>
                <Input id="cm-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your full name" autoComplete="off" className="font-serif text-lg h-11" />
              </div>
            </>
          )}
        </div>
        {needsDeclaration && (
          <div className="space-y-4 lg:border-l lg:border-separator lg:pl-6">
            <div className="text-xs uppercase tracking-wider text-accent">A separate signature: {ONE_ASSOCIATION.title.toLowerCase()}</div>
            <TextBox intro={ONE_ASSOCIATION.intro} clauses={ONE_ASSOCIATION.clauses} closing={ONE_ASSOCIATION.closing} />
            <label htmlFor="cm-decl-agree" className="flex items-start gap-2 text-sm cursor-pointer">
              <Checkbox id="cm-decl-agree" checked={declAgreed} onCheckedChange={(v) => setDeclAgreed(v === true)} className="mt-0.5" />
              <span>{ONE_ASSOCIATION.agreement}</span>
            </label>
            <div className="space-y-1.5">
              <Label htmlFor="cm-decl-name">Sign the declaration by writing your full name</Label>
              <Input id="cm-decl-name" value={declName} onChange={(e) => setDeclName(e.target.value)} placeholder="Your full name" autoComplete="off" className="font-serif text-lg h-11" />
            </div>
          </div>
        )}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button disabled={!ready || busy} onClick={submit}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign and send'}</Button>
        <span className="text-xs text-muted-foreground">The time is recorded with your signature.</span>
      </div>
    </section>
  );
}

const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * One line at the top of My Profile: the member's answer for the semester,
 * once given, and what they have signed. The signature in the Workspace is
 * the record, so there is nothing to download: Read shows the words that
 * were signed (by their version), the typed name and the date.
 */
export function SignaturesStrip({ data }: { data: MyDeclarations | null }) {
  const [open, setOpen] = useState<SignedDocument | null>(null);
  const answered = data?.campaign && data.request && data.request.status !== 'pending' ? data.request : null;
  const docs = data?.documents ?? [];
  if (!answered && !docs.length) return null;
  const text = open ? textOfSignature(open.text_version, open.semester_label, open.decision) : null;
  const label = (d: SignedDocument) => (d.kind === 'one_association'
    ? `One-association declaration, ${d.semester_label}`
    : `Commitment ${d.decision === 'declined' ? 'declined' : 'confirmed'}, ${d.semester_label}`);
  return (
    <section aria-label="Your answer and what you have signed" className={`${shell} mb-4 lg:shrink-0 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm py-3 sm:py-3`}>
      {answered && (
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-accent shrink-0" aria-hidden="true" />
          <span>Your answer for {data!.campaign!.semester_label}: <strong>{answered.status === 'confirmed' ? 'you confirmed your commitment' : 'you cannot commit this semester'}</strong>{answered.responded_at ? `, on ${longDate(answered.responded_at)}` : ''}.</span>
        </span>
      )}
      {docs.length > 0 && (
        <span id="signed-documents" className="flex flex-wrap items-center gap-2 lg:ml-auto">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Signed</span>
          {docs.map((d) => (
            <Button key={d.id} data-ro size="sm" variant="outline" onClick={() => setOpen(d)} aria-label={`Read: ${label(d)}`} title={`Signed ${longDate(d.signed_at)}`}>
              {label(d)}
            </Button>
          ))}
        </span>
      )}
      <Dialog open={!!open} onOpenChange={(o) => { if (!o) setOpen(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif text-accent">{text?.title ?? 'What you signed'}</DialogTitle>
            <DialogDescription>
              {open ? `Signed by ${open.typed_name} on ${longDate(open.signed_at)}, text version ${open.text_version}.` : ''}
            </DialogDescription>
          </DialogHeader>
          {text ? (
            <TextBox intro={text.intro} clauses={text.clauses} closing={text.closing || undefined} />
          ) : (
            <p className="text-sm text-muted-foreground">This version of the text is no longer shown here; ask the Board for it.</p>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
