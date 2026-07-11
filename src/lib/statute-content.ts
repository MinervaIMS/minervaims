// =====================================================================
// Association statute — structured, bilingual content (IT binding / EN).
// AUTO-GENERATED from the official DOCX supplied by the Board. Each article
// keeps its Italian and English title and its ordered paragraphs so the
// Statute page can render either language and build its table of contents.
// The Italian version is the legally binding one (Art. 28).
// =====================================================================

export interface StatuteTableBlock {
  kind: 'table';
  header: [string, string];
  rows: [string, string][];
}

export type StatuteBlock = string | StatuteTableBlock;

export interface StatuteArticle {
  n: number;
  titleIt: string;
  titleEn: string;
  bodyIt: StatuteBlock[];
  bodyEn: StatuteBlock[];
}

export const STATUTE_ARTICLES: StatuteArticle[] = [
  {
    "n": 1,
    "titleIt": "Denominazione e sede legale",
    "titleEn": "Name and registered office",
    "bodyIt": [
      "È costituita l'associazione studentesca denominata «Minerva Investment Management Society», anche identificata con l'acronimo «MIMS» (di seguito «l'Associazione»), nel rispetto del Titolo II, Capo III, articoli 36 e seguenti del Codice Civile, nonché dei regolamenti dell'Università Commerciale Luigi Bocconi di Milano e del presente Statuto.",
      "L'Associazione ha natura giuridica di associazione non riconosciuta ai sensi degli articoli 36, 37 e 38 del Codice Civile.",
      "L'Associazione ha sede legale in Via Roberto Sarfatti 26/6, 20136 Milano (MI). Il trasferimento della sede legale è sottoposto a modifica statutaria ed è tempestivamente comunicato agli uffici competenti dell'Università Bocconi.",
      "L'Associazione si definisce, in tutti i materiali informativi e promozionali, come «Associazione promossa e gestita da studenti dell'Università Bocconi».",
      "L'Associazione ha durata indefinita."
    ],
    "bodyEn": [
      "The student association named \"Minerva Investment Management Society\", also identified by the acronym \"MIMS\" (hereinafter \"the Association\"), is established in compliance with Title II, Chapter III, Articles 36 et seq. of the Italian Civil Code, the regulations of Università Commerciale Luigi Bocconi in Milan, and the present Statute.",
      "The Association is legally constituted as a non-recognised association pursuant to Articles 36, 37 and 38 of the Italian Civil Code.",
      "The Association has its registered office at Via Roberto Sarfatti 26/6, 20136 Milan (MI). Any transfer of the registered office shall require amendment of the Statute and shall be promptly notified to the competent offices of Università Bocconi.",
      "The Association shall identify itself, in all informational and promotional materials, as \"Association promoted and managed by students of Università Bocconi\".",
      "The Association is established for an indefinite duration."
    ]
  },
  {
    "n": 2,
    "titleIt": "Finalità e scopi",
    "titleEn": "Purposes and objectives",
    "bodyIt": [
      "L'Associazione è libera, apartitica, apolitica e priva di qualsivoglia scopo di lucro.",
      "L'Associazione persegue la finalità di applicare, in un contesto simulato ma metodologicamente rigoroso, i concetti appresi durante il percorso di studi in materia di asset management, sales & trading e ricerca finanziaria, nonché di promuovere il confronto critico e indipendente su tematiche economico-finanziarie tra gli studenti dell'Università Bocconi.",
      "L'Associazione persegue altresì, quale obiettivo secondario, l'accrescimento delle competenze tecniche e professionali degli associati, anche tramite collaborazioni con soggetti esterni all'Università, nei limiti del presente Statuto e dei regolamenti universitari applicabili.",
      "I portafogli gestiti dall'Associazione sono portafogli a gestione simulata, che riproducono in tutto e per tutto la gestione di fondi di investimento reali, comprensiva di analisi, decisioni di allocazione, monitoraggio della performance e reportistica pubblica, ad esclusione dell'impiego di capitali reali.",
      "L'Associazione opera in autonomia e indipendenza da qualsivoglia influenza politica o economica esterna.",
      "L'Associazione non può, in alcun materiale, comunicazione o iniziativa, intendere di rappresentare i punti di vista o le opinioni dell'Università Bocconi, ma esclusivamente quelli propri."
    ],
    "bodyEn": [
      "The Association is free, non-partisan, apolitical and without any profit-making purpose.",
      "The Association pursues the aim of applying, in a simulated yet methodologically rigorous setting, the concepts learnt during the course of study in the fields of asset management, sales & trading and financial research, as well as of fostering critical and independent debate on economic and financial topics among the students of Università Bocconi.",
      "The Association further pursues, as a secondary objective, the enhancement of the technical and professional competences of its members, including through collaborations with parties external to the University, within the limits set by the present Statute and by the applicable university regulations.",
      "The portfolios managed by the Association are simulated-management portfolios, which replicate in all respects the management of real investment funds, including analysis, allocation decisions, performance monitoring and public reporting, with the sole exclusion of the use of real capital.",
      "The Association operates with autonomy and independence from any external political or economic influence.",
      "The Association shall not, in any material, communication or initiative, purport to represent the views or opinions of Università Bocconi, but exclusively its own."
    ]
  },
  {
    "n": 3,
    "titleIt": "Attività",
    "titleEn": "Activities",
    "bodyIt": [
      "L'Associazione persegue le proprie finalità principalmente attraverso le seguenti attività:",
      "a) gestione simulata di portafogli di investimento, con ribilanciamenti periodici e reportistica pubblica;",
      "b) attività di ricerca finanziaria, articolata nelle divisioni dell'Associazione di cui all'Art. 15;",
      "c) produzione e pubblicazione di report, analisi e contenuti tematici sui canali ufficiali dell'Associazione;",
      "d) organizzazione di riunioni interne, incontri formativi e iniziative aperte alla comunità universitaria, anche con la partecipazione di relatori esterni, nel rispetto delle linee guida del Comitato CASA dell'Università Bocconi;",
      "e) attività di promozione, comunicazione e divulgazione dei contenuti e delle iniziative dell'Associazione.",
      "Le attività di cui al comma precedente non possono in alcun caso sovrapporsi né interferire con le attività istituzionali dell'Università Bocconi, comprese le attività di didattica, di sostegno al processo didattico-pedagogico, di placement, di orientamento professionale, di recruiting, di employer branding e di ammissione.",
      "L'Associazione non può svolgere attività diverse da quelle indicate al comma 1, salvo quelle ad esse direttamente connesse o accessorie per natura, in quanto integrative delle stesse.",
      "Le iniziative aperte alla comunità universitaria, in presenza od online, sono soggette alla preventiva approvazione del Comitato CASA dell'Università Bocconi secondo le modalità e le tempistiche previste dal Regolamento Operativo CASA in vigore.",
      "Tutti i contratti stipulati dall'Associazione con soggetti terzi includono la seguente clausola: «Le parti concordano e comprendono che l'Università Bocconi non è parte del presente contratto e che l'Università Bocconi non è responsabile, in nessuna circostanza, per l'adempimento del presente contratto»."
    ],
    "bodyEn": [
      "The Association pursues its purposes principally through the following activities:",
      "a) simulated management of investment portfolios, with periodic rebalancing and public reporting;",
      "b) financial research activities, organised within the divisions of the Association referred to in Art. 15;",
      "c) production and publication of reports, analyses and thematic content on the Association's official channels;",
      "d) organisation of internal meetings, training sessions and initiatives open to the university community, including with the participation of external speakers, in compliance with the guidelines of the CASA Committee of Università Bocconi;",
      "e) promotional, communication and outreach activities concerning the Association's content and initiatives.",
      "The activities referred to in the preceding paragraph may in no case overlap with or interfere with the institutional activities of Università Bocconi, including teaching, support to the pedagogical process, placement, career orientation, recruiting, employer branding and admissions.",
      "The Association may not carry out activities other than those listed in paragraph 1, save for those directly connected or naturally ancillary thereto, insofar as they are supplementary to them.",
      "Initiatives open to the university community, whether in person or online, are subject to the prior approval of the CASA Committee of Università Bocconi according to the procedures and timelines set forth in the CASA Operational Regulation in force.",
      "All contracts entered into by the Association with third parties shall include the following clause: \"The parties acknowledge and agree that Università Bocconi is not a party to the present contract and that Università Bocconi shall not be liable, under any circumstances, for the performance of the present contract\"."
    ]
  },
  {
    "n": 4,
    "titleIt": "Principi fondamentali",
    "titleEn": "Fundamental principles",
    "bodyIt": [
      "L'Associazione si impegna a non praticare alcuna forma di discriminazione, in particolare per ragioni di razza, etnia, religione, nazionalità, sesso, identità di genere, orientamento sessuale, disabilità, condizioni personali o sociali, in conformità con la Legge 25 giugno 1993, n. 205 (Legge Mancino) e con la normativa antidiscriminazione vigente.",
      "La performance accademica non costituisce in alcun caso criterio di ammissione all'Associazione né di assegnazione di cariche al suo interno.",
      "L'Associazione si impegna a contrastare ed evitare ogni comportamento, condotto tanto in campus quanto al di fuori del campus, che possa danneggiare la salute fisica o mentale di uno studente o di qualunque altra persona, ledere la sua dignità, porla in una situazione di forte stress, o costituire forma di umiliazione (hazing).",
      "I soci con incarichi direttivi sono tenuti a segnalare immediatamente al Presidente, al Vicepresidente e agli organi competenti dell'Università Bocconi ogni comportamento contrario a quanto disposto al comma precedente.",
      "È fatto espresso divieto a tutti i soci di sottoscrivere contratti di riservatezza in relazione all'attività associativa.",
      "L'Associazione opera nel rispetto dei principi di indipendenza e autonomia da qualsivoglia influenza politica o economica esterna.",
      "L'Associazione e i suoi soci operano nel rispetto delle leggi vigenti, dei regolamenti dell'Università Bocconi e dei codici di condotta dalla stessa adottati.",
      "I soci con incarichi direttivi si assumono la responsabilità di rendere noti a tutti i soci i regolamenti dell'Università Bocconi applicabili all'attività associativa, fermo restando il principio della responsabilità individuale di ciascun socio."
    ],
    "bodyEn": [
      "The Association undertakes not to engage in any form of discrimination, in particular on the grounds of race, ethnicity, religion, nationality, sex, gender identity, sexual orientation, disability, or personal or social condition, in compliance with Law no. 205 of 25 June 1993 (Mancino Law) and with the anti-discrimination legislation in force.",
      "Academic performance shall in no case constitute a criterion for admission to the Association or for the assignment of offices within it.",
      "The Association undertakes to oppose and prevent any conduct, whether on or off campus, capable of harming the physical or mental health of a student or any other person, of injuring his or her dignity, of placing him or her in a situation of severe stress, or of constituting hazing.",
      "Members holding directive offices are required to report immediately to the President, the Vice-President and the competent offices of Università Bocconi any conduct contrary to the provisions of the preceding paragraph.",
      "All members of the Association are expressly prohibited from entering into confidentiality agreements in connection with the Association's activities.",
      "The Association operates in compliance with the principles of independence and autonomy from any external political or economic influence.",
      "The Association and its members operate in compliance with the laws in force, with the regulations of Università Bocconi and with the codes of conduct adopted by it.",
      "Members holding directive offices are responsible for making known to all members the regulations of Università Bocconi applicable to the Association's activities, without prejudice to the principle of each member's individual responsibility."
    ]
  },
  {
    "n": 5,
    "titleIt": "Domanda di ammissione",
    "titleEn": "Application for membership",
    "bodyIt": [
      "L'Associazione riconosce il diritto di presentare domanda di ammissione a tutti gli studenti dell'Università Commerciale Luigi Bocconi, senza distinzione di razza, etnia, religione, nazionalità, sesso, identità di genere, orientamento sessuale, disabilità o condizioni personali e sociali.",
      "La domanda di ammissione è presentata mediante apposita procedura indetta dall'Associazione nelle prime settimane di ciascun semestre accademico. Il candidato dichiara, all'atto della domanda, di condividere gli scopi e le finalità dell'Associazione e di accettare integralmente il presente Statuto.",
      "La performance accademica non costituisce in alcun caso criterio di ammissione.",
      "Le domande di ammissione sono ricevute e gestite dall'Head of Division di cui all'Art. 17, con il supporto dei Team Leader della divisione di cui all'Art. 18 ove presenti. L'eventuale rigetto è sempre motivato per iscritto al candidato e non può in alcun caso fondarsi su motivazioni discriminatorie ai sensi dell'Art. 4 comma 1. Costituiscono legittime motivazioni di rigetto, a titolo esemplificativo e non esaustivo, il raggiungimento del numero massimo di nuovi membri ammissibili nel semestre ai sensi dell’Art. 6 comma 3, l'incompletezza o l'irregolarità formale della domanda e l'assenza dei requisiti di cui all'Art. 6 comma 1.",
      "La decisione sull'accoglimento o sul rigetto della domanda spetta all'Head of Division.",
      "Il numero di nuovi membri ammessi per ciascuna divisione in ciascun semestre è stabilito dall'Head of Division in accordo con il Presidente, il Vicepresidente e l'Head of Asset Management. Ogni divisione ammette almeno un nuovo membro per semestre.",
      "Il Presidente, il Vicepresidente e l'Head of Asset Management si riservano la facoltà di revisionare qualsiasi ammissione in caso di dubbi sulla trasparenza o sulla correttezza del processo. L'Head of Asset Management può prendere parte attiva al processo di valutazione qualora ciò sia esplicitamente richiesto dall'Head of Division competente.",
      "L'Associazione è libera di rifiutare motivatamente una domanda di ammissione, fermo restando il divieto di motivazioni discriminatorie ai sensi dell'Art. 4 comma 1."
    ],
    "bodyEn": [
      "The Association recognises the right to apply for membership to all students of Università Commerciale Luigi Bocconi, without distinction of race, ethnicity, religion, nationality, sex, gender identity, sexual orientation, disability or personal and social condition.",
      "Applications for membership are submitted through the procedure organised by the Association during the first weeks of each academic semester. The applicant declares, upon application, that he or she shares the purposes and objectives of the Association and accepts the present Statute in full.",
      "Academic performance shall in no case constitute a criterion for admission.",
      "Applications for membership are received and handled by the Head of Division referred to in Art. 17, with the support of the Team Leaders of the division referred to in Art. 18, where present. Any rejection shall always be motivated in writing to the candidate and may in no case be based on discriminatory grounds pursuant to Art. 4, paragraph 1. Legitimate grounds for rejection include, by way of example and without limitation, the reaching of the maximum number of new members admissible in the semester pursuant to Art. 6, paragraph 3, the incompleteness or formal irregularity of the application, and the absence of the requirements set forth in Art. 6, paragraph 1.",
      "The final decision as to whether the application is accepted or rejected rests with the Head of Division.",
      "The number of new members admitted to each division in each semester is established by the Head of Division in agreement with the President, the Vice-President and the Head of Asset Management. Each division shall admit at least one new member per semester.",
      "The President, the Vice-President and the Head of Asset Management reserve the right to review any admission in case of doubts regarding the transparency or the correctness of the process. The Head of Asset Management may take an a ctive part in the process of evaluation of admission applications when expressly requested to do so by the competent Head of Division.",
      "The Association is free to refuse, with stated reasons, an application for membership, without prejudice to the prohibition of discriminatory grounds pursuant to Art. 4, paragraph 1."
    ]
  },
  {
    "n": 6,
    "titleIt": "Soci",
    "titleEn": "Members",
    "bodyIt": [
      "Sono soci dell'Associazione coloro che, condividendone scopi e finalità, aderiscono ad essa nel rispetto della procedura di cui all'Art. 5, e che siano in possesso dei seguenti requisiti:",
      "a) essere regolarmente iscritti (in corso o fuori corso) a un corso di laurea triennale, magistrale o magistrale a ciclo unico, a un master universitario o a un dottorato di ricerca presso l'Università Bocconi;",
      "b) aver versato la quota associativa di cui all'Art. 7.",
      "La qualità di socio è personale e non trasferibile.",
      "Il numero massimo dei soci dell'Associazione non può eccedere 110.",
      "L'elenco dei soci è aggiornato a cura dell'Head of Operations e trasmesso annualmente agli uffici competenti dell'Università Bocconi unitamente alle generalità del Presidente e del Vicepresidente, secondo quanto previsto dai regolamenti universitari."
    ],
    "bodyEn": [
      "Members of the Association are those who, sharing its purposes and objectives, join it in accordance with the procedure set out in Art. 5, and who meet the following requirements:",
      "a) being regularly enrolled (in course or out of course) in a bachelor's, master's or single-cycle master's degree programme, a university master's programme, or a doctoral programme at Università Bocconi;",
      "b) having paid the membership fee referred to in Art. 7.",
      "Membership is personal and non-transferable.",
      "The maximum number of members of the Association shall not exceed 110.",
      "The list of members is kept up to date by the Head of Operations and transmitted annually to the competent offices of Università Bocconi, together with the personal details of the President and the Vice-President, in accordance with the applicable university regulations."
    ]
  },
  {
    "n": 7,
    "titleIt": "Quota associativa",
    "titleEn": "Membership fee",
    "bodyIt": [
      "Tutti i soci sono tenuti a versare la quota associativa con cadenza semestrale, all'inizio di ciascun semestre accademico.",
      "L'importo minimo della quota è fissato in € 10,00 (dieci euro) per semestre. L'importo è eventualmente modificato dall'Assemblea mediante deliberazione di modifica del presente Statuto.",
      "La raccolta della quota è curata dall'Head of Operations di cui all'Art. 22.",
      "Il Vicepresidente verifica l'avvenuta raccolta delle quote ogni semestre. In caso di mancato pagamento, il Vicepresidente solleva la questione al Consiglio Direttivo.",
      "Il mancato pagamento della quota associativa costituisce causa tassativa di espulsione ai sensi dell'Art. 9.",
      "La quota associativa ha esclusiva finalità di autofinanziamento dell'Associazione e non costituisce in alcun caso strumento di distribuzione di utili."
    ],
    "bodyEn": [
      "All members are required to pay the membership fee on a semestral basis, at the beginning of each academic semester.",
      "The minimum amount of the fee is set at € 10,00 (ten euros) per semester. The amount may be modified by the Assembly by way of amendment of the present Statute.",
      "The collection of the fee is the responsibility of the Head of Operations referred to in Art. 22.",
      "The Vice-President verifies the proper collection of the fees each semester. In the event of non-payment, the Vice-President shall raise the matter before the Board of Directors.",
      "Failure to pay the membership fee constitutes a peremptory ground for expulsion pursuant to Art. 9.",
      "The membership fee serves exclusively the purpose of self-financing the Association and shall in no case constitute an instrument for the distribution of profits."
    ]
  },
  {
    "n": 8,
    "titleIt": "Diritti e doveri dei soci",
    "titleEn": "Rights and duties of members",
    "bodyIt": [
      "L'adesione all'Associazione comporta per tutti i soci il diritto di voto nell'Assemblea, con pari valore per ciascun socio.",
      "Ai soci è riconosciuto il diritto di:",
      "a) candidarsi e ricoprire le cariche associative previste dal presente Statuto, nel rispetto dei prerequisiti applicabili a ciascuna carica;",
      "b) partecipare alla vita associativa e a tutte le iniziative promosse dall'Associazione;",
      "c) essere informati sulle attività dell'Associazione;",
      "d) essere rimborsati per le spese effettivamente sostenute e dimostrabili nello svolgimento dell'attività prestata, in base a quanto preventivamente concordato con gli organi preposti.",
      "Tutti i soci hanno il dovere di:",
      "a) osservare il presente Statuto e i regolamenti universitari applicabili;",
      "b) prestare il lavoro concordemente assegnato dagli organi competenti dell'Associazione;",
      "c) evitare ogni iniziativa contrastante con gli obiettivi e gli scopi dell'Associazione nell'esercizio dell'attività inerente a quest'ultima;",
      "d) partecipare attivamente alle iniziative organizzate dall'Associazione nell'arco del semestre;",
      "e) astenersi da qualsiasi comportamento di cui all'Art. 4 comma 3.",
      "Le cariche associative previste dal presente Statuto sono assunte a titolo gratuito.",
      "L'attività dei soci è svolta prevalentemente in modo personale, volontario e senza fini di lucro, in ragione delle disponibilità personali.",
      "È fatto espresso divieto a tutti i soci di sottoscrivere contratti di riservatezza in relazione all'attività associativa, in conformità con quanto disposto all'Art. 4 comma 5."
    ],
    "bodyEn": [
      "Membership in the Association entails for all members the right to vote in the Assembly, with equal weight for each member.",
      "Members are granted the right to:",
      "a) stand for and hold the offices provided for in the present Statute, in compliance with the prerequisites applicable to each office;",
      "b) participate in the life of the Association and in all initiatives promoted by it;",
      "c) be informed of the Association's activities;",
      "d) be reimbursed for expenses actually incurred and demonstrable in the performance of the activity rendered, based on what has been agreed in advance with the competent bodies.",
      "All members have the duty to:",
      "a) comply with the present Statute and with the applicable university regulations;",
      "b) perform the work duly assigned by the competent bodies of the Association;",
      "c) refrain from any initiative conflicting with the purposes and objectives of the Association in the exercise of the activity pertaining thereto;",
      "d) actively participate in the initiatives organised by the Association during the semester;",
      "e) refrain from any conduct referred to in Art. 4, paragraph 3.",
      "The offices provided for in the present Statute are held free of charge.",
      "The activity of members is carried out predominantly on a personal, voluntary and non-profit basis, in accordance with personal availability.",
      "All members are expressly prohibited from entering into confidentiality agreements in connection with the Association's activities, in accordance with the provisions of Art. 4, paragraph 5."
    ]
  },
  {
    "n": 9,
    "titleIt": "Perdita dello status di socio, espulsione e pausa volontaria",
    "titleEn": "Loss of membership, expulsion and voluntary leave",
    "bodyIt": [
      "Lo status di socio si perde per:",
      "a) cessazione dei requisiti: il conseguimento del titolo di laurea o l'interruzione, a qualsiasi titolo, dell'iscrizione presso l'Università Bocconi comportano la perdita automatica della qualità di socio;",
      "b) recesso volontario: ogni socio può, in qualsiasi momento, comunicare per iscritto al Presidente la propria volontà di recedere dall'Associazione; il recesso ha effetto immediato dalla notifica;",
      "c) espulsione, deliberata ai sensi dei commi seguenti.",
      "L'espulsione è deliberata dal Presidente e dal Vicepresidente congiuntamente, su indicazione dell'Head of Division di riferimento, sentito il Team Leader della divisione ove presente.",
      "La procedura di espulsione è la seguente:",
      "a) avvertimento orale o scritto al socio, contenente l'esplicitazione del comportamento contestato;",
      "b) termine di trenta (30) giorni solari, decorrenti dalla data dell'avvertimento, entro i quali il socio è tenuto a correggere il comportamento contestato;",
      "c) in caso di mancato miglioramento entro il termine, delibera di espulsione assunta dal Presidente e dal Vicepresidente, comunicata per iscritto all'interessato.",
      "Costituiscono causa tassativa di espulsione:",
      "a) la completa inattività prolungata del socio;",
      "b) l'impossibilità prolungata di raggiungere il socio tramite messaggio o chiamata sui recapiti forniti all'Associazione;",
      "c) il mancato pagamento della quota associativa semestrale, ai sensi dell'Art. 7 comma 5;",
      "d) comportamenti in contrasto con le norme di civile convivenza;",
      "e) comportamenti non conformi ai codici di condotta dell'Università Bocconi, al Regolamento Generale CASA e al Regolamento Operativo CASA.",
      "Per le ipotesi di cui al comma 4 lettera c) la procedura di avvertimento di cui al comma 3 non è richiesta: l'espulsione è automatica decorso il termine di pagamento.",
      "Ogni comportamento riconducibile alle fattispecie di cui all'Art. 4 comma 3 implica il deferimento degli studenti coinvolti alla competente Commissione Disciplinare dell'Università Bocconi.",
      "Pausa volontaria dell'attività associativa. Un socio può, per ragioni personali e private o per ragioni di scambio all'estero, richiedere di prendere un (1) semestre di pausa da ogni impegno associativo.",
      "La richiesta di pausa di cui al comma precedente deve essere adeguatamente discussa con il proprio Team Leader o con il proprio Head of Division, ed essere comunicata al Consiglio Direttivo.",
      "La pausa non esonera il socio dal versamento della quota associativa semestrale di cui all'Art. 7.",
      "Il Consiglio Direttivo si riserva la facoltà di valutare, accettare o respingere ogni richiesta di pausa. La richiesta deve necessariamente essere accolta, a fronte di motivazione esposta, qualora il socio richiedente sia stato attivo e corretto nei confronti dell'Associazione per almeno due (2) semestri precedenti la richiesta.",
      "La pausa ha durata massima di un (1) semestre e non può essere prolungata. Al termine, il socio decide se prendere pienamente parte di nuovo alle attività dell'Associazione o se lasciare l'Associazione volontariamente ai sensi del comma 1 lettera b).",
      "Durante il periodo di pausa, non possono essere contestate al socio la mancata reperibilità telefonica o tramite messaggio, né la prolungata inattività di cui al comma 4 lettere a) e b)."
    ],
    "bodyEn": [
      "Membership shall be lost by:",
      "a) cessation of requirements: graduation or the interruption, on any ground, of enrolment at Università Bocconi results in the automatic loss of membership;",
      "b) voluntary withdrawal: any member may, at any time, communicate in writing to the President his or her intention to withdraw from the Association; the withdrawal shall take effect immediately upon notification;",
      "c) expulsion, as resolved pursuant to the following paragraphs.",
      "Expulsion is resolved jointly by the President and the Vice-President, upon recommendation of the relevant Head of Division, having consulted the Team Leader of the division where present.",
      "The expulsion procedure is as follows:",
      "a) oral or written warning to the member, setting out the conduct objected to;",
      "b) a period of thirty (30) calendar days from the date of the warning within which the member is required to correct the conduct objected to;",
      "c) in the absence of improvement within the period, resolution of expulsion adopted by the President and the Vice-President, communicated in writing to the person concerned.",
      "The following constitute peremptory grounds for expulsion:",
      "a) the member's complete and prolonged inactivity;",
      "b) the prolonged impossibility of reaching the member by message or telephone call on the contact details provided to the Association;",
      "c) failure to pay the semestral membership fee, pursuant to Art. 7, paragraph 5;",
      "d) conduct in conflict with the norms of civil coexistence;",
      "e) conduct inconsistent with the codes of conduct of Università Bocconi, the CASA General Regulation and the CASA Operational Regulation.",
      "For the cases under paragraph 4 letter c), the warning procedure under paragraph 3 is not required: expulsion is automatic upon expiry of the payment deadline.",
      "Any conduct falling within the scope of Art. 4, paragraph 3, shall result in the referral of the students involved to the competent Disciplinary Committee of Università Bocconi.",
      "Voluntary leave from associative activity. A member may, for personal and private reasons or for reasons of study exchange abroad, request to take one (1) semester of leave from all associative commitments.",
      "The leave request referred to in the preceding paragraph shall be duly discussed with the member's own Team Leader or Head of Division, and communicated to the Board of Directors.",
      "The leave does not exempt the member from the payment of the semestral membership fee referred to in Art. 7.",
      "The Board of Directors reserves the right to evaluate, accept or reject any leave request. The request shall necessarily be accepted, upon stated motivation, where the requesting member has been active and correct towards the Association for at least the two (2) semesters preceding the request.",
      "The leave has a maximum duration of one (1) semester and may not be extended. At the end of the leave, the member shall decide whether to fully resume participation in the Association's activities or to leave the Association voluntarily pursuant to paragraph 1 letter b).",
      "During the leave period, the member's unreachability by telephone or message, and the prolonged inactivity referred to in paragraph 4 letters a) and b), may not be raised against him or her."
    ]
  },
  {
    "n": 10,
    "titleIt": "Organi dell'Associazione",
    "titleEn": "Organs of the Association",
    "bodyIt": [
      "Sono organi dell'Associazione:",
      "a) l'Assemblea;",
      "b) il Presidente;",
      "c) il Vicepresidente;",
      "d) il Consiglio Direttivo.",
      "La struttura operativa dell'Associazione, articolata in divisioni core e divisioni ausiliarie, è disciplinata dagli Artt. 15 e seguenti.",
      "Costituisce requisito necessario per il conferimento e per la permanenza in qualsiasi carica di responsabilità nell'Associazione la presenza fisica del titolare a Milano e on campus per l'intera durata del mandato. Tale requisito non si applica alle cariche di Head of Asset Management e di Head of Media & Communication."
    ],
    "bodyEn": [
      "The organs of the Association are:",
      "a) the Assembly;",
      "b) the President;",
      "c) the Vice-President;",
      "d) the Board of Directors.",
      "The operational structure of the Association, organised in core and auxiliary divisions, is governed by Art. 15 and following.",
      "The physical presence of the holder in Milan and on campus for the entire duration of the mandate constitutes a necessary requirement for the conferral of and continued holding of any office of responsibility in the Association. This requirement does not apply to the offices of Head of Asset Management and Head of Media & Communication."
    ]
  },
  {
    "n": 11,
    "titleIt": "L'Assemblea",
    "titleEn": "The Assembly",
    "bodyIt": [
      "L'Assemblea è composta da tutti i soci, ciascuno dei quali dispone di pari diritto di voto. Essa costituisce il principale momento di confronto e attività atto ad assicurare una corretta e democratica gestione dell'Associazione.",
      "L'Assemblea è convocata in via ordinaria dal Presidente almeno due volte all'anno, all'inizio di ciascun semestre accademico e dopo l'ingresso dei nuovi soci.",
      "L'Assemblea è convocata in via straordinaria ogni volta sia necessaria, oppure su richiesta scritta del Consiglio Direttivo o di almeno un terzo (1/3) dei soci.",
      "La convocazione avviene mediante comunicazione scritta inviata ai soci o mediante avviso pubblico sui canali ufficiali dell'Associazione, con preavviso di almeno sette (7) giorni solari rispetto alla data fissata per l'adunanza. L'avviso indica l'ordine del giorno.",
      "L'Assemblea è regolarmente costituita:",
      "a) in prima convocazione, con la presenza della maggioranza assoluta dei soci aventi diritto al voto (50% più 1);",
      "b) in seconda convocazione, qualunque sia il numero dei soci presenti.",
      "Le delibere sono assunte a maggioranza semplice dei presenti aventi diritto al voto.",
      "Le delibere sono assunte di norma con voto palese; l'Assemblea può deliberare caso per caso il ricorso al voto segreto, in particolare quando la delibera riguardi persone o la qualità delle persone.",
      "Non sono ammesse deleghe.",
      "Di ogni Assemblea è redatto apposito verbale, firmato dal Presidente e dal Vicepresidente. Il verbale è reso disponibile a tutti i soci che ne facciano richiesta.",
      "L'Assemblea ha i seguenti compiti:",
      "a) ratificare le nomine alle cariche associative deliberate dal Consiglio Direttivo uscente, nella prima Assemblea ordinaria del primo semestre accademico;",
      "b) approvare il rendiconto economico-finanziario di cui all'Art. 25, qualora ne sia formulata richiesta;",
      "c) deliberare le modifiche al presente Statuto;",
      "d) deliberare lo scioglimento dell'Associazione ai sensi dell'Art. 27;",
      "e) deliberare su ogni altra questione ad essa rimessa."
    ],
    "bodyEn": [
      "The Assembly is composed of all members, each of whom has equal voting rights. It constitutes the principal forum of discussion and activity ensuring the correct and democratic management of the Association.",
      "The Assembly is convened in ordinary session by the President at least twice a year, at the beginning of each academic semester and following the admission of new members.",
      "The Assembly is convened in extraordinary session whenever necessary, or upon written request of the Board of Directors or of at least one third (1/3) of the members.",
      "Convocation takes place by written notice to members or by public notice on the Association's official channels, with at least seven (7) calendar days' prior notice with respect to the date set for the meeting. The notice shall indicate the agenda.",
      "The Assembly is duly constituted:",
      "a) on first call, with the presence of the absolute majority of members entitled to vote (50% plus 1);",
      "b) on second call, whatever the number of members present.",
      "Resolutions are adopted by simple majority of the voting members present.",
      "Voting shall ordinarily be by open ballot; the Assembly may decide on a case-by-case basis to resort to secret ballot, in particular where the resolution concerns persons or the quality of persons.",
      "No proxies are admitted.",
      "Minutes of each Assembly shall be drawn up, signed by the President and the Vice-President. The minutes shall be made available to all members upon request.",
      "The Assembly has the following duties:",
      "a) to ratify the appointments to associative offices resolved by the outgoing Board of Directors, at the first ordinary Assembly of the first academic semester;",
      "b) to approve the economic and financial statement referred to in Art. 25, where so requested;",
      "c) to resolve on amendments to the present Statute;",
      "d) to resolve on the dissolution of the Association pursuant to Art. 27;",
      "e) to resolve on any other matter referred to it."
    ]
  },
  {
    "n": 12,
    "titleIt": "Il Presidente",
    "titleEn": "The President",
    "bodyIt": [
      "Il Presidente dirige e coordina ogni sforzo dell'Associazione ai fini del perseguimento dei suoi scopi. Egli è il legale rappresentante dell'Associazione a tutti gli effetti e nei confronti dell'Università Bocconi e dei terzi.",
      "Elezione e mandato:",
      "a) il Presidente è proposto dal Consiglio Direttivo uscente, votato dal Consiglio Direttivo uscente a maggioranza assoluta e ratificato dall'Assemblea a maggioranza semplice;",
      "b) il mandato ha durata di un (1) semestre accademico, rinnovabile consecutivamente per una sola volta, per una durata massima complessiva di un (1) anno accademico;",
      "c) la carica decade automaticamente con il conseguimento del titolo di laurea;",
      "d) sono prerequisiti per la carica: almeno due (2) anni di attività attiva nell'Associazione e almeno un (1) semestre di esperienza come Head of Division di una divisione core o come Head of Asset Management.",
      "Poteri e responsabilità:",
      "a) rappresentanza legale dell'Associazione verso l'esterno e verso l'Università Bocconi;",
      "b) interfaccia con entità esterne, ivi inclusi alumni, altre associazioni, aziende e professionisti;",
      "c) gestione della comunità alumni dell'Associazione;",
      "d) supervisione e organizzazione di eventi con ospiti e relatori esterni;",
      "e) monitoraggio e controllo del lavoro della divisione Media & Communication;",
      "f) gestione, congiuntamente al Vicepresidente, dell'evento universitario Associazioni in Mostra;",
      "g) rinnovo dell'iscrizione dell'Associazione all'Albo CASA al termine del secondo semestre accademico; tale obbligo è in capo esclusivo al Presidente;",
      "h) tenuta della tesoreria e responsabilità ultima del rendiconto economico-finanziario di cui all'Art. 25;",
      "i) convocazione e presidenza dell'Assemblea e del Consiglio Direttivo, sia in convocazione ordinaria sia straordinaria;",
      "j) sottoscrizione di tutti gli atti amministrativi compiuti dall'Associazione;",
      "k) facoltà di proporre al Consiglio Direttivo il blocco della pubblicazione di un report, ai sensi dell'Art. 14 comma 4 lettera c).",
      "Delega: il Presidente può delegare semestralmente, per iscritto e con comunicazione al Consiglio Direttivo, qualsiasi delle proprie funzioni, ad eccezione di:",
      "a) le funzioni di controllo;",
      "b) il rinnovo dell'iscrizione dell'Associazione all'Albo CASA;",
      "c) i rapporti con i soggetti terzi.",
      "Voto del Presidente nel Consiglio Direttivo: in caso di parità nelle delibere del Consiglio Direttivo, il voto del Presidente prevale, ai sensi dell'Art. 14 comma 4 lettera a).",
      "Sostituzione in caso di dimissioni: in caso di dimissioni, impedimento prolungato o decadenza del Presidente, il Vicepresidente assume i pieni poteri del Presidente nell'interim e convoca l'Assemblea entro trenta (30) giorni per l'elezione del nuovo Presidente, secondo la procedura di cui al comma 2.",
      "Decadenza per iniziativa del Consiglio Direttivo: in caso di evidenti mancanze o di comportamenti volti a danneggiare l'Associazione, il Consiglio Direttivo può deliberare la decadenza del Presidente con voto unanime dei membri votanti, escluso il voto del Presidente."
    ],
    "bodyEn": [
      "The President directs and coordinates every effort of the Association towards the pursuit of its purposes. The President is the legal representative of the Association for all purposes and vis-à-vis Università Bocconi and third parties.",
      "Election and term:",
      "a) the President is proposed by the outgoing Board of Directors, voted upon by the outgoing Board of Directors by absolute majority and ratified by the Assembly by simple majority;",
      "b) the term has a duration of one (1) academic semester, renewable consecutively only once, for a maximum total duration of one (1) academic year;",
      "c) the office expires automatically upon graduation;",
      "d) the prerequisites for the office are: at least two (2) years of active participation in the Association and at least one (1) semester of experience as Head of Division of a core division or as Head of Asset Management.",
      "Powers and responsibilities:",
      "a) legal representation of the Association externally and vis-à-vis Università Bocconi;",
      "b) interface with external entities, including alumni, other associations, companies and professionals;",
      "c) management of the Association's alumni community;",
      "d) supervision and organisation of events with external guests and speakers;",
      "e) monitoring and control of the work of the Media & Communication division;",
      "f) joint management with the Vice-President of the university event Associazioni in Mostra;",
      "g) renewal of the Association's registration with the CASA Albo at the end of the second academic semester; this obligation lies exclusively with the President;",
      "h) keeping of the treasury and ultimate responsibility for the economic and financial statement referred to in Art. 25;",
      "i) convocation and chairing of the Assembly and of the Board of Directors, both in ordinary and extraordinary session;",
      "j) signature of all administrative acts performed by the Association;",
      "k) the power to propose to the Board of Directors the blocking of the publication of a report, pursuant to Art. 14, paragraph 4, letter c).",
      "Delegation: the President may delegate semestrally, in writing and with notice to the Board of Directors, any of his or her functions, with the exception of:",
      "a) control functions;",
      "b) the renewal of the Association's registration with the CASA Albo;",
      "c) relations with third parties.",
      "Vote of the President in the Board of Directors: in the event of a tie in the resolutions of the Board of Directors, the vote of the President prevails, pursuant to Art. 14, paragraph 4, letter a).",
      "Substitution in the event of resignation: in the event of resignation, prolonged impediment or expiry of the President's office, the Vice-President shall assume full presidential powers in the interim and shall convene the Assembly within thirty (30) days for the election of the new President, in accordance with the procedure set out in paragraph 2.",
      "Removal at the initiative of the Board of Directors: in the event of manifest dereliction of duty or of conduct intended to harm the Association, the Board of Directors may resolve the removal of the President by unanimous vote of the voting members, excluding the vote of the President."
    ]
  },
  {
    "n": 13,
    "titleIt": "Il Vicepresidente",
    "titleEn": "The Vice-President",
    "bodyIt": [
      "Il Vicepresidente affianca il Presidente nella direzione dell'Associazione e ne assume integralmente le funzioni in caso di assenza, impedimento o dimissioni di quest'ultimo. Il Vicepresidente è altresì legale rappresentante dell'Associazione.",
      "Elezione e mandato:",
      "a) il Vicepresidente è proposto dal Consiglio Direttivo uscente, votato dal Consiglio Direttivo uscente e ratificato dall'Assemblea a maggioranza semplice;",
      "b) il mandato ha durata di un (1) semestre accademico, rinnovabile consecutivamente per una sola volta, per una durata massima complessiva di un (1) anno accademico;",
      "c) la carica decade automaticamente con il conseguimento del titolo di laurea;",
      "d) il ruolo del Vicepresidente non può essere strutturalmente vacante: è sempre coperto;",
      "e) sono prerequisiti per la carica: almeno due (2) anni di attività attiva nell'Associazione e almeno un (1) semestre di esperienza come Head of Division di una divisione core o come Head of Asset Management.",
      "Poteri e responsabilità:",
      "a) svolgimento delle funzioni del Presidente in caso di sua assenza, impedimento o dimissioni;",
      "b) voto libero e non vincolato nel Consiglio Direttivo;",
      "c) supervisione e coordinamento dell'organizzazione di eventi interni, ivi incluse videochiamate, riunioni e assemblee, congiuntamente all'Head of Operations;",
      "d) controllo dell'avvenuto rinnovo dell'iscrizione dell'Associazione all'Albo CASA al termine del secondo semestre accademico;",
      "e) controllo dell'avvenuta raccolta delle quote associative semestrali, con sollevamento della questione al Consiglio Direttivo in caso di mancato pagamento;",
      "f) gestione, congiuntamente al Presidente, dell'evento universitario Associazioni in Mostra;",
      "g) assunzione delle funzioni dell'Head of Asset Management in caso di vacanza del ruolo, ai sensi dell'Art. 16 comma 2;",
      "h) supervisione gerarchica dell'Head of Operations, il quale riporta formalmente al Vicepresidente e al Presidente;",
      "i) facoltà di proporre al Consiglio Direttivo il blocco della pubblicazione di un report, ai sensi dell'Art. 14 comma 4 lettera c).",
      "Sostituzione in caso di dimissioni: in caso di dimissioni, impedimento prolungato o decadenza del Vicepresidente, il membro del Consiglio Direttivo con maggiore anzianità associativa convoca l'Assemblea entro trenta (30) giorni per l'elezione del nuovo Vicepresidente. Nell'interim, l'ordinaria amministrazione è gestita collegialmente dal Consiglio Direttivo."
    ],
    "bodyEn": [
      "The Vice-President supports the President in the direction of the Association and shall fully assume his or her functions in case of absence, impediment or resignation of the latter. The Vice-President is also a legal representative of the Association.",
      "Election and term:",
      "a) the Vice-President is proposed by the outgoing Board of Directors, voted upon by the outgoing Board of Directors and ratified by the Assembly by simple majority;",
      "b) the term has a duration of one (1) academic semester, renewable consecutively only once, for a maximum total duration of one (1) academic year;",
      "c) the office expires automatically upon graduation;",
      "d) the role of Vice-President shall not be structurally vacant: it is always covered;",
      "e) the prerequisites for the office are: at least two (2) years of active participation in the Association and at least one (1) semester of experience as Head of Division of a core division or as Head of Asset Management.",
      "Powers and responsibilities:",
      "a) performance of the President's functions in case of his or her absence, impediment or resignation;",
      "b) free and unbound vote in the Board of Directors;",
      "c) supervision and coordination of the organisation of internal events, including videocalls, meetings and assemblies, jointly with the Head of Operations;",
      "d) verification of the renewal of the Association's registration with the CASA Albo at the end of the second academic semester;",
      "e) verification of the collection of semestral membership fees, raising the matter before the Board of Directors in the event of non-payment;",
      "f) joint management with the President of the university event Associazioni in Mostra;",
      "g) assumption of the functions of the Head of Asset Management in the event of vacancy of the role, pursuant to Art. 16, paragraph 2;",
      "h) hierarchical supervision of the Head of Operations, who formally reports to the Vice-President and the President;",
      "i) the power to propose to the Board of Directors the blocking of the publication of a report, pursuant to Art. 14, paragraph 4, letter c).",
      "Substitution in the event of resignation: in case of resignation, prolonged impediment or expiry of the Vice-President's office, the member of the Board of Directors with the greatest seniority in the Association shall convene the Assembly within thirty (30) days for the election of the new Vice-President. In the interim, ordinary administration is collegially managed by the Board of Directors."
    ]
  },
  {
    "n": 14,
    "titleIt": "Il Consiglio Direttivo",
    "titleEn": "The Board of Directors",
    "bodyIt": [
      "Il Consiglio Direttivo è l'organo esecutivo dell'Associazione.",
      "Composizione: il Consiglio Direttivo è composto da dieci (10) membri, di cui otto (8) con diritto di voto e due (2) senza diritto di voto:",
      "Carica",
      "Diritto di voto",
      "Presidente",
      "Sì, con voto doppio in caso di parità",
      "Vicepresidente",
      "Sì",
      "Head of Asset Management (se coperto)",
      "Sì",
      "Head of Equity Research",
      "Sì",
      "Head of Investment Research",
      "Sì",
      "Head of Macro Research",
      "Sì",
      "Head of Portfolio Management",
      "Sì",
      "Head of Quantitative Research",
      "Sì",
      "Head of Media & Communication",
      "No",
      "Head of Operations",
      "No",
      "In caso di vacanza dell'Head of Asset Management ai sensi dell'Art. 16 comma 1, i membri votanti sono sette (7) e la parità è strutturalmente impossibile.",
      "Maggioranze richieste:",
      "a) delibere ordinarie: maggioranza semplice dei membri votanti; in caso di parità prevale il voto del Presidente;",
      "b) scioglimento anticipato di una divisione: maggioranza qualificata di almeno due terzi (2/3) dei membri votanti;",
      "c) blocco della pubblicazione di un report: maggioranza qualificata di tre quarti (3/4) dei membri votanti, pari a sei (6) voti favorevoli su otto, ovvero sei (6) su sette in caso di vacanza dell'Head of Asset Management; la proposta di blocco può essere formulata esclusivamente dal Presidente, dal Vicepresidente o dall'Head of Asset Management;",
      "d) decadenza del Presidente: unanimità dei membri votanti, escluso il voto del Presidente, ai sensi dell'Art. 12 comma 7;",
      "e) espulsione di un socio: delibera congiunta del Presidente e del Vicepresidente, fuori dall'organo collegiale, ai sensi dell'Art. 9 comma 2.",
      "Compiti del Consiglio Direttivo:",
      "a) compiere tutti gli atti di ordinaria e straordinaria amministrazione non espressamente demandati all'Assemblea o ad altri organi;",
      "b) predisporre gli atti da sottoporre all'Assemblea;",
      "c) deliberare sul blocco della pubblicazione di un report, secondo la procedura di cui all'Art. 17 comma 5;",
      "d) deliberare sullo scioglimento anticipato di una divisione, su proposta motivata del Presidente, del Vicepresidente o dell'Head of Asset Management;",
      "e) deliberare sulla decadenza del Presidente nei casi di cui all'Art. 12 comma 7;",
      "f) dare attuazione alle direttive generali deliberate dall'Assemblea.",
      "Convocazione: il Consiglio Direttivo si riunisce ogni qualvolta il Presidente lo ritenga necessario, o su richiesta di almeno la metà più uno dei membri del Consiglio.",
      "Quorum costitutivo: il Consiglio Direttivo è validamente costituito con la presenza della maggioranza dei membri votanti in carica.",
      "Di ogni riunione del Consiglio Direttivo è redatto apposito verbale, custodito dall'Head of Operations e reso disponibile ai soci che ne facciano richiesta."
    ],
    "bodyEn": [
      "The Board of Directors is the executive body of the Association.",
      "Composition: the Board of Directors consists of ten (10) members, of which eight (8) with voting rights and two (2) without voting rights:",
      "Office",
      "Voting right",
      "President",
      "Yes, with double vote in case of tie",
      "Vice-President",
      "Yes",
      "Head of Asset Management (where covered)",
      "Yes",
      "Head of Equity Research",
      "Yes",
      "Head of Investment Research",
      "Yes",
      "Head of Macro Research",
      "Yes",
      "Head of Portfolio Management",
      "Yes",
      "Head of Quantitative Research",
      "Yes",
      "Head of Media & Communication",
      "No",
      "Head of Operations",
      "No",
      "In the event of vacancy of the Head of Asset Management pursuant to Art. 16, paragraph 1, the voting members shall be seven (7) and a tie shall be structurally impossible.",
      "Required majorities:",
      "a) ordinary resolutions: simple majority of voting members; in case of a tie, the vote of the President prevails;",
      "b) early dissolution of a division: qualified majority of at least two thirds (2/3) of voting members;",
      "c) blocking of the publication of a report: qualified majority of three quarters (3/4) of voting members, equal to six (6) favourable votes out of eight, or six (6) out of seven in the event of vacancy of the Head of Asset Management; the proposal to block may be formulated exclusively by the President, the Vice-President or the Head of Asset Management;",
      "d) removal of the President: unanimity of voting members, excluding the vote of the President, pursuant to Art. 12, paragraph 7;",
      "e) expulsion of a member: joint resolution of the President and the Vice-President, outside the collegial body, pursuant to Art. 9, paragraph 2.",
      "Duties of the Board of Directors:",
      "a) to perform all acts of ordinary and extraordinary administration not expressly reserved to the Assembly or to other organs;",
      "b) to prepare the acts to be submitted to the Assembly;",
      "c) to resolve on the blocking of the publication of a report, in accordance with the procedure set out in Art. 17, paragraph 5;",
      "d) to resolve on the early dissolution of a division, upon reasoned proposal of the President, the Vice-President or the Head of Asset Management;",
      "e) to resolve on the removal of the President in the cases referred to in Art. 12, paragraph 7;",
      "f) to implement the general directives resolved by the Assembly.",
      "Convocation: the Board of Directors shall meet whenever the President deems it necessary, or upon request of at least half plus one of the members of the Board.",
      "Quorum: the Board of Directors is duly constituted with the presence of the majority of voting members in office.",
      "Minutes of each meeting of the Board of Directors shall be drawn up, kept by the Head of Operations, and made available to members upon request."
    ]
  },
  {
    "n": 15,
    "titleIt": "Struttura operativa: divisioni core e ausiliarie",
    "titleEn": "Operational structure: core and auxiliary divisions",
    "bodyIt": [
      "L'Associazione è articolata operativamente in sette (7) divisioni, suddivise in cinque divisioni core e due divisioni ausiliarie.",
      "Divisioni core (cinque), aventi pari status gerarchico fra loro:",
      "a) Equity Research;",
      "b) Investment Research;",
      "c) Macro Research;",
      "d) Portfolio Management;",
      "e) Quantitative Research.",
      "Divisioni ausiliarie (due):",
      "a) Media & Communication;",
      "b) Operations.",
      "Le divisioni core godono di autonomia marginale nella scelta delle modalità di organizzazione delle proprie attività interne, della struttura del proprio team e dei progetti da intraprendere nel semestre. Possono differire fra loro per numero di membri, struttura interna e numero o natura dei progetti.",
      "Il Presidente, il Vicepresidente e l'Head of Asset Management, agendo in modo coordinato, possono comunicare la non approvazione di un cambiamento strutturale o di processo proposto da una divisione, e possono esercitare controllo su puntualità, accuratezza e qualità del lavoro prodotto. Essi non possono imporre modifiche alla struttura e ai processi precedentemente stabiliti.",
      "Scioglimento anticipato di una divisione: lo scioglimento anticipato di una divisione, core o ausiliaria, è deliberato dal Consiglio Direttivo a maggioranza qualificata di almeno due terzi (2/3) dei membri votanti, su proposta motivata del Presidente, del Vicepresidente o dell'Head of Asset Management, ai sensi dell'Art. 14 comma 4 lettera b)."
    ],
    "bodyEn": [
      "The Association is operationally organised into seven (7) divisions, divided into five core divisions and two auxiliary divisions.",
      "Core divisions (five), holding equal hierarchical status among themselves:",
      "a) Equity Research;",
      "b) Investment Research;",
      "c) Macro Research;",
      "d) Portfolio Management;",
      "e) Quantitative Research.",
      "Auxiliary divisions (two):",
      "a) Media & Communication;",
      "b) Operations.",
      "The core divisions enjoy marginal autonomy in the choice of the modalities of organisation of their internal activities, of the structure of their team, and of the projects to be undertaken during the semester. They may differ amongst themselves in number of members, internal structure and number or nature of projects.",
      "The President, the Vice-President and the Head of Asset Management, acting in a coordinated manner, may communicate the non-approval of a structural or process change proposed by a division and may exercise control over timeliness, accuracy and quality of the work produced. They may not impose modifications to the structure and processes previously established.",
      "Early dissolution of a division: the early dissolution of a division, whether core or auxiliary, is resolved by the Board of Directors with a qualified majority of at least two thirds (2/3) of voting members, upon reasoned proposal of the President, the Vice-President or the Head of Asset Management, pursuant to Art. 14, paragraph 4, letter b)."
    ]
  },
  {
    "n": 16,
    "titleIt": "Head of Asset Management",
    "titleEn": "Head of Asset Management",
    "bodyIt": [
      "Natura del ruolo: l'Head of Asset Management è una carica facoltativa, che può non essere coperta a discrezione del Presidente e del Vicepresidente.",
      "In caso di vacanza del ruolo, le funzioni dell'Head of Asset Management sono assunte dal Vicepresidente.",
      "L'Head of Asset Management è gerarchicamente superiore agli Head of Division e sottoposto al Vicepresidente.",
      "L'Head of Asset Management è membro votante del Consiglio Direttivo, ai sensi dell'Art. 14 comma 2.",
      "Nomina e mandato:",
      "a) l'Head of Asset Management è scelto congiuntamente dal nuovo Presidente e dal nuovo Vicepresidente, su proposta degli Head of Division uscenti, anche tra Team Leader e Portfolio Manager distinti dai candidati agli Head of Division;",
      "b) il mandato ha durata di un (1) semestre accademico, rinnovabile consecutivamente per una sola volta, per una durata massima complessiva di un (1) anno accademico;",
      "c) sono prerequisiti per la carica: almeno un (1) anno di attività attiva nell'Associazione e almeno un (1) semestre di esperienza come Portfolio Manager o Team Leader.",
      "Responsabilità:",
      "a) supervisione del rispetto delle scadenze dei report da parte di tutte le divisioni;",
      "b) valutazione della qualità e dell'accuratezza dei progetti prodotti;",
      "c) raccolta dei feedback pratici degli Head of Division;",
      "d) monitoraggio della correttezza del processo di ammissione, con particolare riferimento al trattamento equo di tutti i candidati;",
      "e) partecipazione attiva al processo di valutazione delle domande di ammissione qualora ciò sia esplicitamente richiesto da un Head of Division;",
      "f) nella fase di onboarding, verifica che tutte le candidature siano valutate correttamente;",
      "g) copertura delle funzioni dell'Head of Division in caso di sua assenza o vacanza; in caso di concomitante assenza del Vicepresidente, copertura delle funzioni di quest'ultimo;",
      "h) facoltà di proporre al Consiglio Direttivo il blocco della pubblicazione di un report, ai sensi dell'Art. 14 comma 4 lettera c);",
      "i) facoltà di intervento sui report in merito a formattazione, chiarezza espositiva e rispetto degli standard dell'Associazione."
    ],
    "bodyEn": [
      "Nature of the role: the Head of Asset Management is an optional office, which may remain uncovered at the discretion of the President and the Vice-President.",
      "In the event of vacancy of the role, the functions of the Head of Asset Management are assumed by the Vice-President.",
      "The Head of Asset Management is hierarchically superior to the Heads of Division and subordinate to the Vice-President.",
      "The Head of Asset Management is a voting member of the Board of Directors, pursuant to Art. 14, paragraph 2.",
      "Appointment and term:",
      "a) the Head of Asset Management is chosen jointly by the new President and the new Vice-President, upon proposal of the outgoing Heads of Division, also amongst Team Leaders and Portfolio Managers distinct from the candidates to the Heads of Division;",
      "b) the term has a duration of one (1) academic semester, renewable consecutively only once, for a maximum total duration of one (1) academic year;",
      "c) the prerequisites for the office are: at least one (1) year of active participation in the Association and at least one (1) semester of experience as Portfolio Manager or Team Leader.",
      "Responsibilities:",
      "a) supervision of the timely delivery of reports by all divisions;",
      "b) assessment of the quality and accuracy of the projects produced;",
      "c) collection of practical feedback from the Heads of Division;",
      "d) monitoring of the correctness of the admission process, with particular reference to the fair treatment of all candidates;",
      "e) active participation in the evaluation of admission applications where expressly requested by a Head of Division;",
      "f) during onboarding, verification that all applications are properly assessed;",
      "g) coverage of the functions of a Head of Division in case of his or her absence or vacancy; in case of concurrent absence of the Vice-President, coverage of the latter's functions;",
      "h) the power to propose to the Board of Directors the blocking of the publication of a report, pursuant to Art. 14, paragraph 4, letter c);",
      "i) the power of intervention on reports as regards formatting, clarity of presentation and compliance with the Association's standards."
    ]
  },
  {
    "n": 17,
    "titleIt": "Head of Division",
    "titleEn": "Head of Division",
    "bodyIt": [
      "Ogni divisione core è guidata da un Head of Division, membro votante del Consiglio Direttivo ai sensi dell'Art. 14 comma 2.",
      "Nomina e mandato:",
      "a) l'Head of Division è scelto dal proprio predecessore;",
      "b) la nomina è sottoposta al parere del Vicepresidente e dell'Head of Asset Management;",
      "c) l'approvazione finale è di competenza del Presidente;",
      "d) il mandato ha durata minima di un (1) semestre e massima di un (1) anno accademico;",
      "e) in caso di vacanza imprevista, ivi incluse dimissioni, conseguimento della laurea o impedimento prolungato, si applica il medesimo processo di scelta in via straordinaria;",
      "f) le cariche sono assegnate a soggetti presenti on campus per la maggior parte della durata del semestre;",
      "g) sono prerequisiti per la carica: almeno un (1) anno di attività attiva nell'Associazione e almeno un (1) semestre di esperienza come Portfolio Manager o Team Leader.",
      "Responsabilità:",
      "a) coordinamento dello sviluppo dei progetti della divisione;",
      "b) distribuzione delle mansioni tra i team interni;",
      "c) rispetto delle deadline e correttezza dei report pubblicati;",
      "d) caricamento dei progetti sul sito dell'Associazione; in caso di sua assenza o vacanza, tale compito è assolto dall'Head of Asset Management; in caso di concomitante assenza di quest'ultimo, dal Vicepresidente;",
      "e) interfaccia con il team Media & Communication per la pubblicazione dei contenuti sui canali ufficiali e sui social;",
      "f) segnalazione al Presidente, al Vicepresidente o all'Head of Asset Management di inattività di un membro della divisione o di altre cause di espulsione di cui all'Art. 9 comma 4;",
      "g) organizzazione di almeno un (1) evento in presenza aperto all'intera divisione per ciascun semestre accademico;",
      "h) organizzazione di almeno una (1) videochiamata annuale con gli alumni della divisione.",
      "Gestione del processo di ammissione: l'Head of Division gestisce il processo di ammissione di nuovi membri nella propria divisione ai sensi dell'Art. 5, con il supporto dei Team Leader.",
      "Blocco della pubblicazione di un report, procedura:",
      "a) l'Head of Division non può proporre autonomamente al Consiglio Direttivo il blocco di un report, qualora il lavoro sia stato svolto con dedizione e precisione;",
      "b) qualora l'Head of Division ritenga che un report non sia pubblicabile, segnala la circostanza al Presidente, al Vicepresidente o all'Head of Asset Management;",
      "c) la proposta formale di blocco al Consiglio Direttivo può essere formulata esclusivamente dal Presidente, dal Vicepresidente o dall'Head of Asset Management, e richiede una maggioranza qualificata di tre quarti (3/4) dei membri votanti, ai sensi dell'Art. 14 comma 4 lettera c);",
      "d) a seguito della delibera di blocco, il team interessato discute le modalità di adattamento del progetto agli standard dell'Associazione; in caso di mancato esito positivo, il progetto viene cestinato."
    ],
    "bodyEn": [
      "Each core division is led by a Head of Division, voting member of the Board of Directors pursuant to Art. 14, paragraph 2.",
      "Appointment and term:",
      "a) the Head of Division is chosen by his or her predecessor;",
      "b) the appointment is subject to the opinion of the Vice-President and of the Head of Asset Management;",
      "c) the final approval lies with the President;",
      "d) the term has a minimum duration of one (1) semester and a maximum of one (1) academic year;",
      "e) in the event of unforeseen vacancy, including resignation, graduation or prolonged impediment, the same selection process applies on an extraordinary basis;",
      "f) offices are assigned to persons present on campus for the greater part of the semester's duration;",
      "g) the prerequisites for the office are: at least one (1) year of active participation in the Association and at least one (1) semester of experience as Portfolio Manager or Team Leader.",
      "Responsibilities:",
      "a) coordination of the development of the division's projects;",
      "b) distribution of tasks among the internal teams;",
      "c) respect of deadlines and correctness of published reports;",
      "d) uploading of the projects to the Association's website; in case of absence or vacancy, this task is carried out by the Head of Asset Management; in case of concurrent absence of the latter, by the Vice-President;",
      "e) interface with the Media & Communication team for the publication of content on the official channels and social media;",
      "f) reporting to the President, the Vice-President or the Head of Asset Management of inactivity of a member of the division or of other grounds for expulsion referred to in Art. 9, paragraph 4;",
      "g) organisation of at least one (1) in-person event open to the entire division for each academic semester;",
      "h) organisation of at least one (1) annual videocall with the alumni of the division.",
      "Management of the admission process: the Head of Division manages the admission process of new members of the division pursuant to Art. 5, with the support of the Team Leaders.",
      "Blocking of the publication of a report, procedure:",
      "a) the Head of Division may not autonomously propose to the Board of Directors the blocking of a report, where the work has been carried out with dedication and precision;",
      "b) where the Head of Division considers a report not publishable, he or she shall report the circumstance to the President, the Vice-President or the Head of Asset Management;",
      "c) the formal proposal of blocking to the Board of Directors may be made exclusively by the President, the Vice-President or the Head of Asset Management, and requires a qualified majority of three quarters (3/4) of voting members, pursuant to Art. 14, paragraph 4, letter c);",
      "d) following the resolution of blocking, the team concerned shall discuss the modalities of adaptation of the project to the Association's standards; in the absence of positive outcome, the project shall be discarded."
    ]
  },
  {
    "n": 18,
    "titleIt": "Team Leader e Senior Analyst",
    "titleEn": "Team Leader and Senior Analyst",
    "bodyIt": [
      "All'interno di ciascuna divisione core può essere istituita la carica di Team Leader, anche denominata Senior Analyst.",
      "Natura della carica:",
      "a) la carica è facoltativa, a discrezione dell'Head of Division;",
      "b) sono ammessi al massimo quattro (4) Team Leader per divisione;",
      "c) la durata del mandato segue la durata del mandato dell'Head of Division.",
      "Responsabilità:",
      "a) distribuzione delle task tra i membri del proprio team;",
      "b) organizzazione di incontri di lavoro in presenza, in numero non inferiore a tre (3) per semestre;",
      "c) redazione dei report dei progetti secondo le linee guida dell'Associazione;",
      "d) supporto all'Head of Division nella valutazione delle domande di ammissione ai sensi dell'Art. 5;",
      "e) segnalazione all'Head of Division di inattività di un membro o di altre cause di espulsione di cui all'Art. 9 comma 4.",
      "L'Head of Portfolio Management e l'Head of Asset Management possono intervenire in merito a formattazione, standard di reportistica e gestione del team."
    ],
    "bodyEn": [
      "Within each core division, the office of Team Leader, also denominated Senior Analyst, may be established.",
      "Nature of the office:",
      "a) the office is optional, at the discretion of the Head of Division;",
      "b) a maximum of four (4) Team Leaders per division is admitted;",
      "c) the term of office follows the term of the Head of Division.",
      "Responsibilities:",
      "a) distribution of tasks among the members of the team;",
      "b) organisation of in-person work meetings, not fewer than three (3) per semester;",
      "c) drafting of project reports in accordance with the Association's guidelines;",
      "d) support to the Head of Division during the evaluation of admission applications pursuant to Art. 5;",
      "e) reporting to the Head of Division of inactivity of a member or of other grounds for expulsion referred to in Art. 9, paragraph 4.",
      "The Head of Portfolio Management and the Head of Asset Management may intervene as regards formatting, reporting standards and team management."
    ]
  },
  {
    "n": 19,
    "titleIt": "Portfolio Manager",
    "titleEn": "Portfolio Manager",
    "bodyIt": [
      "La divisione Portfolio Management è caratterizzata dalla presenza della carica di Portfolio Manager, in numero pari a quello dei portafogli a gestione simulata attivi dell'Associazione.",
      "I Portfolio Manager rivestono la qualità di Team Leader ai sensi dell'Art. 18, con responsabilità aggiuntive specifiche al ruolo.",
      "Responsabilità aggiuntive del Portfolio Manager:",
      "a) responsabilità sulla performance del portafoglio assegnato e sul suo monitoraggio;",
      "b) ruolo di decision maker finale sull'inclusione o sulla rimozione di asset dal portafoglio;",
      "c) responsabilità della redazione del report periodico del portafoglio, comprensivo di performance, valore degli asset detenuti e motivazioni delle decisioni di investimento.",
      "L'Head of Portfolio Management e l'Head of Asset Management possono intervenire in merito a formattazione, standard di reportistica e gestione del team, ai sensi dell'Art. 18 comma 4."
    ],
    "bodyEn": [
      "The Portfolio Management division is characterised by the presence of the office of Portfolio Manager, in number equal to that of the active simulated-management portfolios of the Association.",
      "Portfolio Managers hold the status of Team Leader pursuant to Art. 18, with additional responsibilities specific to the role.",
      "Additional responsibilities of the Portfolio Manager:",
      "a) responsibility for the performance of the assigned portfolio and for its monitoring;",
      "b) role of final decision maker on the inclusion or removal of assets from the portfolio;",
      "c) responsibility for the drafting of the periodic report of the portfolio, comprising performance, value of the assets held and rationale for investment decisions.",
      "The Head of Portfolio Management and the Head of Asset Management may intervene as regards formatting, reporting standards and team management, pursuant to Art. 18, paragraph 4."
    ]
  },
  {
    "n": 20,
    "titleIt": "Analyst",
    "titleEn": "Analyst",
    "bodyIt": [
      "L'Analyst è socio dell'Associazione assegnato a una divisione e a un team specifici.",
      "Responsabilità:",
      "a) supportare il Team Leader o il Portfolio Manager nelle attività assegnate;",
      "b) svolgere analisi, ricerche e redazione di contenuti secondo le indicazioni ricevute;",
      "c) partecipare agli incontri di lavoro del proprio team;",
      "d) rispettare le scadenze stabilite dall'Head of Division;",
      "e) partecipare attivamente alle iniziative organizzate dall'Associazione nell'arco del semestre."
    ],
    "bodyEn": [
      "The Analyst is a member of the Association assigned to a specific division and team.",
      "Responsibilities:",
      "a) support the Team Leader or Portfolio Manager in the assigned activities;",
      "b) carry out analyses, research and content drafting according to the instructions received;",
      "c) participate in the work meetings of his or her team;",
      "d) respect the deadlines set by the Head of Division;",
      "e) actively participate in the initiatives organised by the Association during the semester."
    ]
  },
  {
    "n": 21,
    "titleIt": "Head of Media & Communication e Media Analyst",
    "titleEn": "Head of Media & Communication and Media Analyst",
    "bodyIt": [
      "La divisione ausiliaria Media & Communication è guidata dall'Head of Media & Communication.",
      "Natura del ruolo:",
      "a) l'Head of Media & Communication riporta direttamente al Presidente;",
      "b) è membro non votante del Consiglio Direttivo, ai sensi dell'Art. 14 comma 2;",
      "c) non può ricoprire le cariche di Presidente o di Head of Asset Management;",
      "d) sono prerequisiti per la carica: almeno un (1) semestre di attività partecipata nel team Media & Communication dell'Associazione.",
      "Responsabilità:",
      "a) produzione di contenuti testuali e visivi per i canali social dell'Associazione;",
      "b) produzione di locandine e materiali grafici per eventi con ospiti;",
      "c) gestione della comunicazione di apertura e chiusura delle application di ammissione;",
      "d) comunicazione e pubblicizzazione di eventi con ospiti e delle attività dell'Associazione;",
      "e) verifica della compliance del materiale comunicativo con le regole dell'Università Bocconi e del Comitato CASA, in particolare con il Regolamento Operativo CASA in vigore;",
      "f) responsabilità ultima su toni, stile e precisione della comunicazione;",
      "g) facoltà di avvalersi dei Media Analyst secondo quanto ritenuto opportuno.",
      "Vacanza del ruolo: in caso di assenza prolungata o di dimissioni dell'Head of Media & Communication, la sostituzione costituisce priorità assoluta per il Presidente.",
      "Media & Communication Analyst: il Media Analyst è socio della divisione Media & Communication, con la responsabilità di supportare e assistere l'Head nel raggiungimento degli obiettivi assegnati."
    ],
    "bodyEn": [
      "The auxiliary division Media & Communication is led by the Head of Media & Communication.",
      "Nature of the role:",
      "a) the Head of Media & Communication reports directly to the President;",
      "b) is a non-voting member of the Board of Directors, pursuant to Art. 14, paragraph 2;",
      "c) may not hold the offices of President or Head of Asset Management;",
      "d) the prerequisites for the office are: at least one (1) semester of participated activity in the Media & Communication team of the Association.",
      "Responsibilities:",
      "a) production of textual and visual content for the Association's social channels;",
      "b) production of posters and graphic materials for events with guests;",
      "c) management of the communication of opening and closing of admission applications;",
      "d) communication and publicising of events with guests and of the Association's activities;",
      "e) verification of the compliance of communication materials with the rules of Università Bocconi and of the CASA Committee, in particular with the CASA Operational Regulation in force;",
      "f) ultimate responsibility for tone, style and accuracy of communications;",
      "g) the power to make use of the Media Analysts as deemed appropriate.",
      "Vacancy of the role: in case of prolonged absence or resignation of the Head of Media & Communication, replacement constitutes an absolute priority for the President.",
      "Media & Communication Analyst: the Media Analyst is a member of the Media & Communication division, with the responsibility of supporting and assisting the Head in the achievement of the assigned objectives."
    ]
  },
  {
    "n": 22,
    "titleIt": "Head of Operations",
    "titleEn": "Head of Operations",
    "bodyIt": [
      "La divisione ausiliaria Operations è composta da una persona singola, l'Head of Operations, e non da un team.",
      "Natura del ruolo:",
      "a) l'Head of Operations riporta formalmente al Vicepresidente e al Presidente; nella prassi operativa il riferimento principale è il Vicepresidente;",
      "b) è membro non votante del Consiglio Direttivo, ai sensi dell'Art. 14 comma 2.",
      "Responsabilità:",
      "a) raccolta delle quote associative ogni semestre, ai sensi dell'Art. 7 comma 3;",
      "b) controllo dell'avvenuto rinnovo dell'iscrizione dell'Associazione all'Albo CASA al termine del secondo semestre accademico; il titolare del controllo è l'Head of Operations, il titolare del dovere di rinnovo è il Presidente, ai sensi dell'Art. 12 comma 3 lettera g);",
      "c) monitoraggio della presenza dei membri alle iniziative dell'Associazione;",
      "d) prenotazione delle aule per assemblee, riunioni e attività dell'Associazione;",
      "e) invio delle domande per eventi, company visits e altre iniziative tramite i canali istituzionali del Comitato CASA, ivi inclusa la piattaforma Concept Event e i canali assimilati;",
      "f) gestione delle comunicazioni con i canali istituzionali dell'Università Bocconi per la richiesta di spazi e l'organizzazione di iniziative;",
      "g) tenuta e custodia dei verbali del Consiglio Direttivo, ai sensi dell'Art. 14 comma 8;",
      "h) tenuta e aggiornamento dell'elenco dei soci, ai sensi dell'Art. 6 comma 4."
    ],
    "bodyEn": [
      "The auxiliary division Operations is composed of a single person, the Head of Operations, and not of a team.",
      "Nature of the role:",
      "a) the Head of Operations formally reports to the Vice-President and the President; in operational practice, the principal reference is the Vice-President;",
      "b) is a non-voting member of the Board of Directors, pursuant to Art. 14, paragraph 2.",
      "Responsibilities:",
      "a) collection of membership fees each semester, pursuant to Art. 7, paragraph 3;",
      "b) verification of the renewal of the Association's registration with the CASA Albo at the end of the second academic semester; the holder of the verification duty is the Head of Operations, the holder of the renewal duty is the President, pursuant to Art. 12, paragraph 3, letter g);",
      "c) monitoring of members' attendance at the Association's initiatives;",
      "d) booking of rooms for assemblies, meetings and Association activities;",
      "e) submission of applications for events, company visits and other initiatives through the institutional channels of the CASA Committee, including the Concept Event platform and equivalent channels;",
      "f) management of communications with the institutional channels of Università Bocconi for the request of spaces and the organisation of initiatives;",
      "g) keeping and custody of the minutes of the Board of Directors, pursuant to Art. 14, paragraph 8;",
      "h) keeping and updating of the list of members, pursuant to Art. 6, paragraph 4."
    ]
  },
  {
    "n": 23,
    "titleIt": "Partecipazione dei membri passati alle riunioni del Consiglio Direttivo",
    "titleEn": "Participation of past members in Board of Directors meetings",
    "bodyIt": [
      "Sono invitati a partecipare alle riunioni del Consiglio Direttivo, senza diritto di voto, i soci passati che cumulativamente:",
      "a) abbiano terminato gli studi presso l'Università Bocconi;",
      "b) abbiano ricoperto, durante il loro percorso, una carica nel Consiglio Direttivo dell'Associazione;",
      "c) abbiano concluso il loro percorso universitario nell'arco dei cinque (5) anni accademici precedenti la riunione.",
      "La partecipazione di cui al comma precedente è facoltativa.",
      "La partecipazione dei membri passati ha l'obiettivo di garantire continuità istituzionale all'Associazione e di facilitare la trasmissione di esperienza tra le generazioni di membri.",
      "I membri passati partecipanti non possono in alcun caso esercitare poteri propri del Consiglio Direttivo né delle altre cariche associative, e non concorrono al quorum costitutivo né alle maggioranze deliberative di cui all'Art. 14."
    ],
    "bodyEn": [
      "The following past members are invited to participate in the meetings of the Board of Directors, without voting rights, where they cumulatively:",
      "a) have completed their studies at Università Bocconi;",
      "b) have held, during their tenure, an office in the Board of Directors of the Association;",
      "c) have concluded their university career within the five (5) academic years preceding the meeting.",
      "The participation referred to in the preceding paragraph is optional.",
      "The participation of past members aims at ensuring institutional continuity of the Association and at facilitating the transmission of experience between generations of members.",
      "Past members participating may not in any way exercise powers proper to the Board of Directors or to the other associative offices, and shall not count towards the quorum or the deliberative majorities referred to in Art. 14."
    ]
  },
  {
    "n": 24,
    "titleIt": "Risorse economiche e tesoreria",
    "titleEn": "Economic resources and treasury",
    "bodyIt": [
      "Risorse economiche: le risorse economiche dell'Associazione sono costituite da:",
      "a) quote associative semestrali versate dai soci ai sensi dell'Art. 7;",
      "b) contributi volontari degli associati;",
      "c) eventuali finanziamenti dell'Università Bocconi erogati tramite il Comitato CASA, secondo le modalità e i criteri previsti dal Regolamento Operativo CASA in vigore;",
      "d) altre entrate compatibili con la normativa vigente e con il carattere non lucrativo dell'Associazione.",
      "Divieto di distribuzione di utili: l'Associazione ha il divieto assoluto di distribuire, anche in modo indiretto, utili e avanzi di gestione, nonché fondi, riserve o capitale durante la vita dell'ente, in favore di amministratori, soci, partecipanti, lavoratori o collaboratori, e in generale a terzi, a meno che la destinazione o la distribuzione non siano imposte per legge.",
      "Reinvestimento: l'Associazione ha l'obbligo di reinvestire gli eventuali utili e avanzi di gestione esclusivamente per lo sviluppo delle attività funzionali al perseguimento degli scopi istituzionali.",
      "Tesoreria:",
      "a) il Presidente è responsabile ultimo della tenuta della tesoreria dell'Associazione;",
      "b) il Presidente può delegare la gestione operativa della tesoreria all'Head of Operations, mantenendo la responsabilità ultima ai sensi della lettera a);",
      "c) le risorse economiche disponibili possono essere utilizzate per i rimborsi spese, documentati dai soci, accertati e approvati dal Consiglio Direttivo.",
      "Iniziative con aziende e istituzioni: ai sensi del Regolamento Generale CASA, le iniziative dell'Associazione che prevedano il coinvolgimento di aziende, istituzioni, fondazioni, enti pubblici o organizzazioni internazionali sono subordinate alla pre-verifica di fattibilità con la Direzione Market & Partners dell'Università Bocconi, e successivamente all'approvazione del Comitato CASA secondo le modalità del Regolamento Operativo in vigore."
    ],
    "bodyEn": [
      "Economic resources: the economic resources of the Association consist of:",
      "a) semestral membership fees paid by members pursuant to Art. 7;",
      "b) voluntary contributions of members;",
      "c) any financing from Università Bocconi disbursed through the CASA Committee, in accordance with the modalities and criteria set forth in the CASA Operational Regulation in force;",
      "d) other revenues compatible with the legislation in force and with the non-profit nature of the Association.",
      "Prohibition of distribution of profits: the Association is absolutely prohibited from distributing, even indirectly, profits and operating surpluses, as well as funds, reserves or capital during the life of the entity, in favour of administrators, members, participants, employees or collaborators, and generally to third parties, unless the destination or distribution is required by law.",
      "Reinvestment: the Association is obliged to reinvest any profits and operating surpluses exclusively for the development of activities functional to the pursuit of the institutional purposes.",
      "Treasury:",
      "a) the President is ultimately responsible for the keeping of the Association's treasury;",
      "b) the President may delegate the operational management of the treasury to the Head of Operations, retaining ultimate responsibility pursuant to letter a);",
      "c) the available economic resources may be used for expense reimbursements, documented by members and verified and approved by the Board of Directors.",
      "Initiatives with companies and institutions: pursuant to the CASA General Regulation, the initiatives of the Association involving companies, institutions, foundations, public bodies or international organisations are subject to prior feasibility verification with the Market & Partners Directorate of Università Bocconi, and subsequently to the approval of the CASA Committee in accordance with the modalities set forth in the Operational Regulation in force."
    ]
  },
  {
    "n": 25,
    "titleIt": "Rendiconto economico-finanziario",
    "titleEn": "Economic and financial statement",
    "bodyIt": [
      "L'anno associativo e finanziario dell'Associazione segue il calendario accademico dell'Università Bocconi.",
      "Non sussiste obbligo interno periodico di redazione del rendiconto economico-finanziario.",
      "Il rendiconto è predisposto dal Presidente su richiesta dell'Assemblea, entro il termine di sessanta (60) giorni dalla richiesta.",
      "In caso di obbligo di rendicontazione derivante dalla normativa universitaria o di legge, si applica la scadenza indicata dall'organo richiedente.",
      "Il rendiconto economico-finanziario, ove redatto, è approvato dall'Assemblea ai sensi dell'Art. 11 comma 10 lettera b)."
    ],
    "bodyEn": [
      "The associative and financial year of the Association follows the academic calendar of Università Bocconi.",
      "There is no internal periodic obligation to draw up the economic and financial statement.",
      "The statement is prepared by the President upon request of the Assembly, within a deadline of sixty (60) days from the request.",
      "In the event of a reporting obligation arising from university regulations or from the law, the deadline indicated by the requesting body shall apply.",
      "The economic and financial statement, where drawn up, is approved by the Assembly pursuant to Art. 11, paragraph 10, letter b)."
    ]
  },
  {
    "n": 26,
    "titleIt": "Rapporti con soggetti esterni",
    "titleEn": "Relations with external parties",
    "bodyIt": [
      "L'Associazione collabora con soggetti esterni, persone fisiche o giuridiche, al fine di trasmettere agli associati nuove competenze tecniche e professionali.",
      "Ogni rapporto con soggetto esterno ha come obiettivo principale lo sviluppo culturale, tecnico e professionale degli associati e come obiettivo secondario l'eventuale raccolta di risorse volte a finanziare le attività associative, nel rispetto dei limiti di cui all'Art. 24.",
      "Approvazione e firma:",
      "a) ogni collaborazione che si intende stipulare con soggetti esterni deve essere approvata dal Consiglio Direttivo a maggioranza dei membri votanti. Spetta in ogni caso al Presidente valutare la coerenza e l'opportunità della collaborazione rispetto alla missione, ai valori e alle finalità dell'Associazione, previa consultazione del presente Statuto, del Regolamento Generale CASA, del Regolamento Operativo CASA e di ogni ulteriore regolamento o normativa universitaria rilevante ai fini della specifica iniziativa;",
      "b) l'eventuale contratto di collaborazione ha valenza legale esclusivamente se firmato dal Presidente.",
      "Clausola di esonero dell'Università: tutti i contratti con soggetti terzi includono la clausola obbligatoria di cui all'Art. 3 comma 5.",
      "Iniziative con aziende, istituzioni e partner dell'Università: per le iniziative di cui all'Art. 24 comma 5 si applica la procedura di pre-verifica e approvazione ivi prevista. È in ogni caso preclusa l'organizzazione di iniziative con i soggetti elencati nell'allegato 1A del Regolamento Generale CASA.",
      "Partnership con altre associazioni studentesche e con network: le partnership con altre associazioni studentesche, network studenteschi o altre realtà sono soggette a preventiva richiesta al Comitato CASA secondo le modalità del Regolamento Operativo CASA in vigore. Sono in ogni caso vietate le partnership con aziende o istituzioni.",
      "Sponsorizzazioni: tutte le sponsorizzazioni devono essere dichiarate in fase di richiesta di finanziamento all'Università Bocconi e sono soggette a preventiva pre-verifica con la Direzione Market & Partners e ad approvazione del Comitato CASA secondo le modalità del Regolamento Operativo. Il materiale promozionale degli eventi non può riportare il logo dello sponsor; è ammessa esclusivamente la dicitura «in collaborazione con…» ove preventivamente concordata."
    ],
    "bodyEn": [
      "The Association collaborates with external parties, whether natural or legal persons, with a view to transmitting to its members new technical and professional competences.",
      "Every relationship with an external party has as its principal objective the cultural, technical and professional development of members and as its secondary objective the possible raising of resources to finance the Association's activities, within the limits set forth in Art. 24.",
      "Approval and signature:",
      "a) every collaboration which the Association intends to enter into with external parties shall be approved by the Board of Directors by majority of voting members. It is in any case for the President to assess the coherence and the appropriateness of the collaboration with respect to the mission, the values and the purposes of the Association, having consulted the present Statute, the CASA General Regulation, the CASA Operational Regulation and any further university regulation or rule relevant to the specific initiative;",
      "b) the relevant collaboration contract shall have legal validity only if signed by the President.",
      "University exoneration clause: all contracts with third parties shall include the mandatory clause set forth in Art. 3, paragraph 5.",
      "Initiatives with companies, institutions and University partners: the procedure of prior verification and approval set forth in Art. 24, paragraph 5, applies to initiatives referred to therein. The organisation of initiatives with the subjects listed in Annex 1A of the CASA General Regulation is in any case precluded.",
      "Partnerships with other student associations and networks: partnerships with other student associations, student networks or other entities are subject to prior request to the CASA Committee in accordance with the modalities set forth in the CASA Operational Regulation in force. Partnerships with companies or institutions are in any case prohibited.",
      "Sponsorships: all sponsorships shall be declared upon submission of financing requests to Università Bocconi and are subject to prior verification with the Market & Partners Directorate and to approval of the CASA Committee in accordance with the modalities of the Operational Regulation. The promotional material of events may not display the sponsor's logo; only the wording \"in collaboration with…\" is admitted, where previously agreed."
    ]
  },
  {
    "n": 27,
    "titleIt": "Scioglimento e devoluzione del patrimonio",
    "titleEn": "Dissolution and devolution of assets",
    "bodyIt": [
      "Lo scioglimento dell'Associazione è deliberato dall'Assemblea con il voto favorevole di almeno i quattro quinti (4/5) degli associati.",
      "In caso di scioglimento, per qualunque causa, l'Associazione ha l'obbligo di devolvere il patrimonio dell'ente ad altro ente non commerciale che svolga un'analoga attività istituzionale, salvo diversa destinazione imposta dalla legge a finalità analoghe o ai fini di pubblica utilità, sentito l'organismo di controllo di cui all'articolo 3, comma 190, della Legge 23 dicembre 1996, n. 662, e salvo diversa destinazione imposta dalla legge."
    ],
    "bodyEn": [
      "The dissolution of the Association is resolved by the Assembly with the favourable vote of at least four fifths (4/5) of the members.",
      "In the event of dissolution, for whatever cause, the Association has the obligation to devolve the entity's assets to another non-commercial entity carrying out a similar institutional activity, save for different destination required by law for similar purposes or for public utility purposes, having heard the supervisory body referred to in Article 3, paragraph 190, of Law no. 662 of 23 December 1996, and save for different destination required by law."
    ]
  },
  {
    "n": 28,
    "titleIt": "Disposizioni finali",
    "titleEn": "Final provisions",
    "bodyIt": [
      "Per tutto quanto non espressamente previsto dal presente Statuto, si applicano le disposizioni del Codice Civile, in particolare gli articoli 36, 37 e 38, e le altre norme di legge vigenti in materia di associazioni non riconosciute.",
      "L'Associazione e i suoi soci si impegnano a non adottare comportamenti potenzialmente umilianti (hazing) verso i propri membri o verso terzi, e a contrastare ogni comportamento, condotto in campus o fuori dal campus, che possa danneggiare la salute fisica o mentale di uno studente o di qualunque altra persona, ledere la sua dignità o porla in una situazione di forte stress, ai sensi dell'Art. 4 comma 3.",
      "Modifiche dello Statuto: qualsiasi modifica al presente Statuto è deliberata dall'Assemblea ai sensi dell'Art. 11 comma 10 lettera c) e diviene efficace a seguito dell'approvazione dell'Assemblea. Le modifiche statutarie sono prontamente comunicate agli uffici competenti dell'Università Bocconi.",
      "Definizione dell'Associazione: l'Associazione si definisce, in tutti i materiali, come «Associazione promossa e gestita da studenti dell'Università Bocconi», ai sensi dell'Art. 1 comma 4.",
      "Non rappresentanza dei punti di vista dell'Ateneo: l'Associazione non intende, in alcun materiale, comunicazione o iniziativa, rappresentare i punti di vista o le opinioni dell'Università Bocconi, ai sensi dell'Art. 2 comma 6.",
      "Versione vincolante: il presente Statuto è originariamente redatto e approvato in lingua italiana, ed è tradotto in lingua inglese per facilità di consultazione. La versione italiana è da considerarsi definitiva e giuridicamente vincolante per ogni controversia o questione interpretativa.",
      "Entrata in vigore: il presente Statuto entra in vigore alla data della sua approvazione da parte dell'Assemblea dei soci."
    ],
    "bodyEn": [
      "For all matters not expressly provided for in the present Statute, the provisions of the Italian Civil Code shall apply, in particular Articles 36, 37 and 38, and the other laws in force concerning non-recognised associations.",
      "The Association and its members undertake not to engage in potentially humiliating conduct (hazing) towards their members or third parties, and to oppose any conduct, on or off campus, capable of harming the physical or mental health of a student or any other person, of injuring his or her dignity, or of placing him or her in a situation of severe stress, pursuant to Art. 4, paragraph 3.",
      "Amendments to the Statute: any amendment to the present Statute is resolved by the Assembly pursuant to Art. 11, paragraph 10, letter c), and becomes effective upon the approval of the Assembly. Statutory amendments are promptly communicated to the competent offices of Università Bocconi.",
      "Definition of the Association: the Association shall identify itself, in all materials, as \"Association promoted and managed by students of Università Bocconi\", pursuant to Art. 1, paragraph 4.",
      "Non-representation of the University's views: the Association shall not, in any material, communication or initiative, purport to represent the views or opinions of Università Bocconi, pursuant to Art. 2, paragraph 6.",
      "Binding version: the present Statute is originally drafted and approved in the Italian language and is translated into English for ease of reference. The Italian version shall be considered definitive and legally binding for any dispute or interpretative matter.",
      "Entry into force: the present Statute enters into force on the date of its approval by the Assembly of members."
    ]
  }
];
