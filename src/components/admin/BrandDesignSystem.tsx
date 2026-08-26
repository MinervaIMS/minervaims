import { WorkspacePageHeader } from '@/components/admin/WorkspacePageHeader';
import logoFullColor from '@/assets/brand/logo-full-color.png.asset.json';
import logoFullWhite from '@/assets/brand/logo-full-white.png.asset.json';
import logoMarkColor from '@/assets/brand/logo-mark-color.png.asset.json';
import logoMarkWhite from '@/assets/brand/logo-mark-white.png.asset.json';
import communityLogo from '@/assets/brand/community-logo.png.asset.json';
import ctaLion from '@/assets/brand/cta-lion.png.asset.json';

/**
 * Brand & design — a read-only presentation of the Minerva Investment
 * Management Society design system.
 *
 * The content of this page is transcribed from the Minerva_IMS_Design_System
 * bundle (README.md, colors_and_type.css, _ds_manifest.json). Chapter numbers
 * and order follow the bundle exactly, so a reader can move between the two
 * without translating.
 */

/**
 * One numbered chapter of the design system.
 *
 * The `id` is what the contents rail at the top of the page scrolls to, and
 * it is derived from the title rather than hand-written, so a chapter that is
 * renamed or replaced cannot leave a dead link behind it.
 */
