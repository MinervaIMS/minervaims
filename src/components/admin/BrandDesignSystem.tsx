import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import { HelpDot } from '@/components/admin/help/HelpSystem';
import { DesignSystemMarkdown } from '@/components/admin/brand/DesignSystemMarkdown';
import { splitReadme } from '@/lib/design-system-md';
import { brandKitStatus, downloadBrandKit, formatSize, uploadBrandKit, type BrandPackage } from '@/lib/brand-kit-api';
import readme from '@/content/design-system/README.md?raw';
import github from '@/content/design-system/github.md?raw';
import logoFullColor from '@/assets/brand/logo-full-color.png.asset.json';
import logoFullWhite from '@/assets/brand/logo-full-white.png.asset.json';
import logoMarkColor from '@/assets/brand/logo-mark-color.png.asset.json';
import logoMarkWhite from '@/assets/brand/logo-mark-white.png.asset.json';
import communityLogo from '@/assets/brand/community-logo.png.asset.json';
import ctaLion from '@/assets/brand/cta-lion.png.asset.json';

/**
 * Brand & Design: the Minerva Investment Management Society design system.
 *
 * THE TEXT IS THE PACKAGE'S OWN. Every chapter is drawn from the README of
 * the design system package (src/content/design-system/README.md, copied
 * unchanged from the ZIP), so the page and the package cannot drift apart:
 * a new edition is published by replacing README.md and github.md in that
 * folder, and uploading the new ZIP from this page. Where a picture says
 * more than a sentence (the logos, the type scale, the colours, the
 * shadows), a specimen follows the chapter it illustrates.
 *
 * THE PACKAGE ITSELF is downloadable in full from the top of the page,
 * through the `brand-kit` function: private storage, one-minute links,
 * every download recorded.
 */

const { intro, chapters } = splitReadme(readme);

/** "2026-07-30T19:10:00Z" in github.md, as "30 July 2026". */
const syncedOn = (() => {
  const m = /date:\s*(\S+)/.exec(github);
  const d = m ? new Date(m[1]) : null;
  return d && !Number.isNaN(d.getTime())
    ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    : null;
})();

const Section = ({ id, title, children }: { id: string; title: string; children: ReactNode }) => (
  <section id={id} className="mb-12 scroll-mt-4">
    <h2 className="font-serif text-heading text-accent mb-6 pb-3 border-b border-separator">{title}</h2>
    <div className="space-y-4 font-body text-body text-foreground">{children}</div>
  </section>
);

const Specimen = ({ children }: { children: ReactNode }) => (
  <div className="pt-4">
    <div className="mb-3 font-body text-xs uppercase tracking-wider text-muted-foreground">Specimen</div>
    {children}
  </div>
);

const Swatch = ({ name, hex, note, dark }: { name: string; hex: string; note?: string; dark?: boolean }) => (
  <div className="border border-separator">
    <div className="h-20" style={{ background: hex }} />
    <div className="p-3">
      <div className="font-serif text-body text-accent">{name}</div>
      <div className="font-body text-small text-muted-foreground uppercase tracking-wider">{hex}</div>
      {note && <div className="font-body text-small text-muted-foreground mt-1">{note}</div>}
      {dark && <div className="font-body text-xs text-muted-foreground mt-1">(dark surface)</div>}
    </div>
  </div>
);

