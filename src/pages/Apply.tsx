import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApplicationSettings } from '@/hooks/useApplicationSettings';
import { divisionLabels, type OrgDivision } from '@/lib/roles';
import {
  listQuestions, getMyApplication, submitApplication,
  ACADEMIC_YEAR_LABELS, type AcademicYear, type ApplicationQuestion,
} from '@/lib/applications-api';

const CORE: OrgDivision[] = ['equity', 'investment', 'macro', 'portfolio', 'quant'];

export default function Apply() {
  const { user, session } = useAuth();
  const { settings, isLoading } = useApplicationSettings();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<ApplicationQuestion[]>([]);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [checking, setChecking] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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

  useEffect(() => {
    if (user?.email) setF((p) => ({ ...p, email: p.email || user.email || '' }));
  }, [user]);

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

  const Shell = ({ children }: { children: React.ReactNode }) => (
    <>
      <Helmet><title>Apply | MIMS</title></Helmet>
      <div className="max-w-2xl mx-auto px-6 py-16">{children}</div>
    </>
  );

  if (isLoading || checking) return <Shell><div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div></Shell>;

  if (!settings.applicationsOpen) {
    return <Shell>
      <h1 className="font-serif text-heading text-accent mb-3">Applications are closed</h1>
      <p className="font-body text-muted-foreground">Recruitment is not open at the moment. Please check back next semester.</p>
      <Link to="/join" className="inline-block mt-6 text-accent underline font-body">Back to Join</Link>
    </Shell>;
  }

  if (!user) {
    return <Shell>
      <h1 className="font-serif text-heading text-accent mb-3">Sign in to apply</h1>
      <p className="font-body text-muted-foreground mb-6">Applications for {settings.semesterLabel} are open. Please sign in with your Bocconi email to start your application.</p>
      <Button asChild className="font-body"><Link to="/auth" state={{ from: '/apply' }}>Sign in / Create account</Link></Button>
    </Shell>;
  }

  if (alreadyApplied) {
    return <Shell>
      <h1 className="font-serif text-heading text-accent mb-3">Application received</h1>
      <p className="font-body text-muted-foreground mb-6">You have already submitted an application for {settings.semesterLabel}. Applications cannot be edited after submission.</p>
      <Button asChild className="font-body"><Link to="/admin">View status</Link></Button>
    </Shell>;
  }

  return (
    <Shell>
      <h1 className="font-serif text-heading text-accent mb-2">Apply — {settings.semesterLabel}</h1>
      <p className="font-body text-muted-foreground mb-8">Complete the form below. Your application cannot be edited after submission.</p>

      <form onSubmit={submit} className="space-y-5 font-body">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="First name *"><Input value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
          <Field label="Surname *"><Input value={f.surname} onChange={(e) => setF({ ...f, surname: e.target.value })} /></Field>
          <Field label="Bocconi ID / matriculation *"><Input value={f.bocconi_id} onChange={(e) => setF({ ...f, bocconi_id: e.target.value })} /></Field>
          <Field label="Bocconi email *"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone *"><Input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <Field label="LinkedIn"><Input value={f.linkedin_url} onChange={(e) => setF({ ...f, linkedin_url: e.target.value })} placeholder="https://linkedin.com/in/…" /></Field>
          <Field label="Degree / course code *"><Input value={f.degree_course} onChange={(e) => setF({ ...f, degree_course: e.target.value })} /></Field>
          <Field label="Academic year *">
            <Select value={f.academic_year} onValueChange={(v) => setF({ ...f, academic_year: v as AcademicYear })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{(Object.keys(ACADEMIC_YEAR_LABELS) as AcademicYear[]).map((y) => <SelectItem key={y} value={y}>{ACADEMIC_YEAR_LABELS[y]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="First-choice division *">
            <Select value={f.first_choice} onValueChange={(v) => setF({ ...f, first_choice: v as OrgDivision })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{CORE.map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Second-choice division">
            <Select value={f.second_choice} onValueChange={(v) => setF({ ...f, second_choice: v as OrgDivision })}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>{CORE.filter((d) => d !== f.first_choice).map((d) => <SelectItem key={d} value={d}>{divisionLabels[d]}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>

        {f.first_choice && questionFor && (
          <div className="border border-separator p-4 bg-muted/30">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Written question — {divisionLabels[f.first_choice]}</div>
            <p className="text-sm text-foreground">{questionFor}</p>
          </div>
        )}

        <Field label="CV (PDF) *"><Input type="file" accept="application/pdf,.pdf" onChange={(e) => setCv(e.target.files?.[0] ?? null)} /></Field>
        <Field label="Written answer (PDF) *"><Input type="file" accept="application/pdf,.pdf" onChange={(e) => setAnswer(e.target.files?.[0] ?? null)} /></Field>

        <Button type="submit" disabled={submitting} className="font-body">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Submitting…</> : 'Submit application'}
        </Button>
      </form>
    </Shell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="font-body">{label}</Label>{children}</div>;
}
