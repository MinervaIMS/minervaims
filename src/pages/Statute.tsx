import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';
import { STATUTE_ARTICLES, type StatuteBlock } from '@/lib/statute-content';

type Lang = 'it' | 'en';

const pad = (n: number) => String(n).padStart(2, '0');

const COPY: Record<Lang, {
  lastUpdated: string;
  bindingNote: string;
  noticeLabel: string;
  preamble: string;
  langLabel: string;
}> = {
  en: {
    lastUpdated: '2026',
    bindingNote: 'This Statute is originally drafted and approved in Italian and translated into English for ease of reference. The Italian version is the definitive, legally binding one for any dispute or question of interpretation (Art. 28).',
    noticeLabel: 'Binding language',
    preamble: 'Bilingual version: Italian (binding) / English. The Association is a non-profit student association promoted and managed by students of Università Bocconi, with registered office in Via Roberto Sarfatti 26/6, 20136 Milan (MI).',
    langLabel: 'Language',
  },
  it: {
    lastUpdated: '2026',
    bindingNote: 'Il presente Statuto è originariamente redatto e approvato in lingua italiana ed è tradotto in inglese per facilità di consultazione. La versione italiana è da considerarsi definitiva e giuridicamente vincolante per ogni controversia o questione interpretativa (Art. 28).',
    noticeLabel: 'Lingua vincolante',
    preamble: "Versione bilingue: italiano (vincolante) / inglese. L'Associazione è un'associazione studentesca senza scopo di lucro promossa e gestita da studenti dell'Università Bocconi, con sede legale in Via Roberto Sarfatti 26/6, 20136 Milano (MI).",
    langLabel: 'Lingua',
  },
};

// Hero title/description and social/meta tags always use English — English is the
// site's default language, only the statute body toggles between IT and EN.
const HERO = {
  metaTitle: 'Society Statute | MIMS',
  metaDescription: 'The official statute of the Minerva Investment Management Society (MIMS): purpose, governance, membership, divisions and internal procedures.',
  title: 'Society Statute',
  description: 'The official statute of the Minerva Investment Management Society (MIMS).',
};

function renderBlock(block: StatuteBlock, i: number) {
  if (typeof block === 'string') {
    return <p key={i}>{block}</p>;
  }
  return (
    <div key={i} className="lp-table-scroll">
      <table>
        <thead>
          <tr>
            <th>{block.header[0]}</th>
            <th>{block.header[1]}</th>
          </tr>
        </thead>
        <tbody>
          {block.rows.map(([a, b], r) => (
            <tr key={r}>
              <td>{a}</td>
              <td>{b}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const Statute = () => {
  const [lang, setLang] = useState<Lang>('en');
  const copy = COPY[lang];

  const sections: LegalSection[] = useMemo(
    () => STATUTE_ARTICLES.map((a) => ({
      id: `art-${a.n}`,
      title: lang === 'it' ? a.titleIt : a.titleEn,
    })),
    [lang],
  );

  return (
    <>
      <Helmet>
        <title>{HERO.metaTitle}</title>
        <meta name="description" content={HERO.metaDescription} />
      </Helmet>
      <LegalLayout
        title={HERO.title}
        description={HERO.description}
        lastUpdated={copy.lastUpdated}
        currentId="statute"
        sections={sections}
        languageToggle={
          <>
            <span className="lp-lang-label">{copy.langLabel}</span>
            <div className="lp-lang-seg" role="group" aria-label="Statute language">
              <button
                type="button"
                className={lang === 'it' ? 'active' : ''}
                aria-pressed={lang === 'it'}
                onClick={() => setLang('it')}
              >
                Italiano
              </button>
              <button
                type="button"
                className={lang === 'en' ? 'active' : ''}
                aria-pressed={lang === 'en'}
                onClick={() => setLang('en')}
              >
                English
              </button>
            </div>
          </>
        }
      >
        {/* Preamble + binding-language notice (not numbered as an article). */}
        <div className="lp-preamble" id="preamble">
          <p className="lead">{copy.preamble}</p>
          <aside className="lp-notice" aria-label={copy.noticeLabel}>
            <span className="label">{copy.noticeLabel}</span>
            <p>{copy.bindingNote}</p>
          </aside>
        </div>

        {STATUTE_ARTICLES.map((a) => {
          const title = lang === 'it' ? a.titleIt : a.titleEn;
          const body = lang === 'it' ? a.bodyIt : a.bodyEn;
          return (
            <LegalSectionBlock
              key={a.n}
              id={`art-${a.n}`}
              number={pad(a.n)}
              title={`Art. ${a.n}. ${title}`}
              wide={a.n === 14}
            >
              {body.map((block, i) => renderBlock(block, i))}
            </LegalSectionBlock>
          );
        })}
      </LegalLayout>
    </>
  );
};

export default Statute;