/** The pictures that follow a chapter, by chapter number. */
const SPECIMENS: Record<string, ReactNode> = {
  '4': (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ">
            <div className="border border-separator">
              <div className="h-40 bg-background flex items-center justify-center p-6">
                <img src={logoMarkColor.url} alt="MIMS mark, navy" className="max-h-full max-w-full" />
              </div>
              <div className="p-3">
                <div className="font-serif text-body text-accent">Mark: navy</div>
                <div className="font-body text-small text-muted-foreground">Navy M mark (two Ionic columns flanked by lions) on light backgrounds.</div>
              </div>
            </div>
            <div className="border border-separator">
              <div className="h-40 flex items-center justify-center p-6" style={{ background: '#1F0F4D' }}>
                <img src={logoMarkWhite.url} alt="MIMS mark, white" className="max-h-full max-w-full" />
              </div>
              <div className="p-3">
                <div className="font-serif text-body text-accent">Mark: white</div>
                <div className="font-body text-small text-muted-foreground">On dark, navy or photographic backgrounds.</div>
              </div>
            </div>
            <div className="border border-separator">
              <div className="h-40 bg-background flex items-center justify-center p-6">
                <img src={logoFullColor.url} alt="MIMS full lock-up, colour" className="max-h-full max-w-full" />
              </div>
              <div className="p-3">
                <div className="font-serif text-body text-accent">Full lock-up: colour</div>
                <div className="font-body text-small text-muted-foreground">Mark plus society name, light backgrounds.</div>
              </div>
            </div>
            <div className="border border-separator">
              <div className="h-40 flex items-center justify-center p-6" style={{ background: '#000000' }}>
                <img src={logoFullWhite.url} alt="MIMS full lock-up, white" className="max-h-full max-w-full" />
              </div>
              <div className="p-3">
                <div className="font-serif text-body text-accent">Full lock-up: white</div>
                <div className="font-body text-small text-muted-foreground">Dark backgrounds: the footer lock-up, 144–192px tall.</div>
              </div>
            </div>
            <div className="border border-separator">
              <div className="h-40 bg-background flex items-center justify-center p-6">
                <img src={communityLogo.url} alt="Community lion badge" className="max-h-full max-w-full rounded-full" />
              </div>
              <div className="p-3">
                <div className="font-serif text-body text-accent">Community / Alumni badge</div>
                <div className="font-body text-small text-muted-foreground">Lion-head badge in a navy circle.</div>
              </div>
            </div>
            <div className="border border-separator">
              <div className="h-40 bg-background flex items-center justify-center p-6">
                <img src={ctaLion.url} alt="CTA lion badge" className="max-h-full max-w-full rounded-full" />
              </div>
              <div className="p-3">
                <div className="font-serif text-body text-accent">CTA lion badge</div>
                <div className="font-body text-small text-muted-foreground">Round white lion badge for calls to action.</div>
              </div>
            </div>
          </div>
  ),
  '5': (
          <div className="space-y-4 bg-muted p-6">
            <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '4rem', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#1F0F4D' }}>Hero: 64px</div>
            <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '3rem', lineHeight: 1.15, letterSpacing: '-0.01em', color: '#1F0F4D' }}>Display H1: 48px</div>
            <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '2rem', lineHeight: 1.2, letterSpacing: '-0.01em', color: '#1F0F4D' }}>Section H2: 32px</div>
            <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '1.5rem', lineHeight: 1.3, color: '#141414' }}>Subheading H3: 24px</div>
            <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '1.125rem', color: '#141414' }}>Lead paragraph: 18px, Calibri body.</div>
            <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '1rem', color: '#141414' }}>Body: 16px, line-height 1.6.</div>
            <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '0.875rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Eyebrow / small: 14px</div>
          </div>
  ),
  '6': (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Swatch name="Navy (accent)" hex="#1F0F4D" note="Headings, links, primary graphics, hover fills" />
        <Swatch name="White" hex="#FFFFFF" note="The page" />
        <Swatch name="Ink" hex="#141414" note="Body text, dark blocks" />
        <Swatch name="Footer black" hex="#000000" note="Footer only" dark />
        <Swatch name="Grey (surface)" hex="#F5F5F5" note="The single light surface" />
        <Swatch name="Separator" hex="#D9D9D9" note="Hairline rules" />
        <Swatch name="Border" hex="#E0E0E0" note="UI chrome: header, dropdowns, inputs" />
        <Swatch name="Muted text" hex="#737373" note="Secondary text" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Swatch name="Void" hex="#05030F" note="Animated backdrops" dark />
        <Swatch name="Deep navy" hex="#150B33" note="Division pages" dark />
        <Swatch name="Navy" hex="#1F0F4D" note="The accent, everywhere" dark />
        <Swatch name="Alumni accent" hex="#241068" note="Alumni pages, chart 5" dark />
        <Swatch name="Mid purple" hex="#7E5BC2" note="Dot field, chart 3" />
        <Swatch name="Light purple" hex="#AFA2D2" note="Text on navy, chart 2" />
        <Swatch name="Tint" hex="#ECE9F4" note="The hover tint" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Swatch name="Positive" hex="#047857" note="A permission held, a step completed" />
        <Swatch name="Caution" hex="#F59E0B" note="Read before acting" />
        <Swatch name="Destructive" hex="#E5484D" note="Errors and destructive actions" />
      </div>
    </div>
  ),
  '10': (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-background border border-separator" style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.06)' }}>
              <div className="font-serif text-body text-accent">Subtle</div>
              <div className="font-body text-small text-muted-foreground">Resting elements</div>
            </div>
            <div className="p-6 bg-background border border-separator" style={{ boxShadow: '0 8px 16px -4px rgba(0,0,0,0.10), 0 4px 6px -2px rgba(0,0,0,0.06)' }}>
              <div className="font-serif text-body text-accent">Elevated</div>
              <div className="font-body text-small text-muted-foreground">Dropdowns, menus</div>
            </div>
            <div className="p-6 bg-background border border-separator" style={{ boxShadow: '0 10px 25px -5px rgba(31,15,77,0.08), 0 6px 10px -3px rgba(0,0,0,0.06)' }}>
              <div className="font-serif text-body text-accent">Card hover</div>
              <div className="font-body text-small text-muted-foreground">Navy-tinted, on hover</div>
            </div>
          </div>
  ),
};

