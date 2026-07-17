import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import logoFullColor from '@/assets/brand/logo-full-color.png.asset.json';
import logoFullWhite from '@/assets/brand/logo-full-white.png.asset.json';
import logoMarkColor from '@/assets/brand/logo-mark-color.png.asset.json';
import logoMarkWhite from '@/assets/brand/logo-mark-white.png.asset.json';
import communityLogo from '@/assets/brand/community-logo.png.asset.json';
import ctaLion from '@/assets/brand/cta-lion.png.asset.json';

/**
 * Brand & design — a read-only presentation of the Minerva Investment
 * Management Society design system. Reflects the content of the
 * Minerva_IMS_Design_System bundle: identity, voice, colour, type, spacing,
 * motion, iconography and logo usage. Placeholder content only — the
 * substance is authoritative but the layout is a workspace reference sheet.
 */

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section className="mb-12">
    <h2 className="font-serif text-heading text-accent mb-6 pb-3 border-b border-separator">{title}</h2>
    <div className="space-y-4 font-body text-body text-foreground">{children}</div>
  </section>
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

const Token = ({ name, value, note }: { name: string; value: string; note?: string }) => (
  <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)] gap-4 py-2 border-b border-separator last:border-b-0">
    <code className="font-body text-small text-accent">{name}</code>
    <code className="font-body text-small text-foreground">{value}</code>
    <div className="font-body text-small text-muted-foreground">{note}</div>
  </div>
);

