import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import AuthLayout from '@/components/shared/AuthLayout';
import { AuthButton, AuthErrorBanner, AuthField } from '@/components/shared/AuthUI';
import { verifyCertificate, verifyPath, type CertificateCheck } from '@/lib/certificate-api';

// =====================================================================
// minervaims.org/verify and /verify/<number>: anybody shown a Minerva
// certificate of membership can confirm it here, without an account.
//
// The answer is deliberately small: the name, the role and the semester as
// issued, the issue date, and whether it is still valid. Nothing else about
// the member is held against a certificate number, so nothing else can be
// shown. The page is not indexed: it is reached from a certificate.
// =====================================================================

const INK = '#141414';
const MUTED = '#737373';
const NAVY = '#1F0F4D';
const HAIRLINE = '#E0E0E0';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-4 py-2.5" style={{ borderTop: `1px solid ${HAIRLINE}` }}>
      <div className="font-body shrink-0 uppercase" style={{ width: '34%', fontSize: '11px', letterSpacing: '0.09em', color: MUTED, paddingTop: '2px' }}>{label}</div>
      <div className="font-body min-w-0 break-words" style={{ fontSize: '14.5px', color: INK, lineHeight: 1.45 }}>{value}</div>
    </div>
  );
}

export default function VerifyCertificate() {
  const { code: param } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState(param ?? '');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CertificateCheck | null>(null);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setResult(null);
    setFailed(null);
    if (!param) return;
    setInput(param);
    setChecking(true);
    verifyCertificate(param)
      .then((r) => { if (active) setResult(r); })
      .catch((e) => { if (active) setFailed(e instanceof Error ? e.message : 'The certificate could not be checked.'); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [param]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const code = input.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) return;
    navigate(verifyPath(code));
  };

  const issued = result?.issued_at
    ? new Date(result.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';

  return (
    <AuthLayout
      title="Verify a certificate"
      cardTitle="Verify a certificate"
      cardSubtitle="Enter the number printed on a Minerva certificate of membership, or scan its QR code."
    >
      {checking && (
        <div className="flex items-center justify-center gap-2 py-4 font-body" style={{ color: MUTED, fontSize: '14px' }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Checking the certificate…
        </div>
      )}

      {!checking && failed && <AuthErrorBanner>{failed}</AuthErrorBanner>}

      {!checking && result?.found && (
        <div className="mb-6">
          <div
            className="font-body mb-4 text-center uppercase"
            style={{
              padding: '9px 12px', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.14em',
              color: result.valid ? '#fff' : '#B23B3B',
              background: result.valid ? NAVY : 'rgba(178,59,59,0.06)',
              border: `1px solid ${result.valid ? NAVY : '#B23B3B'}`,
            }}
            role="status"
          >
            {result.valid ? 'Valid certificate' : 'No longer valid'}
          </div>
          <div style={{ borderBottom: `1px solid ${HAIRLINE}` }}>
            <Row label="Holder" value={result.holder_name ?? ''} />
            <Row label="Role" value={result.role_label ?? ''} />
            <Row label="Semester" value={result.semester_label ?? ''} />
            <Row label="Issued" value={issued} />
            <Row label="Number" value={result.code ?? ''} />
          </div>
          <p className="font-body mt-4" style={{ fontSize: '12.5px', color: MUTED, lineHeight: 1.6 }}>
            {result.valid
              ? 'This certificate was issued by Minerva Investment Management Society and attests membership in the role and semester shown. The Society operates independently of Bocconi University.'
              : 'This certificate was issued by Minerva Investment Management Society but has since been withdrawn. For any question, write to as.minerva@unibocconi.it.'}
          </p>
        </div>
      )}

      {!checking && result && !result.found && (
        <AuthErrorBanner>
          {result.reason === 'format'
            ? 'That is not a certificate number. It looks like MIMS-26F-7K3Q-9D2X.'
            : 'No certificate has this number. Check it against the certificate, or write to as.minerva@unibocconi.it.'}
        </AuthErrorBanner>
      )}

      <form onSubmit={submit}>
        <AuthField
          id="certificate-number"
          label="Certificate number"
          placeholder="MIMS-26F-7K3Q-9D2X"
          autoComplete="off"
          spellCheck={false}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <AuthButton type="submit" disabled={checking || !input.trim()}>
          Check the certificate
        </AuthButton>
      </form>
    </AuthLayout>
  );
}