/**
 * THE WHOLE PACKAGE, as one download. Everybody who can open this page can
 * take it; the roles with full access to it can replace it with a new
 * edition. The ZIP holds licensed font files, hence members only.
 */
function PackageCard() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [pkg, setPkg] = useState<BrandPackage | null | undefined>(undefined);
  const [canManage, setCanManage] = useState(false);
  const [busy, setBusy] = useState<'download' | 'upload' | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await brandKitStatus(session);
      setPkg(res.package);
      setCanManage(res.can_manage);
    } catch (e) {
      console.error('Could not read the design system package', e);
      setPkg(null);
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [session]);

  const download = async () => {
    setBusy('download');
    try { await downloadBrandKit(session); }
    catch (e) { toast({ title: 'Could not download the package', description: e instanceof Error ? e.message : undefined, variant: 'destructive' }); }
    finally { setBusy(null); }
  };

  const replace = async (file: File) => {
    setBusy('upload');
    try {
      await uploadBrandKit(session, file);
      toast({ title: 'Design system package replaced', description: `${file.name}, ${formatSize(file.size)}. Members download the new edition from now on.` });
      await load();
    } catch (e) {
      toast({ title: 'Could not replace the package', description: e instanceof Error ? e.message : undefined, variant: 'destructive' });
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const updated = pkg?.updated_at
    ? new Date(pkg.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="mb-10 border border-separator p-5 sm:p-6 font-body">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h2 className="font-serif text-subheading text-accent leading-tight inline-flex items-center gap-2">
            The complete design system <HelpDot page="smm-brand" topic="package" />
          </h2>
          <p className="mt-2 text-small text-muted-foreground">
            Everything below, and everything it refers to: the tokens and stylesheets, the React components, the
            deck, report and social templates, the website UI kit, the logos and lion badges, the photographic
            backgrounds and the fonts, in one ZIP.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            {pkg === undefined ? 'Checking the package…'
              : pkg ? `ZIP · ${formatSize(pkg.size_bytes)}${updated ? ` · updated ${updated}` : ''}`
              : 'The package has not been uploaded yet.'}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            For Minerva members only. It contains licensed font files: do not share it outside the Society.
            Downloads are recorded.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button data-ro variant="solid" disabled={!pkg || busy !== null} onClick={download}>
            {busy === 'download' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
            Download the ZIP
          </Button>
          {canManage && (
            <>
              <Button variant="outline" disabled={busy !== null} onClick={() => fileRef.current?.click()}>
                {busy === 'upload' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {pkg ? 'Replace the package' : 'Upload the package'}
              </Button>
              <input
                ref={fileRef} type="file" accept=".zip,application/zip" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) replace(f); }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrandDesignSystem() {
  return (
    <div>
      <WorkspacePageHeader
        title="Brand & Design"
        description="The association's visual identity, chapter by chapter, and the complete design system to download."
      />

      {/* Provenance first: a reference that does not say what it is a
          reference TO cannot be trusted as current. */}
      <p className="mb-4 font-body text-xs uppercase tracking-wider text-muted-foreground">
        Minerva IMS Design System{syncedOn ? ` · last synced ${syncedOn}` : ''}
      </p>

      <PackageCard />

      <nav aria-label="Design system contents" className="mb-10 flex flex-wrap gap-x-4 gap-y-1.5 font-body">
        {chapters.map((c) => (
          <a key={c.id} href={`#${c.id}`} className="text-sm text-accent underline-offset-4 hover:underline">{c.title}</a>
        ))}
      </nav>

      {intro && (
        <div className="mb-12 max-w-3xl space-y-4 font-body text-body text-foreground">
          <DesignSystemMarkdown source={intro} />
        </div>
      )}

      {chapters.map((c) => (
        <Section key={c.id} id={c.id} title={c.title}>
          <DesignSystemMarkdown source={c.body} />
          {SPECIMENS[c.number] && <Specimen>{SPECIMENS[c.number]}</Specimen>}
        </Section>
      ))}
    </div>
  );
}
