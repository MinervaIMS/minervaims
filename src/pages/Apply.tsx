import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BOCCONI_PROGRAMMES } from '@/lib/bocconi';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationSettings } from '@/hooks/useApplicationSettings';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import logoFullColor from '@/assets/logo-full-color.png';
import {
  listQuestions, getMyApplication, submitApplication,
  ACADEMIC_YEAR_LABELS, type AcademicYear, type ApplicationQuestion,
} from '@/lib/applications-api';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

// Full-screen immersive shell: plain black background (an animated background
// will replace it later) with a centred white card, login-page style.
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Helmet><title>Apply | MIMS</title></Helmet>
      <div className="min-h-screen w-full bg-black flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow-2xl border border-separator px-6 sm:px-10 py-10">
          <div className="flex justify-center mb-6">
            <img src={logoFullColor} alt="Minerva Investment Management Society" className="h-28 w-auto" />
          </div>
          {children}
        </div>
      </div>
    </>
  );
}

export default function Apply() {
  const { user, session } = useAuth();
  const { settings, isLoading } = useApplicationSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [consent, setConsent] = useState(false);

  const [f, setF] = useState({
    first_name: '', surname: '', bocconi_id: '', email: '', phone: '', linkedin_url: '',
    degree_course: '', academic_year: '' as AcademicYear | '', first_choice: '' as OrgDivision | '', second_choice: '' as OrgDivision | '',
  });
  const [cv, setCv] = useState<File | null>(null);
  const [answer, setAnswer] = useState<File | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setQuestions(await listQuestions());
        if (user) { const mine = await getMyApplication(); setAlreadyApplied(!!mine); }
      } catch { /* ignore */ } finally { setChecking(false); }
    })();
  }, [user]);

  useEffect(() => { if (user?.email) setF((p) => ({ ...p, email: p.email || user.email || '' })); }, [user]);

  const questionFor = useMemo(
    () => (f.first_choice ? questions.find((q) => q.division === f.first_choice)?.question : ''),
    [questions, f.first_choice],
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const required = ['first_name', 'surname', 'bocconi_id', 'email', 'phone', 'degree_course', 'academic_year', 'first_choice'] as const;
    for (const k of required) if (!f[k]) { toast({ title: 'Please complete all required fields', variant: 'destructive' }); return; }
    if (!cv) { toast({ title: 'Please attach your CV (PDF)', variant: 'destructive' }); return; }
    if (!answer) { toast({ title: 'Please attach your written answer (PDF)', variant: 'destructive' }); return; }
    if (!consent) { toast({ title: 'Please confirm the consent statement to continue', variant: 'destructive' }); return; }

    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, v));
      fd.append('cv', cv); fd.append('answer', answer);
      await submitApplication(session, fd);
      toast({ title: 'Application submitted', description: 'You can follow its status in your workspace.' });
      navigate('/admin');
    } catch (err) {
      toast({ title: 'Could not submit', description: err instanceof Error ? err.message : undefined, variant: 'destructive' });
    } finally { setSubmitting(false); }
  };

  if (isLoading || checking) return <Shell><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Shell>;

  if (!settings.applicationsOpen) {
    return <Shell>
      <h1 className="font-serif text-3xl text-accent text-center mb-3">Applications are closed</h1>
      <p className="font-body text-muted-foreground text-center">Recruitment is not open at the moment. Please check back next semester.</p>
      <div className="text-center mt-6"><Link to="/join" className="text-accent underline font-body">Back to Join</Link></div>
    </Shell>;
  }

  if (!user) {
    return <Shell>
      <h1 className="font-serif text-3xl text-accent text-center mb-3">Sign in to apply</h1>
      <p className="font-body text-muted-foreground text-center mb-6">Applications for {settings.semesterLabel} are open. Please sign in with your Bocconi email to start your application.</p>
      <div className="text-center"><Button asChild className="font-body"><Link to="/auth" state={{ from: '/apply' }}>Sign in / Create account</Link></Button></div>
    </Shell>;
  }

  if (alreadyApplied) {
    return <Shell>
      <h1 className="font-serif text-3xl text-accent text-center mb-3">Application received</h1>
      <p className="font-body text-muted-foreground text-center mb-6">You have already submitted an application for {settings.semesterLabel}. Applications cannot be edited after submission.</p>
      <div className="text-center"><Button asChild className="font-body"><Link to="/admin">View status</Link></Button></div>
    </Shell>;
  }

  return (
    <Shell>
      <h1 className="font-serif text-3xl text-accent text-center mb-2">Application Form — {settings.semesterLabel}</h1>
      <div className="font-body text-sm text-muted-foreground space-y-2 mb-8 max-w-xl mx-auto text-center">
        <p>Complete the form below. We hold interviews on a <strong>rolling basis</strong> until spots are filled, so we encourage you to apply as soon as you are ready.</p>
        <p>Questions about the process? Contact us at <a href="mailto:as.minerva@unibocconi.it" className="text-accent underline">as.minerva@unibocconi.it</a>.</p>
        <p className="text-xs">Your application cannot be edited after submission. Fields marked * are required.</p>
      </div>

      <form onSubmit={submit} className="space-y-5 font-body">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name *"><Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} placeholder="e.g. Maria" /></Field>
          <Field label="Surname *"><Input value={f.surname} onChange={(e) => setF({ ...f, surname: e.target.value })} placeholder="e.g. Rossi" /></Field>
          <Field label="Bocconi ID / matriculation *"><Input value={f.bocconi_id} onChange={(e) => setF({ ...f, bocconi_id: e.target.value })} placeholder="e.g. 3123456" /></Field>
          <Field label="Bocconi email *"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="name.surname@studbocconi.it" /></Field>
          <Field label="Phone *"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} placeholder="+39 333 000 0000" /></Field>
          <Field label="LinkedIn"><Input value={f.linkedin_url} onChange={(e) => setF({ ...f, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" /></Field>
          <Field label="Bocconi programme *">
            <Select value={f.degree_course} onValueChange={(v) => setF({ ...f, degree_course: v })}>
              <SelectTrigger><SelectValue placeholder="Select your programme" /></SelectTrigger>
              <SelectContent>
                {BOCCONI_PROGRAMMES.map((g) => (
                  <SelectGroup key={g.label}>
                    <SelectLabel>{g.label}</SelectLabel>
                    {g.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Academic year *">
            <Select value={f.academic_year} onValueChange={(v) => setF({ ...f, academic_year: v as AcademicYear })}>
              <SelectTrigger><SelectValue placeholder="Select your year…" /></SelectTrigger>
              <SelectContent>{(Object.keys(ACADEMIC_YEAR_LABELS) as AcademicYear[]).map((y) => <SelectItem key={y} value={y}>{ACADEMIC_YEAR_LABELS[y]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="First-choice division *">
            <Select value={f.first_choice} onValueChange={(v) => setF({ ...f, first_choice: v as OrgDivision })}>
              <SelectTrigger><SelectValue placeholder="Choose a division…" /></SelectTrigger>
              <SelectContent>{CORE.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Second-choice division">
            <Select value={f.second_choice} onValueChange={(v) => setF({ ...f, second_choice: v as OrgDivision })}>
              <SelectTrigger><SelectValue placeholder="Optional…" /></SelectTrigger>
              <SelectContent>{CORE.filter((d) => d !== f.first_choice).map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        {/* Division question */}
        {f.first_choice ? (
          <div className="border border-accent/30 bg-accent/5 p-4 rounded">
            <div className="text-xs uppercase tracking-wider text-accent mb-1">Written question — {divisionLabels[f.first_choice]}</div>
            <p className="text-sm text-foreground">{questionFor || 'The question for this division will be published shortly.'}</p>
            <p className="text-xs text-muted-foreground mt-2">Answer the question for your first-choice division. You may also answer additional divisions — if you do, combine everything into the same PDF.</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Select your first-choice division to see its written question.</p>
        )}

        {/* Document instructions */}
        <div className="text-xs text-muted-foreground border border-separator rounded p-3 space-y-1">
          <p className="font-medium text-foreground">Document guidelines</p>
          <p>• <strong>CV</strong>: one page, finance-style layout, your most recent version. PDF named <code>Surname_Name_CV.pdf</code>.</p>
          <p>• <strong>Written answer</strong>: a single PDF named <code>Surname_Name_Answer.pdf</code>. Place any charts/tables in an appendix after the first page.</p>
        </div>

        <Field label="CV (PDF) *"><Input type="file" accept="application/pdf,.pdf" onChange={(e) => setCv(e.target.files?.[0] ?? null)} /></Field>
        <Field label="Written answer (PDF) *"><Input type="file" accept="application/pdf,.pdf" onChange={(e) => setAnswer(e.target.files?.[0] ?? null)} /></Field>

        {/* GDPR consent */}
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-1" />
          <span className="text-xs text-muted-foreground">
            I consent to Minerva Investment Management Society collecting and processing the personal data and documents (including my CV) I submit through this form for the purpose of evaluating my application, in accordance with the GDPR (EU) 2016/679 and the society’s privacy policy. *
          </span>
        </label>

        <Button type="submit" disabled={submitting} className="w-full font-body">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : 'Submit application'}
        </Button>
      </form>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="font-body">{label}</Label>{children}</div>;
}