export default function BrandDesignSystem() {
  return (
    <div>
      <WorkspacePageHeader
        title="Brand & Design"
        description="The association's visual identity: fonts, colours, logo usage, spacing, motion, iconography and tone-of-voice rules. This page mirrors the Minerva IMS Design System bundle — treat it as the source of truth for on-brand output."
      />

      {/* 1. Identity */}
      <Section title="1. Identity">
        <p>
          Minerva Investment Management Society (MIMS) is the student association at Bocconi University dedicated to
          asset management. Founded in 2017, it is Bocconi's first and only association to run student-managed virtual
          funds with processes, reports and disclosures that replicate professional-industry standards.
        </p>
        <p>
          MIMS is structured like a real investment firm — five specialist research divisions feeding a central Portfolio
          Management team.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 mt-4">
          {[
            ['Equity Research', 'Fundamental analysis of listed companies — business models, valuation, investment theses with catalysts and risks.'],
            ['Investment Research', 'Cross-asset views (equity, fixed income, FX, commodities), global outlook, trade ideas.'],
            ['Macro Research', 'Monetary policy, the global cycle, structural trends and their market implications.'],
            ['Portfolio Management', 'Runs the proprietary virtual funds — construction, rebalancing, risk management, reporting.'],
            ['Quantitative Research', 'Statistical and ML models, derivatives pricing, risk measures (CVaR/EVaR), forecasting.'],
          ].map(([k, v]) => (
            <div key={k} className="py-2 border-b border-separator">
              <div className="font-serif text-body text-accent">{k}</div>
              <div className="font-body text-small text-muted-foreground">{v}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* 2. Audience */}
      <Section title="2. Audience — three concentric circles">
        <ol className="list-decimal pl-6 space-y-2">
          <li><span className="font-serif text-accent">Bocconi students (core).</span> Mostly undergrads (19–24), highly international, ambitious, finance-oriented. Both the readers of publications and the pool of future members.</li>
          <li><span className="font-serif text-accent">Alumni and current members.</span> A more senior audience now in front-line institutions (Goldman, JPMorgan, McKinsey, hedge funds). Value rigour, continuity of standards, institutional seriousness.</li>
          <li><span className="font-serif text-accent">Industry and academia.</span> Invited professionals, professors, potential institutional partners. Must perceive credibility, competence, and a well-structured organisation.</li>
        </ol>
      </Section>

      {/* 3. Voice */}
      <Section title="3. Voice and copy">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <div><span className="font-serif text-accent">Language.</span> English is the official language of all public content (site, reports, LinkedIn, Instagram).</div>
          <div><span className="font-serif text-accent">Voice.</span> Authoritative, direct, free of inflated rhetoric. Not infantilising, not over-promotional.</div>
          <div><span className="font-serif text-accent">Register.</span> Formal but not bureaucratic. Well-built sentences, no slang, no forced enthusiasm, no excess of superlatives.</div>
          <div><span className="font-serif text-accent">Lead with substance.</span> Headlines and section titles say something precise — never vague or motivational.</div>
          <div><span className="font-serif text-accent">Person.</span> Institutional first-person plural — "We are organised as an investment management firm".</div>
          <div><span className="font-serif text-accent">Spelling.</span> British English — organised, programme, specialised, centres.</div>
          <div><span className="font-serif text-accent">Casing.</span> Section headings in Title Case; navigation and buttons in ALL CAPS with wide tracking; eyebrows and stat labels in UPPERCASE with letter-spacing.</div>
          <div><span className="font-serif text-accent">Emoji.</span> Never in product copy or UI.</div>
        </div>
        <blockquote className="mt-6 border-l-2 border-accent pl-4 italic text-muted-foreground">
          "Minerva Investment Management Society (MIMS) is a society promoted and run by students of Bocconi University.
          Founded in 2017, MIMS is Bocconi's first student association dedicated to asset management and the only one with
          student-managed virtual funds."
        </blockquote>
      </Section>

      {/* 4. Colour */}
      <Section title="4. Colour palette">
        <p>Deep navy/indigo is the entire accent system. Neutrals are kept to the bare minimum — one page colour, one surface grey, one line grey, one muted-text grey, one ink.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Swatch name="Navy (accent)" hex="#1F0F4D" note="Headings, links, primary graphics, hover fills" />
          <Swatch name="Dark Purple (spec)" hex="#1D102A" note="Brand-guide alternate — print/source" />
          <Swatch name="Light Purple" hex="#AFA2D2" note="Chart fills, hover text on navy" />
          <Swatch name="Ink" hex="#141414" note="Body text, dark blocks" />
          <Swatch name="White" hex="#FFFFFF" note="Dominant page colour" />
          <Swatch name="Grey (surface)" hex="#F5F5F5" note="Single light surface" />
          <Swatch name="Line (separator)" hex="#D9D9D9" note="Hairline rules between sections" />
          <Swatch name="Border" hex="#E0E0E0" note="Header, dropdowns, inputs" />
          <Swatch name="Muted text" hex="#737373" note="Secondary and captions" />
          <Swatch name="Card hover tint" hex="#ECE9F4" note="v3 card carousel hover fill" />
          <Swatch name="Footer black" hex="#000000" note="Pure black — footer only" dark />
          <Swatch name="Destructive" hex="#E5484D" note="Errors only" />
        </div>
      </Section>

      {/* 5. Type */}
      <Section title="5. Typography">
        <p>
          Serif for authority (Times New Roman, EB Garamond as web fallback); Calibri (Carlito web substitute) for body,
          captions and tables. Headings use tight tracking (-0.01 to -0.02em). LaTeX for mathematical formulae.
        </p>
        <div className="mt-6 space-y-4 bg-muted p-6">
          <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '4rem', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#1F0F4D' }}>Hero — 64px</div>
          <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '3rem', lineHeight: 1.15, letterSpacing: '-0.01em', color: '#1F0F4D' }}>Display H1 — 48px</div>
          <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '2rem', lineHeight: 1.2, letterSpacing: '-0.01em', color: '#1F0F4D' }}>Section H2 — 32px</div>
          <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '1.5rem', lineHeight: 1.3, color: '#141414' }}>Subheading H3 — 24px</div>
          <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '1.125rem', color: '#141414' }}>Lead paragraph — 18px, Calibri body.</div>
          <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '1rem', color: '#141414' }}>Body — 16px, line-height 1.6.</div>
          <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '0.875rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Eyebrow / small — 14px</div>
        </div>
      </Section>

      {/* 6. Tokens */}
      <Section title="6. Design tokens">
        <div className="mt-2">
          <h3 className="font-serif text-subheading text-accent mb-3">Spacing</h3>
          <div className="border border-separator px-4">
            <Token name="--space-section" value="8rem / 128px" note="Vertical section rhythm (desktop)" />
            <Token name="--space-section-sm" value="5rem / 80px" note="Tighter section rhythm" />
            <Token name="--container-max" value="1280px" note="Centred container width" />
            <Token name="--container-pad" value="1.5rem" note="Horizontal gutter" />
            <Token name="--header-height" value="84px" note="Fixed header; mobile breakpoint at 880px" />
          </div>
        </div>
        <div className="mt-6">
          <h3 className="font-serif text-subheading text-accent mb-3">Radius — intentionally sharp</h3>
          <div className="border border-separator px-4">
            <Token name="--radius" value="0px" note="Base — sharp, architectural corners" />
            <Token name="--radius-sm" value="0px" note="Small elements" />
            <Token name="--radius-pill" value="9999px" note="Only true circles: avatars, social icons, lion badges" />
          </div>
        </div>
        <div className="mt-6">
          <h3 className="font-serif text-subheading text-accent mb-3">Shadows</h3>
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
        </div>
        <div className="mt-6">
          <h3 className="font-serif text-subheading text-accent mb-3">Motion</h3>
          <div className="border border-separator px-4">
            <Token name="--dur-fast" value="200ms" note="Header crossfade, buttons" />
            <Token name="--dur-base" value="320ms" note="Card hover, dropdowns" />
            <Token name="--ease-standard" value="cubic-bezier(.22,.61,.36,1)" note="Primary UI easing" />
            <Token name="--ease-spring" value="cubic-bezier(.22,1,.36,1)" note="Snappier overshoot — testimonial slides" />
          </div>
        </div>
      </Section>

      {/* 7. Logos */}
      <Section title="7. Logo usage">
        <p>Four lock-ups and two lion badges. Keep clear space, never recolour outside navy/white, never stretch or rotate.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="border border-separator">
            <div className="h-40 bg-background flex items-center justify-center p-6">
              <img src={logoMarkColor.url} alt="MIMS mark, navy" className="max-h-full max-w-full" />
            </div>
            <div className="p-3">
              <div className="font-serif text-body text-accent">Mark — navy</div>
              <div className="font-body text-small text-muted-foreground">Header, solid state on light backgrounds.</div>
            </div>
          </div>
          <div className="border border-separator">
            <div className="h-40 flex items-center justify-center p-6" style={{ background: '#1F0F4D' }}>
              <img src={logoMarkWhite.url} alt="MIMS mark, white" className="max-h-full max-w-full" />
            </div>
            <div className="p-3">
              <div className="font-serif text-body text-accent">Mark — white</div>
              <div className="font-body text-small text-muted-foreground">Header, transparent state over hero photography.</div>
            </div>
          </div>
          <div className="border border-separator">
            <div className="h-40 bg-background flex items-center justify-center p-6">
              <img src={logoFullColor.url} alt="MIMS full lock-up, colour" className="max-h-full max-w-full" />
            </div>
            <div className="p-3">
              <div className="font-serif text-body text-accent">Full lock-up — colour</div>
              <div className="font-body text-small text-muted-foreground">Documents, reports, decks — on light backgrounds.</div>
            </div>
          </div>
          <div className="border border-separator">
            <div className="h-40 flex items-center justify-center p-6" style={{ background: '#000000' }}>
              <img src={logoFullWhite.url} alt="MIMS full lock-up, white" className="max-h-full max-w-full" />
            </div>
            <div className="p-3">
              <div className="font-serif text-body text-accent">Full lock-up — white</div>
              <div className="font-body text-small text-muted-foreground">Footer, dark surfaces, social banners.</div>
            </div>
          </div>
          <div className="border border-separator">
            <div className="h-40 bg-background flex items-center justify-center p-6">
              <img src={communityLogo.url} alt="Community lion badge" className="max-h-full max-w-full rounded-full" />
            </div>
            <div className="p-3">
              <div className="font-serif text-body text-accent">Community / Alumni badge</div>
              <div className="font-body text-small text-muted-foreground">Circular lion-head — Community and Alumni contexts only.</div>
            </div>
          </div>
          <div className="border border-separator">
            <div className="h-40 bg-background flex items-center justify-center p-6">
              <img src={ctaLion.url} alt="CTA lion badge" className="max-h-full max-w-full rounded-full" />
            </div>
            <div className="p-3">
              <div className="font-serif text-body text-accent">CTA lion badge</div>
              <div className="font-body text-small text-muted-foreground">Round white lion — call-to-action affordance.</div>
            </div>
          </div>
        </div>
      </Section>

      {/* 8. Imagery */}
      <Section title="8. Imagery and layout">
        <ul className="list-disc pl-6 space-y-2">
          <li>Full-bleed photographic heroes on every major page — cool, desaturated, serious images of finance, architecture, Bocconi. Photos are shown true to colour; a dark-purple shade is composited as a separate second layer on top.</li>
          <li>Body sections sit on flat white or the <code className="text-accent">#F5F5F5</code> grey surface. No gradients in UI chrome, no textures, no patterns.</li>
          <li>Hairline separators (1px <code className="text-accent">#D9D9D9</code>) under headings and between key-figure columns do most of the structural work.</li>
          <li>Cards fill navy on hover and lift <code>translateY(-4px)</code>; the v3 card carousel uses a pale lavender <code className="text-accent">#ECE9F4</code> tint instead of full navy.</li>
          <li>Monochrome company-logos strip shows alumni destinations.</li>
        </ul>
      </Section>

      {/* 9. Iconography */}
      <Section title="9. Iconography">
        <ul className="list-disc pl-6 space-y-2">
          <li>Icon library: <span className="font-serif text-accent">Lucide</span> via <code>lucide-react</code>. Thin, consistent stroke icons at 14–36px, rendered at a 1.25× stroke width for a lighter, more refined line.</li>
          <li>Brand SVGs: MIMS mark (classical M of two Ionic columns flanked by heraldic lions) and lion-head Community badge — bespoke vector marks, never redraw or distort.</li>
          <li>Social icons: purpose-built LinkedIn and Instagram SVGs at 65×65px.</li>
          <li>Emoji: never used as icons. Unicode glyphs appear only as tiny UI affordances — the dropdown caret <code>▾ / ▴</code>.</li>
        </ul>
      </Section>

      {/* 10. Cheat-sheet */}
      <Section title="10. Cheat-sheet">
        <ul className="list-disc pl-6 space-y-1">
          <li>One deep navy accent. White page. Hairlines, not boxes.</li>
          <li>Serif headings, sans body. Tight tracking. Big hero type.</li>
          <li>Zero border-radius. Sharp, architectural.</li>
          <li>Full-bleed photo heroes under dark-purple overlays; flat white/grey body.</li>
          <li>Cards fill navy on hover and lift. Buttons invert.</li>
          <li>Quiet, quick motion. Animated count-ups. No emoji, no gradients, no slop.</li>
          <li>Copy: British English, formal-but-not-bureaucratic, lead with substance, no superlatives.</li>
        </ul>
      </Section>
    </div>
  );
}