const slug = (title: string) =>
  `ds-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <section id={slug(title)} className="mb-12 scroll-mt-4">
    <h2 className="font-serif text-heading text-accent mb-6 pb-3 border-b border-separator">{title}</h2>
    <div className="space-y-4 font-body text-body text-foreground">{children}</div>
  </section>
);

/**
 * The chapters, in order — mirrors §1–§19 of the design-system README.
 *
 * THIS IS THE LIST TO EDIT when the design system is republished: it drives
 * the contents rail, and each entry must match a `<Section title>` below.
 */
const CHAPTERS = [
  '1. The Organisation',
  '2. Core Identity Principles',
  '3. Content Fundamentals',
  '4. Logo, Marks and Iconography',
  '5. Typography',
  '6. Colour',
  '7. Layout, Spacing and Grid',
  '8. Surfaces and Background Systems',
  '9. Motion',
  '10. Graphic Details',
  '11. Non-Web Outputs',
  '12. Components',
  '13. Interaction States',
  '14. The Minerva Workspace',
  '15. Templates',
  '16. Do and Don\u2019t',
  '17. Brief for AI Design Agents',
  '18. Repository Index',
  '19. Website Component Inventory',
];

/**
 * WHICH VERSION THIS PAGE IS SHOWING.
 *
 * A reference that does not say what it is a reference TO cannot be trusted
 * as current. The stamp is one line, and it is the first thing under the
 * heading. Update all fields whenever the bundle is republished.
 */
const DESIGN_SYSTEM = {
  version: 'Minerva IMS Design System',
  edition: 'tracks MinervaIMS/minervaims @ main',
  updated: '30 July 2026',
};

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

/** A two-column reference table with a hairline header row, uppercase labels. */
const Table = ({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) => (
  <div className="mt-4 overflow-x-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {head.map((h) => (
            <th
              key={h}
              className="text-left font-body text-xs uppercase tracking-wider text-muted-foreground border-b border-separator pb-2 pr-4"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td
                key={j}
                className={`align-top py-2 pr-4 border-b border-separator font-body text-small ${
                  j === 0 ? 'text-accent whitespace-nowrap' : 'text-muted-foreground'
                }`}
              >
                {c}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function BrandDesignSystem() {
  return (
    <div>
      <WorkspacePageHeader
        title="Brand & Design"
        description="The association's visual identity: fonts, colours, logo usage, spacing, motion, iconography and tone-of-voice rules. This page mirrors the Minerva IMS Design System bundle chapter for chapter: treat it as the source of truth for on-brand output."
      />

      {/* Provenance, then a way in. The page is nineteen chapters long, so
          finding the colour palette should not mean scrolling past the
          audience and the voice every time. */}
      <div className="mb-10 font-body">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {DESIGN_SYSTEM.version} · {DESIGN_SYSTEM.edition} · last synced {DESIGN_SYSTEM.updated}
        </p>
        <nav aria-label="Design system contents" className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {CHAPTERS.map((c) => (
            <a
              key={c}
              href={`#${slug(c)}`}
              className="text-sm text-accent underline-offset-4 hover:underline"
            >
              {c}
            </a>
          ))}
        </nav>
      </div>

      {/* 1 */}
      <Section title="1. The Organisation">
        <p>
          Minerva Investment Management Society (MIMS) is the student association at Bocconi University dedicated to
          asset management. Founded in 2017, it is Bocconi's first and only association running student-managed
          virtual funds with processes, reports and disclosures that replicate professional standards. It is
          structured like an investment firm — five research divisions feeding a central Portfolio Management team.
        </p>
        <Table
          head={['Division', 'Focus']}
          rows={[
            ['Equity Research', 'Fundamental analysis of listed companies — business models, valuation, theses with catalysts and risks.'],
            ['Investment Research', 'Cross-asset views (equity, fixed income, FX, commodities), global outlook, trade ideas.'],
            ['Macro Research', 'Monetary policy, the global cycle, structural trends and their market implications.'],
            ['Portfolio Management', 'Runs the virtual funds — construction, rebalancing, risk management, reporting.'],
            ['Quantitative Research', 'Statistical and ML models, derivatives pricing, risk measures (CVaR/EVaR), forecasting.'],
          ]}
        />
        <p className="mt-6">
          <span className="font-serif text-accent">Active funds:</span> Multi-Asset Global Opportunities Fund and the
          Long-Short Equity Fund. Closed: Diversified Passive Selection, Italian Equity PIR. Reports are published at
          minervaims.org — public pages <code>/</code> · <code>/about</code> · <code>/divisions/*</code> ·{' '}
          <code>/funds/*</code> · <code>/people/*</code> · <code>/events</code> · <code>/archive</code> ·{' '}
          <code>/readings</code> · <code>/join</code> · <code>/alumni</code> · <code>/partnerships</code> · legal
          pages. Members also use the Minerva Workspace (<code>/admin</code>), which has its own rules — see §14.
        </p>
        <h3 className="font-serif text-subheading text-accent mt-6 mb-3">Audience — three concentric circles</h3>
        <ol className="list-decimal pl-6 space-y-2">
          <li><span className="font-serif text-accent">Bocconi students (core).</span> 19–24, international, ambitious, finance-oriented. Readers of the publications and the pool of future members.</li>
          <li><span className="font-serif text-accent">Alumni and current members.</span> Now at Goldman, JPMorgan, McKinsey, hedge funds. They value rigour, continuity and institutional seriousness.</li>
          <li><span className="font-serif text-accent">Industry and academia.</span> Professionals, professors, potential partners. They must perceive credibility and competence.</li>
        </ol>
      </Section>

      {/* 2 */}
      <Section title="2. Core Identity Principles">
        <p>Six rules. Everything else in this document follows from them.</p>
        <ol className="list-decimal pl-6 space-y-2">
          <li><span className="font-serif text-accent">Institutional, not promotional.</span> The work looks like a research house, not a student club. Restraint reads as competence.</li>
          <li><span className="font-serif text-accent">One accent.</span> Deep navy #1F0F4D on white, plus greys. If a design seems to need a second colour, it needs less content.</li>
          <li><span className="font-serif text-accent">Sharp.</span> <code>--radius: 0</code>. Zero border-radius on everything except true circles. The single most recognisable trait of the identity.</li>
          <li><span className="font-serif text-accent">Hairlines, not boxes.</span> A 1px #D9D9D9 rule under a heading does the structural work that borders and cards do elsewhere.</li>
          <li><span className="font-serif text-accent">Serif authority, sans clarity.</span> Serif headings, sans body — in every medium, without exception.</li>
          <li><span className="font-serif text-accent">Motion confirms, never entertains.</span> Quick, restrained, purposeful; everything must read correctly with animation frozen.</li>
        </ol>
      </Section>

      {/* 3 */}
      <Section title="3. Content Fundamentals">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
          <div><span className="font-serif text-accent">Language.</span> English for all public content. British spelling — organised, programme, specialised, centres.</div>
          <div><span className="font-serif text-accent">Voice.</span> Authoritative, direct, free of inflated rhetoric. Written by intelligent people for intelligent people. MIMS is serious because its content is serious, not because it says so.</div>
          <div><span className="font-serif text-accent">Register.</span> Formal but not bureaucratic. No slang, no forced enthusiasm, no superlatives you cannot evidence.</div>
          <div><span className="font-serif text-accent">Lead with substance.</span> Headings are plain nouns — "What We Do", "Our Divisions", "Fund Overview", "Latest Reports". No taglines, no exclamation marks, no rhetorical questions.</div>
          <div><span className="font-serif text-accent">Casing.</span> Serif H2s in Title Case; navigation and buttons frequently ALL CAPS with wide tracking; eyebrows and stat labels UPPERCASE at 0.08–0.22em tracking.</div>
          <div><span className="font-serif text-accent">Person.</span> Institutional first-person plural: "We are organised as an investment management firm". Speaks about members, the Society, the team.</div>
          <div><span className="font-serif text-accent">Emoji.</span> Never. Anywhere, including social copy.</div>
          <div><span className="font-serif text-accent">Numbers.</span> Stats appear as an animated count-up to a round figure plus "+" with an uppercase label. Three key figures maximum on a page.</div>
        </div>
        <blockquote className="mt-6 border-l-2 border-accent pl-4 italic text-muted-foreground">
          Disclaimer: every artefact touching fund performance carries the standing note — the funds are virtual and
          educational, and MIMS is independent of Bocconi University.
        </blockquote>
      </Section>

      {/* 4 */}
      <Section title="4. Logo, Marks and Iconography">
        <p>
          Keep clear space of at least the mark's cap-height on all sides. Never recolour outside navy/white, never
          stretch, rotate, outline or add effects. On photographs the white mark carries a drop-shadow filter for
          legibility. On the site the header shows the white mark when transparent over a hero and the navy mark when
          solid.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
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
              <div className="font-body text-small text-muted-foreground">Dark backgrounds — the footer lock-up, 144–192px tall.</div>
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
        <ul className="list-disc pl-6 space-y-2 mt-6">
          <li>Social icons: LinkedIn and Instagram, black and white variants, 65×65px.</li>
          <li>Icons: <span className="font-serif text-accent">Lucide</span> only — thin, consistent stroke, 14–36px, default weight. Never a second icon library.</li>
          <li>The only Unicode glyphs in the system are the dropdown caret <code>▾ / ▴</code> and the <code>+</code> on a report cover. Never emoji as icons.</li>
        </ul>
      </Section>

      {/* 5 */}
      <Section title="5. Typography">
        <ul className="list-disc pl-6 space-y-2">
          <li><span className="font-serif text-accent">Serif — authority.</span> Times New Roman is self-hosted in the bundle and leads <code>--font-serif</code>. The live website renders EB Garamond first (<code>--font-serif-web</code>) because TNR is not self-hosted there. Use <code>--font-serif-web</code> when matching the site exactly; <code>--font-serif</code> for print and design-system artefacts.</li>
          <li><span className="font-serif text-accent">Sans — legibility.</span> Calibri, substituted on the web by Carlito (open metric clone). Body, captions, footnotes, tables, chart labels, UI controls.</li>
          <li><span className="font-serif text-accent">LaTeX</span> for mathematics in quantitative content.</li>
          <li><span className="font-serif text-accent">One weight: 400.</span> Headings carry tight tracking (−0.01 to −0.02em) and sit at weight 400 — the serif does the work, not the weight. Nothing is ever bold, semibold or medium. Emphasis is made with colour (navy), capitals at 0.08–0.22em tracking, size, italic, or a hairline rule. In PowerPoint, Word and Canva: turn bold off and raise the size instead.</li>
        </ul>
        <Table
          head={['Token', 'Size', 'Role']}
          rows={[
            ['--text-hero', '64px', 'Hero headline, key figures'],
            ['--text-display', '48px', 'H1'],
            ['--text-heading', '32px', 'Section H2 (fluid down to 26px on narrow viewports)'],
            ['--text-subheading', '24px', 'H3, footer headings'],
            ['--text-body-lg', '18px', 'Lead paragraphs'],
            ['--text-body', '16px', 'Body'],
            ['--text-small', '14px', 'Captions'],
            ['--text-xs', '12px', 'Fine print, disclaimers'],
          ]}
        />
        <p className="mt-4">
          Nav links are 19px — deliberately between body-lg and subheading, to keep the header compact. Presentation
          scale is in §11. Print floor is 12pt.
        </p>
        <div className="mt-6 space-y-4 bg-muted p-6">
          <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '4rem', lineHeight: 1.1, letterSpacing: '-0.02em', color: '#1F0F4D' }}>Hero: 64px</div>
          <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '3rem', lineHeight: 1.15, letterSpacing: '-0.01em', color: '#1F0F4D' }}>Display H1: 48px</div>
          <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '2rem', lineHeight: 1.2, letterSpacing: '-0.01em', color: '#1F0F4D' }}>Section H2: 32px</div>
          <div style={{ fontFamily: 'Times New Roman, EB Garamond, serif', fontSize: '1.5rem', lineHeight: 1.3, color: '#141414' }}>Subheading H3: 24px</div>
          <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '1.125rem', color: '#141414' }}>Lead paragraph: 18px, Calibri body.</div>
          <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '1rem', color: '#141414' }}>Body: 16px, line-height 1.6.</div>
          <div style={{ fontFamily: 'Calibri, Carlito, sans-serif', fontSize: '0.875rem', color: '#737373', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Eyebrow / small: 14px</div>
        </div>
      </Section>

      {/* 6 */}
      <Section title="6. Colour">
        <p>
          Navy #1F0F4D is the entire accent system. White is the page. Ink #141414 is body text and non-footer dark
          blocks. Pure black is the footer only — deliberately blacker than ink so iOS overscroll matches. Separator
          and border are different roles; do not conflate them.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Swatch name="Navy (accent)" hex="#1F0F4D" note="Headings, links, primary graphics, hover fills" />
          <Swatch name="White" hex="#FFFFFF" note="The page" />
          <Swatch name="Ink" hex="#141414" note="Body text, dark blocks" />
          <Swatch name="Footer black" hex="#000000" note="Footer only" dark />
          <Swatch name="Grey (surface)" hex="#F5F5F5" note="The single light surface" />
          <Swatch name="Separator" hex="#D9D9D9" note="Hairline rules" />
          <Swatch name="Border" hex="#E0E0E0" note="UI chrome: header, dropdowns, inputs" />
          <Swatch name="Muted text" hex="#737373" note="Secondary text" />
        </div>

        <h3 className="font-serif text-subheading text-accent mt-8 mb-3">Extended purple ramp</h3>
        <p>The identity is one hue family, and this is all of it. Never invent a purple outside it.</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Swatch name="Void" hex="#05030F" note="Animated backdrops" dark />
          <Swatch name="Deep navy" hex="#150B33" note="Division pages" dark />
          <Swatch name="Navy" hex="#1F0F4D" note="The accent" dark />
          <Swatch name="Alumni navy" hex="#241068" note="Alumni accent" dark />
          <Swatch name="Mid purple" hex="#7E5BC2" note="Dot field, chart 3" />
          <Swatch name="Light purple" hex="#AFA2D2" note="Text on navy, chart 2" />
          <Swatch name="Tint" hex="#ECE9F4" note="The hover tint" />
        </div>

        <h3 className="font-serif text-subheading text-accent mt-8 mb-3">Status — colour is a signal, never decoration</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Swatch name="Positive" hex="#047857" note="A permission held, a step completed" />
          <Swatch name="Caution" hex="#F59E0B" note="Read before acting" />
          <Swatch name="Destructive" hex="#E5484D" note="Errors and destructive actions" />
        </div>
        <p className="mt-4">
          Each signal has a pale wash for callout backgrounds. Chart palette, ordered:{' '}
          <code>--chart-1</code> … <code>--chart-6</code> = navy, light purple, mid purple, grey, alumni navy, pale
          lavender. Take them in sequence; never reorder for variety. Page-scoped accents{' '}
          <code>.mims-theme-alumni</code> and <code>.mims-theme-division</code> swap <code>--accent</code> for those
          page families; everything else inherits unchanged.
        </p>
      </Section>

      {/* 7 */}
      <Section title="7. Layout, Spacing and Grid">
        <ul className="list-disc pl-6 space-y-2">
          <li><span className="font-serif text-accent">Container 1280px</span>, centred, 1.5rem gutters. Nothing wider.</li>
          <li><span className="font-serif text-accent">Vertical rhythm in two steps only:</span> section = 8rem (128px), section-sm = 5rem (80px).</li>
          <li><span className="font-serif text-accent">Header</span> fixed at 84px; mobile breakpoint 880px (not 768px); logo 52px tall.</li>
          <li><span className="font-serif text-accent">Grids:</span> 2/3/4/5-up with 1rem gaps for tiles; 1.5–2rem for content columns. Collapse 5 → 2 → 1.</li>
          <li><span className="font-serif text-accent">Measure:</span> body copy capped at 48rem, leads at 36rem.</li>
          <li><span className="font-serif text-accent">Alignment:</span> left, always. Centre only inside a tile, a circle, or a social post's statement.</li>
          <li><span className="font-serif text-accent">The standard section:</span> serif heading + hairline + one paragraph at the measure + an outline CTA pushed right on wide screens. That single arrangement carries most of the website.</li>
          <li><code>html</code> has <code>scrollbar-gutter: stable</code> and a black background (iOS overscroll); <code>body</code> is transparent with <code>min-height: 100dvh</code> and a black safe-area band pinned by <code>body::after</code>.</li>
        </ul>
        <h3 className="font-serif text-subheading text-accent mt-6 mb-3">Tokens</h3>
        <div className="border border-separator px-4">
          <Token name="--space-section" value="8rem / 128px" note="Vertical section rhythm" />
          <Token name="--space-section-sm" value="5rem / 80px" note="Tighter section rhythm" />
          <Token name="--container-max" value="1280px" note="Centred container width" />
          <Token name="--container-pad" value="1.5rem" note="Horizontal gutter" />
          <Token name="--header-height" value="84px" note="Fixed header; mobile breakpoint 880px" />
          <Token name="--radius" value="0" note="Zero on everything except true circles" />
        </div>
      </Section>

      {/* 8 */}
      <Section title="8. Surfaces and Background Systems">
        <p>Five surfaces, and a page alternates between them.</p>
        <Table
          head={['Surface', 'Colour', 'Use']}
          rows={[
            ['paper', '#FFFFFF', 'The default reading surface'],
            ['muted', '#F5F5F5', 'Quiet bands, tile fields, alternating sections'],
            ['navy', '#1F0F4D', 'One emphasis band per page — reports, testimonials, closing'],
            ['ink', '#141414', 'Rare inverted blocks'],
            ['void', '#05030F', 'Backdrop for animated backgrounds only'],
          ]}
        />
        <p className="mt-4">
          Never two navy bands in a row. Never more than one animated surface per screen. Never a pattern and an
          animation on the same section.
        </p>

        <h3 className="font-serif text-subheading text-accent mt-6 mb-3">Photographic heroes</h3>
        <p>
          Full-bleed .webp — cool, desaturated, serious images of finance, architecture and Bocconi. The photo is
          shown true to colour; a dark-purple shade is composited as a separate layer on top
          (<code>--hero-overlay</code> / <code>--intro-overlay</code>). Never bake the tint into the image, never use
          a neutral black scrim. White serif type with a heavy drop shadow sits over the shade.
        </p>

        <h3 className="font-serif text-subheading text-accent mt-6 mb-3">Static patterns</h3>
        <p>
          <code>PatternField</code> — printable, zero-JS, always radially fade-masked: <span className="text-accent">dots</span>{' '}
          fills empty space with texture · <span className="text-accent">grid</span> signals structure (diagrams,
          data) · <span className="text-accent">rules</span> gives rhythm to covers and section breaks. Scale 2–3× on
          slides and posters.
        </p>

        <h3 className="font-serif text-subheading text-accent mt-6 mb-3">Animated backgrounds</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-separator p-4">
            <div className="font-serif text-body text-accent">Beams — the dark environment</div>
            <div className="font-body text-small text-muted-foreground mt-1">
              Soft light-purple planes drifting one way over the void at 30°, 18–34s per cycle, with a vignette that
              keeps the centre readable. Used for member-facing dark moments: sign in, sign up, password reset, event
              registration, dark deck openers. Never behind body copy — a white card sits on top. Never on a light
              surface, never above 0.7 intensity, never two on one screen.
            </div>
          </div>
          <div className="border border-separator p-4">
            <div className="font-serif text-body text-accent">Dot field — the application environment</div>
            <div className="font-body text-small text-muted-foreground mt-1">
              A 1px purple dot grid at 17px spacing that bulges away from the cursor and eases back; it is still when
              the reader is still. Used only for the application journey (/join → the form → confirmation), so
              applying feels like one continuous act. Cursor bloom off by default.
            </div>
          </div>
        </div>
      </Section>

      {/* 9 */}
      <Section title="9. Motion">
        <h3 className="font-serif text-subheading text-accent mb-3">The numbers</h3>
        <div className="border border-separator px-4">
          <Token name="--dur-fast" value="200ms" note="Button fills, underlines, colour shifts" />
          <Token name="--dur-base" value="320ms" note="Card hovers, tile lifts, header crossfade, cover lift-and-tilt" />
          <Token name="--dur-slow" value="550ms" note="A state that must be seen changing: a step lighting" />
          <Token name="--dur-reveal" value="900ms" note="One-off entrance: the help button's ignition" />
          <Token name="--dur-draw" value="1000ms" note="A line drawing itself: the process spine" />
          <Token name="--stagger-step" value="400ms" note="Between sequenced steps; first fires 250ms after entering view" />
          <Token name="--stagger-item" value="34ms" note="Between siblings in a revealed group, twelve items maximum" />
        </div>
        <h3 className="font-serif text-subheading text-accent mt-6 mb-3">The easings</h3>
        <div className="border border-separator px-4">
          <Token name="--ease-standard" value="cubic-bezier(.22,.61,.36,1)" note="Every UI transition" />
          <Token name="--ease-spring" value="cubic-bezier(.22,1,.36,1)" note="Entrances that should feel arrived-at" />
          <Token name="--ease-camera" value="cubic-bezier(.32,.72,0,1)" note="Long pans and zooms only" />
          <Token name="--ease-exit" value="—" note="Things leaving" />
        </div>
        <p className="mt-6">
          <span className="font-serif text-accent">The six approved keyframes</span> (<code>motion.css</code>):{' '}
          <code>fade</code>, <code>rise</code>, <code>slide-down</code>, <code>ignite</code>, <code>drift</code>,{' '}
          <code>breathe</code>. Anything outside this list is off-brand. No bounce, no parallax, no pulsing, no
          attention-seeking loops on interface elements.
        </p>
        <p>
          <span className="font-serif text-accent">Signature motions.</span> Animated count-ups on key figures · card
          hover lift <code>translateY(-6px) rotate(-1deg)</code> on report covers · tile lift{' '}
          <code>translateY(-4px)</code> with a navy fill · the scale-x underline on text links · header
          transparent↔solid crossfade · the process spine lighting in sequence · the help button's single halo
          ignition · testimonials sliding in from ±40px over 1.5s with <code>--ease-spring</code>, auto-advancing
          every ~15.7s.
        </p>
        <p>
          <span className="font-serif text-accent">Reduced motion is mandatory</span> and resolves to the final state
          — a lit spine, never an empty one. Animated backgrounds freeze on a still frame; they are never removed or
          left blank.
        </p>
      </Section>

      {/* 10 */}
      <Section title="10. Graphic Details">
        <ul className="list-disc pl-6 space-y-2">
          <li><span className="font-serif text-accent">Hairline.</span> 1px #D9D9D9 under every section heading and between key-figure columns. The most used graphic element in the system.</li>
          <li><span className="font-serif text-accent">Borders.</span> 1px #E0E0E0 on UI chrome only (header bottom, dropdown frames, inputs).</li>
          <li><span className="font-serif text-accent">Rings.</span> 1.5px navy on an unreached step or hollow circle; 1px #D9D9D9 on a minor step or an inline help dot.</li>
          <li><span className="font-serif text-accent">Halo / glow.</span> <code>--halo-lit</code>: <code>0 0 0 6px rgba(31,15,77,.10), 0 10px 28px rgba(31,15,77,.30)</code>. It means "live". Circles only — never on a rectangle.</li>
          <li><span className="font-serif text-accent">Shadows.</span> Three tiers plus two paper tiers: subtle, elevated, card-hover, cover (report paper), float (a white card over an animated background). Resting state is no shadow; elevation is earned on interaction.</li>
          <li><span className="font-serif text-accent">Dividers.</span> <code>mims-rule</code> (hairline), <code>--strong</code> (navy), <code>--short</code> (64px, 2px, navy — a section mark), <code>--dark</code> (on navy).</li>
          <li><span className="font-serif text-accent">Bullets.</span> A 6px navy square, never a disc.</li>
          <li><span className="font-serif text-accent">Gradients.</span> Exactly two are approved: the progress fill (navy → light purple, on spines and rails) and the photo shade. No gradient anywhere else, ever.</li>
          <li><span className="font-serif text-accent">Blur.</span> Only the fixed transparent header and the member-only page gate (<code>blur(20px) saturate(.5)</code>). No frosted-glass panels.</li>
          <li><span className="font-serif text-accent">Focus.</span> 2px navy outline at 3px offset. Never removed.</li>
        </ul>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
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
      </Section>

      {/* 11 */}
      <Section title="11. Non-Web Outputs">
        <Table
          head={['Artefact', 'Size', 'Notes']}
          rows={[
            ['Slide', '1920 × 1080', '96px margins · title 112 / heading 72 / sub 44 / body 32 / floor 24px'],
            ['Instagram feed', '1080 × 1350', 'The default post — 4:5 portrait, 88px margins, one statement, one supporting line, lock-up footer'],
            ['Instagram square', '1080 × 1080', 'Carousels and grid-consistency sets only'],
            ['Instagram story', '1080 × 1920', 'Keep the top 250px and bottom 320px clear of type'],
            ['LinkedIn card', '1200 × 627', '64px margins, title ≤ 12 words'],
            ['Report cover', 'A4, 1 : 1.414', 'Navy head-rule, lock-up, division eyebrow, serif title, chart, hairline footer'],
            ['Document', 'A4 / Letter', '20mm margins, 12pt body minimum, serif headings, hairline rules, source footnotes'],
            ['Poster / event', 'A3 or 1080 × 1350', 'Photo + purple shade, or void + pattern at 3× scale'],
          ]}
        />
        <p className="mt-6">
          <span className="font-serif text-accent">Deck grammar.</span> Navy title slide → paper content slides → navy
          divider between chapters → at most one quote slide → navy closing. One idea per slide; three paragraphs
          means two slides.
        </p>
        <p>
          <span className="font-serif text-accent">Document grammar.</span> Masthead with the navy rule, uppercase
          division eyebrow, serif title, one-line thesis, authors and reviewer, an abstract callout, numbered serif
          section headings over hairlines, house-style charts with source notes, a data table with an uppercase
          hairline header row, and the standing disclaimer in justified fine print.
        </p>
        <p>
          <span className="font-serif text-accent">Social grammar.</span> Eyebrow → hairline → serif statement → one
          supporting line → lock-up footer. One idea per post. A carousel keeps one theme across every slide and
          varies only the statement. Photographs always take the purple scrim.
        </p>
      </Section>

      {/* 12 */}
      <Section title="12. Components">
        <p>
          Reusable React primitives. Each lives at <code>components/&lt;group&gt;/&lt;Name&gt;.jsx</code> with a
          sibling <code>.d.ts</code> (prop documentation) and <code>.prompt.md</code> (usage rules).
        </p>
        <Table
          head={['Group', 'Components']}
          rows={[
            ['Buttons', 'Button (primary · outline · solid · ghost · link)'],
            ['Typography', 'SectionTitle (serif H2 + hairline)'],
            ['Layout', 'PageIntro (full-bleed photo hero + purple shade)'],
            ['Backgrounds', 'SectionSurface · PatternField (dots · grid · rules) · BeamsBackground · DotFieldBackground'],
            ['Indicators', 'StepIndicator · ProcessJourney · HelpIndicator · CircleButton'],
            ['Surfaces', 'Tile (fill-navy destination / lavender-tint content) · Callout (signal-coloured guidance block)'],
            ['Cards', 'DivisionCard · ReportCard · MemberCard'],
            ['Data', 'KeyFigures (count-up stat row) · Chart (house-style line, area and bar)'],
            ['Media', 'ReportCover (A4) · SocialPost (Instagram & LinkedIn) · SlideFrame (1920×1080)'],
            ['Navigation', 'Header · Dropdown · Footer'],
          ]}
        />
        <p className="mt-4">
          Framework-free equivalents of most of these exist as CSS classes in <code>surfaces.css</code> and{' '}
          <code>motion.css</code> (<code>.mims-tile</code>, <code>.mims-card</code>, <code>.mims-callout</code>,{' '}
          <code>.mims-circle</code>, <code>.mims-journey</code>, <code>.mims-help-fab</code>,{' '}
          <code>.mims-status</code>, <code>.mims-chart</code>, <code>.mims-pattern</code>,{' '}
          <code>.mims-surface</code>, <code>.mims-underline</code>), so the same patterns work in a plain HTML file,
          an email or a slide.
        </p>

        <h3 className="font-serif text-subheading text-accent mt-8 mb-3">The circle language</h3>
        <p>
          Every circle in Minerva is one object at four sizes, and that is what makes them read as a family in a
          system where nothing else is round.
        </p>
        <ul className="list-disc pl-6 space-y-1.5">
          <li><span className="font-serif text-accent">Filled navy disc</span> = an action, or a state that has been reached.</li>
          <li><span className="font-serif text-accent">Hollow ring</span> (1.5px navy) = available, not yet reached.</li>
          <li><span className="font-serif text-accent">Halo</span> = live. Circles only.</li>
          <li><span className="font-serif text-accent">Serif numeral or glyph</span> inside, always.</li>
        </ul>
        <p className="mt-4">
          It appears as: the application-step indicator (<code>StepIndicator</code>, 60px, numbered, lighting in
          sequence down the <code>ProcessJourney</code> spine with the connector filling navy → light purple); the
          workspace help button (<code>HelpIndicator variant="fab"</code> — 48px on mobile, 56px on desktop, fixed
          bottom-right, serif "?", resting halo plus one 900ms ignition on mount); the inline help dot (20px hairline
          ring, quiet until hover); the "+" that opens a report preview; the carousel arrows; and the disc that closes
          a card rail.
        </p>

        <h3 className="font-serif text-subheading text-accent mt-8 mb-3">Specimens in this product</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border border-separator p-5">
            <span className="cta-link">Primary</span>
            <div className="font-body text-small text-muted-foreground mt-3">
              <code className="text-accent">.cta-link</code> — white ground, accent border, serif at 18px. Fills accent
              on hover in 200ms and takes the elevated shadow.
            </div>
          </div>
          <div className="border border-separator p-5">
            <span className="cta-link-invert">Primary, filled</span>
            <div className="font-body text-small text-muted-foreground mt-3">
              <code className="text-accent">.cta-link-invert</code> — the same geometry with the fill reversed, for a
              button that has to carry primary weight on a light surface.
            </div>
          </div>
        </div>
        <div className="border border-separator p-5 mt-4 flex flex-wrap items-center gap-8">
          <div>
            <div className="mdots"><span className="mdot is-on" /><span className="mdot" /><span className="mdot" /></div>
            <div className="font-body text-small text-muted-foreground mt-2">
              Carousel dots: 6px circles at 28% accent; the active one stretches to a 20px lozenge in 240ms.
            </div>
          </div>
          <div>
            <span className="rarrow inline-flex items-center justify-center">→</span>
            <div className="font-body text-small text-muted-foreground mt-2">
              Carousel arrow: 2.6rem circle, hairline border, fills accent on hover.
            </div>
          </div>
        </div>
      </Section>

      {/* 13 */}
      <Section title="13. Interaction States">
        <Table
          head={['Element', 'Hover', 'Focus', 'Active / disabled']}
          rows={[
            ['Primary button', 'Inverts: navy → white fill, navy label (200ms)', '2px navy outline, 3px offset', 'Disabled: grey fill, muted label'],
            ['Outline button', 'Fills navy, white label, soft drop shadow', 'Same ring', 'Disabled: hairline border, no hover'],
            ['Text link', '1.5px rule grows from the left (240ms) — never an arrow glyph', 'Ring around the label box', 'Visited is not styled'],
            ['Tile (destination)', 'Fills navy, text white, lifts 4px, elevated shadow (320ms)', 'Ring, 3px offset', 'Static inside the workspace'],
            ['Card (content)', 'Tints #ECE9F4; cover inside lifts 6px, tilts −1°', 'Same on :focus-within', 'Never both hovers in one grid'],
            ['Circle / step', 'Scales 1.06–1.08 (outline circles fill instead)', 'Ring, 3px offset', 'Lit carries the halo; disabled 35% opacity'],
            ['Table row', 'Background --muted / .4; no lift', 'Row outline, −2px offset', 'Selected: 2px navy left rule'],
            ['General', 'Opacity ≈ 0.8 on incidental interactive elements', '—', 'No press-scale beyond the hover lift'],
          ]}
        />
      </Section>

      {/* 14 */}
      <Section title="14. The Minerva Workspace">
        <p>
          The member application (<code>/admin</code>) is the same identity under stricter rules, because it is a
          place of record rather than a place of persuasion.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li><span className="font-serif text-accent">Flat.</span> Radius 0 on every input, select and combobox; native <code>appearance</code> stripped so the OS cannot round them. No card or hover shadows anywhere.</li>
          <li><span className="font-serif text-accent">Static.</span> Only buttons, links, table rows and form controls may react to hover. Panels and cards do not move — reliability is the message.</li>
          <li><span className="font-serif text-accent">Contextual help.</span> <code>HelpIndicator</code> in both forms; the panel slides in from the right (200ms) at 380px wide, with a navy header band, an accent "What you are looking at" callout, square-bulleted action lists (navy = consult, green = actions your role unlocks), an amber "Good to know" band and hairline-separated topics. Help content is role-aware: members only read about actions they can perform.</li>
          <li><span className="font-serif text-accent">Gated pages</span> blur their content (<code>blur(20px) saturate(.5)</code>) behind a scrim rather than hiding it, so a member sees that something exists and why it is closed.</li>
          <li><span className="font-serif text-accent">Inputs below 768px are 16px</span> so iOS never auto-zooms a focused field.</li>
        </ul>
      </Section>

      {/* 15 */}
      <Section title="15. Templates">
        <p>Ready-made starting points in the bundle's <code>templates/</code> folder.</p>
        <Table
          head={['Template', 'What it gives you']}
          rows={[
            ['Pitch deck', 'A ten-slide presentation: navy opener, agenda with step circles, section divider, three-tile content slide, house-style chart, key figures, four-step process, statement slide, next steps, closing.'],
            ['Research report', 'A printable research note: masthead, abstract callout, numbered sections, chart with source note, conviction table, disclaimer, running header and footer.'],
            ['Social kit', 'Instagram feed, Instagram story and LinkedIn artwork at true export size, with the carousel rules.'],
          ]}
        />
      </Section>

      {/* 16 */}
      <Section title="16. Do and Don’t">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h3 className="font-serif text-subheading text-accent mb-3">Do</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>Keep every corner square except true circles.</li>
              <li>Let hairlines carry the structure.</li>
              <li>One accent colour per page.</li>
              <li>Serif headings with sans body, always.</li>
              <li>Headings as plain nouns.</li>
              <li>Generous white space.</li>
              <li>Earn elevation on interaction.</li>
              <li>Source every number.</li>
              <li>British English.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-serif text-subheading text-accent mb-3">Don’t</h3>
            <ul className="list-disc pl-6 space-y-1.5">
              <li>No rounded corners or pills.</li>
              <li>No gradients in interface chrome.</li>
              <li>No emoji.</li>
              <li>No arrow glyphs as button labels.</li>
              <li>No invented colours.</li>
              <li>No second icon library.</li>
              <li>No exclamation marks or rhetorical headings.</li>
              <li>No stacked effects — one background, one accent, one idea per surface.</li>
              <li>No animation that cannot be justified as feedback, structure or continuity.</li>
            </ul>
          </div>
        </div>
      </Section>

      {/* 17 */}
      <Section title="17. Brief for AI Design Agents">
        <p>Work in this order: <span className="font-serif text-accent">medium → size → surface → composition → check.</span></p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Pick the medium and its canonical size (§11).</li>
          <li>Choose one surface per section from the five (§8).</li>
          <li>Compose from the system: heading + hairline + measure; groups as tiles in a 2/3/4/5 grid; sequences as <code>ProcessJourney</code>/<code>StepIndicator</code>; data as <code>Chart</code> with a source note.</li>
          <li>Check: every corner square? one accent? serif over sans? any heading a slogan? any emoji, arrow labels, gradients or pills? British English? every statistic sourced? does it still read with animation frozen?</li>
        </ol>
        <blockquote className="mt-6 border-l-2 border-accent pl-4 italic text-muted-foreground">
          Design in the Minerva IMS system: deep navy #1F0F4D on white, serif headings (Times New Roman / EB Garamond)
          with Calibri body, zero border-radius, hairline #D9D9D9 rules instead of boxes, flat grey #F5F5F5 tiles that
          fill navy on hover, circular navy step indicators with a soft halo, no emoji, no gradients, no arrow glyphs,
          British English, institutional register.
        </blockquote>
      </Section>

      {/* 18 */}
      <Section title="18. Repository Index">
        <Table
          head={['File / folder', 'What it is']}
          rows={[
            ['README.md', 'The complete reference this page transcribes'],
            ['SKILL.md', 'Agent-skill manifest so the system can be invoked inside Claude Code'],
            ['styles.css', 'Entry point — imports the three stylesheets below'],
            ['colors_and_type.css', 'All design tokens: colour, type, spacing, radius, shadows, halos, patterns, motion, chart palette, output formats; plus type classes and button primitives'],
            ['surfaces.css', 'Framework-free classes: surfaces, patterns, tiles, cards, panels, callouts, circles, the process spine, rules, status visuals, chart frame, grids'],
            ['motion.css', 'The six approved keyframes, motion utilities and the reduced-motion contract'],
            ['assets/', 'Logos, lion badges, social icons, full-bleed photographic backgrounds'],
            ['fonts/', 'Self-hosted Times New Roman (4 styles)'],
            ['components/', 'React primitives — see §12'],
            ['preview/', 'Specimen cards: colours, type, spacing, motion, animated-background behaviour, layout, formats, interaction states, chart rules, do & don’t, AI brief'],
            ['templates/', 'Deck, report and social starting points'],
            ['ui_kits/website/', 'High-fidelity recreation of minervaims.org'],
            ['github.md', 'Which repository this system tracks, and when it was last synced'],
          ]}
        />
      </Section>

      {/* 19 */}
      <Section title="19. Website Component Inventory">
        <p>
          The implementation source of truth. All live in <code>src/components/</code>; consult these when building
          production code. Admin components live in <code>src/components/admin/</code> and follow §14.
        </p>
        <Table
          head={['Component', 'What it does']}
          rows={[
            ['layout/Header.tsx', 'Fixed 84px, three-zone (logo · centred nav · account). Transparent on hero routes, solid white on scroll. 880px breakpoint, 19px serif nav, scale-x underline, 220ms dropdown close delay, full-screen white mobile overlay.'],
            ['layout/Footer.tsx', 'Pure black, three bands: large lock-up (scroll-to-top) + newsletter + social icons · five link columns · copyright bar.'],
            ['shared/ReportsSection.tsx', 'The publication component. v3 card carousel (lavender hover, cover lift+tilt) and v2 navy stage, PDF lightbox, + affordance, scroll-fade rail mask, dot and arrow controls.'],
            ['shared/ApplicationJourney.tsx', 'The vertical glowing spine on /join — the source of StepIndicator and ProcessJourney.'],
            ['admin/help/HelpSystem.tsx', 'HelpDot, PageHelpButton (.ws-help-fab) and the role-aware sliding help panel.'],
            ['shared/Beams.tsx', 'Three.js beams — the animated dark background.'],
            ['shared/DotField.tsx', 'The canvas dot field behind the application flow.'],
            ['shared/ApplyBackground.tsx · AuthLayout.tsx', 'Which environment sits behind which card: dot field for applicants, beams for members.'],
            ['shared/SpecularFx.tsx', 'WebGL specular rim on primary auth buttons; .specular-fx extends 20px past the button.'],
            ['shared/OrgChart.tsx', 'The pannable org chart — camera easing, recessed branches, drawn connectors.'],
            ['shared/HistoryTimeline.tsx', 'The pinned horizontal timeline: 80px year circles lighting as the rail fills.'],
            ['shared/DivisionScrollStack.tsx', 'Phone-only sideways run of the five division cards.'],
            ['shared/TestimonialsSection.tsx', 'Navy testimonial carousel, ~15.7s auto-advance, ±40px slide-in.'],
            ['shared/MembersDirectory.tsx', 'Tabbed directory — 5-up feature cards for the Board, compact cards per division.'],
            ['shared/AlumniGlobe.tsx · AlumniTicker.tsx', '3D alumni globe and the scrolling alumni ticker.'],
            ['shared/PageVisibilityGate.tsx', 'Blurs member-only content behind a scrim.'],
            ['shared/PdfThumbnail.tsx · CarouselScrollIndicator.tsx · Preloader.tsx', 'Report previews, rail progress, first-load splash.'],
            ['shared/FundPerformanceChart.tsx', 'Fund performance graphics — the reference for Chart.'],
            ['shared/LegalLayout.tsx', 'Legal pages (src/styles/legal-system.css).'],
          ]}
        />
      </Section>
    </div>
  );
}
