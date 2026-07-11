import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { LegalLayout, LegalSectionBlock, type LegalSection } from '@/components/shared';
import { STATUTE_ARTICLES } from '@/lib/statute-content';

type Lang = 'it' | 'en';

const pad = (n: number) => String(n).padStart(2, '0');

const COPY: Record<Lang, {
  metaTitle: string;
  metaDescription: string;
  title: string;
  description: string;
  lastUpdated: string;
  bindingNote: string;
  noticeLabel: string;
  preamble: string;
  langLabel: string;
}> = {
  en: {
    metaTitle: 'Society Statute | MIMS',
    metaDescription: 'The official statute of the Minerva Investment Management Society (MIMS): purpose, governance, membership, divisions and internal procedures.',
    title: 'Society Statute',
    description: 'The official statute of the Minerva Investment Management Society (MIMS).',
    lastUpdated: '2026',
    bindingNote: 'This Statute is originally drafted and approved in Italian and translated into English for ease of reference. The Italian version is the definitive, legally binding one for any dispute or question of interpretation (Art. 28).',
    noticeLabel: 'Binding language',
    preamble: 'Bilingual version — Italian (binding) / English. The Association is a non-profit student association promoted and managed by students of Università Bocconi, with registered office in Via Roberto Sarfatti 26/6, 20136 Milan (MI).',
    langLabel: 'Language',
  },
  it: {
    metaTitle: 'Statuto dell’Associazione | MIMS',
    metaDescription: 'Statuto ufficiale della Minerva Investment Management Society (MIMS): finalità, governance, soci, divisioni e procedure interne.',
    title: 'Statuto dell’Associazione',
    description: 'Statuto ufficiale della Minerva Investment Management Society (MIMS).',
    lastUpdated: '2026',
    bindingNote: 'Il presente Statuto è originariamente redatto e approvato in lingua italiana ed è tradotto in inglese per facilità di consultazione. La versione italiana è da considerarsi definitiva e giuridicamente vincolante per ogni controversia o questione interpretativa (Art. 28).',
    noticeLabel: 'Lingua vincolante',
    preamble: 'Versione bilingue — italiano (vincolante) / inglese. L’Associazione è un’associazione studentesca senza scopo di lucro promossa e gestita da studenti dell’Università Bocconi, con sede legale in Via Roberto Sarfatti 26/6, 20136 Milano (MI).',
    langLabel: 'Lingua',
  },
};

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
        <title>{copy.metaTitle}</title>
        <meta name="description" content={copy.metaDescription} />
      </Helmet>
      <LegalLayout
        title={copy.title}
        description={copy.description}
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
        {/* Preamble + binding-language note (not numbered as an article). */}
        <div className="lp-section" id="preamble">
          <div className="lp-h2-wrap">
            <h2 className="lp-h2">{copy.preambleHeading}</h2>
            <p>{copy.preamble}</p>
            <p><em>{copy.bindingNote}</em></p>
          </div>
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
            >
              {body.map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </LegalSectionBlock>
          );
        })}
      </LegalLayout>
    </>
  );
};

export default Statute;
