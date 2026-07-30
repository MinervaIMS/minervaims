// =====================================================================
// city-format — one canonical way to write a city: "City, Country".
// ---------------------------------------------------------------------
// Alumni records were typed by many hands over many semesters, so the
// same place arrived as "Milan", "Milano", "milan" or "Milan, Italy" and
// the public city filter listed each spelling as a separate option. This
// module normalises a free-typed city on the way in AND on the way out,
// so historic rows read correctly without anyone editing them:
//
//   normaliseCity('milan')          -> 'Milan, Italy'
//   normaliseCity('New York')       -> 'New York, United States'
//   normaliseCity('Milan, Italy')   -> 'Milan, Italy'   (already complete)
//   normaliseCity('Springfield')    -> 'Springfield'    (unknown: untouched)
//
// A city whose country cannot be resolved is returned tidied but
// otherwise unchanged: guessing is worse than leaving it alone.
// =====================================================================

/**
 * Cities where MIMS members and alumni actually work and study, plus the
 * major financial centres they move to. Keys are lower-case, accent-free
 * and cover the common local spellings and abbreviations.
 */
const CITY_COUNTRY: Record<string, { city: string; country: string }> = {
  // Italy
  milan: { city: 'Milan', country: 'Italy' },
  milano: { city: 'Milan', country: 'Italy' },
  rome: { city: 'Rome', country: 'Italy' },
  roma: { city: 'Rome', country: 'Italy' },
  turin: { city: 'Turin', country: 'Italy' },
  torino: { city: 'Turin', country: 'Italy' },
  bologna: { city: 'Bologna', country: 'Italy' },
  florence: { city: 'Florence', country: 'Italy' },
  firenze: { city: 'Florence', country: 'Italy' },
  naples: { city: 'Naples', country: 'Italy' },
  napoli: { city: 'Naples', country: 'Italy' },
  genoa: { city: 'Genoa', country: 'Italy' },
  genova: { city: 'Genoa', country: 'Italy' },
  venice: { city: 'Venice', country: 'Italy' },
  venezia: { city: 'Venice', country: 'Italy' },
  verona: { city: 'Verona', country: 'Italy' },
  padua: { city: 'Padua', country: 'Italy' },
  padova: { city: 'Padua', country: 'Italy' },
  brescia: { city: 'Brescia', country: 'Italy' },
  bergamo: { city: 'Bergamo', country: 'Italy' },
  bari: { city: 'Bari', country: 'Italy' },
  palermo: { city: 'Palermo', country: 'Italy' },
  catania: { city: 'Catania', country: 'Italy' },
  trieste: { city: 'Trieste', country: 'Italy' },
  parma: { city: 'Parma', country: 'Italy' },
  modena: { city: 'Modena', country: 'Italy' },
  treviso: { city: 'Treviso', country: 'Italy' },
  vicenza: { city: 'Vicenza', country: 'Italy' },
  ancona: { city: 'Ancona', country: 'Italy' },
  pisa: { city: 'Pisa', country: 'Italy' },
  perugia: { city: 'Perugia', country: 'Italy' },
  cagliari: { city: 'Cagliari', country: 'Italy' },
  // United Kingdom
  london: { city: 'London', country: 'United Kingdom' },
  edinburgh: { city: 'Edinburgh', country: 'United Kingdom' },
  manchester: { city: 'Manchester', country: 'United Kingdom' },
  cambridge: { city: 'Cambridge', country: 'United Kingdom' },
  oxford: { city: 'Oxford', country: 'United Kingdom' },
  glasgow: { city: 'Glasgow', country: 'United Kingdom' },
  birmingham: { city: 'Birmingham', country: 'United Kingdom' },
  bristol: { city: 'Bristol', country: 'United Kingdom' },
  leeds: { city: 'Leeds', country: 'United Kingdom' },
  // United States
  'new york': { city: 'New York', country: 'United States' },
  nyc: { city: 'New York', country: 'United States' },
  'new york city': { city: 'New York', country: 'United States' },
  boston: { city: 'Boston', country: 'United States' },
  chicago: { city: 'Chicago', country: 'United States' },
  'san francisco': { city: 'San Francisco', country: 'United States' },
  'los angeles': { city: 'Los Angeles', country: 'United States' },
  houston: { city: 'Houston', country: 'United States' },
  miami: { city: 'Miami', country: 'United States' },
  seattle: { city: 'Seattle', country: 'United States' },
  atlanta: { city: 'Atlanta', country: 'United States' },
  philadelphia: { city: 'Philadelphia', country: 'United States' },
  dallas: { city: 'Dallas', country: 'United States' },
  austin: { city: 'Austin', country: 'United States' },
  denver: { city: 'Denver', country: 'United States' },
  washington: { city: 'Washington', country: 'United States' },
  'washington dc': { city: 'Washington', country: 'United States' },
  'new jersey': { city: 'New Jersey', country: 'United States' },
  princeton: { city: 'Princeton', country: 'United States' },
  stanford: { city: 'Stanford', country: 'United States' },
  berkeley: { city: 'Berkeley', country: 'United States' },
  'palo alto': { city: 'Palo Alto', country: 'United States' },
  charlotte: { city: 'Charlotte', country: 'United States' },
  // Switzerland
  zurich: { city: 'Zurich', country: 'Switzerland' },
  zuerich: { city: 'Zurich', country: 'Switzerland' },
  geneva: { city: 'Geneva', country: 'Switzerland' },
  geneve: { city: 'Geneva', country: 'Switzerland' },
  lugano: { city: 'Lugano', country: 'Switzerland' },
  basel: { city: 'Basel', country: 'Switzerland' },
  lausanne: { city: 'Lausanne', country: 'Switzerland' },
  bern: { city: 'Bern', country: 'Switzerland' },
  // Germany
  frankfurt: { city: 'Frankfurt', country: 'Germany' },
  'frankfurt am main': { city: 'Frankfurt', country: 'Germany' },
  munich: { city: 'Munich', country: 'Germany' },
  muenchen: { city: 'Munich', country: 'Germany' },
  berlin: { city: 'Berlin', country: 'Germany' },
  hamburg: { city: 'Hamburg', country: 'Germany' },
  cologne: { city: 'Cologne', country: 'Germany' },
  dusseldorf: { city: 'Dusseldorf', country: 'Germany' },
  stuttgart: { city: 'Stuttgart', country: 'Germany' },
  mannheim: { city: 'Mannheim', country: 'Germany' },
  // France
  paris: { city: 'Paris', country: 'France' },
  lyon: { city: 'Lyon', country: 'France' },
  marseille: { city: 'Marseille', country: 'France' },
  toulouse: { city: 'Toulouse', country: 'France' },
  nice: { city: 'Nice', country: 'France' },
  bordeaux: { city: 'Bordeaux', country: 'France' },
  // Rest of Europe
  madrid: { city: 'Madrid', country: 'Spain' },
  barcelona: { city: 'Barcelona', country: 'Spain' },
  lisbon: { city: 'Lisbon', country: 'Portugal' },
  lisboa: { city: 'Lisbon', country: 'Portugal' },
  porto: { city: 'Porto', country: 'Portugal' },
  amsterdam: { city: 'Amsterdam', country: 'Netherlands' },
  rotterdam: { city: 'Rotterdam', country: 'Netherlands' },
  'the hague': { city: 'The Hague', country: 'Netherlands' },
  utrecht: { city: 'Utrecht', country: 'Netherlands' },
  brussels: { city: 'Brussels', country: 'Belgium' },
  bruxelles: { city: 'Brussels', country: 'Belgium' },
  antwerp: { city: 'Antwerp', country: 'Belgium' },
  luxembourg: { city: 'Luxembourg', country: 'Luxembourg' },
  dublin: { city: 'Dublin', country: 'Ireland' },
  vienna: { city: 'Vienna', country: 'Austria' },
  wien: { city: 'Vienna', country: 'Austria' },
  copenhagen: { city: 'Copenhagen', country: 'Denmark' },
  stockholm: { city: 'Stockholm', country: 'Sweden' },
  oslo: { city: 'Oslo', country: 'Norway' },
  helsinki: { city: 'Helsinki', country: 'Finland' },
  warsaw: { city: 'Warsaw', country: 'Poland' },
  warszawa: { city: 'Warsaw', country: 'Poland' },
  krakow: { city: 'Krakow', country: 'Poland' },
  prague: { city: 'Prague', country: 'Czech Republic' },
  praha: { city: 'Prague', country: 'Czech Republic' },
  budapest: { city: 'Budapest', country: 'Hungary' },
  bucharest: { city: 'Bucharest', country: 'Romania' },
  athens: { city: 'Athens', country: 'Greece' },
  istanbul: { city: 'Istanbul', country: 'Turkey' },
  ankara: { city: 'Ankara', country: 'Turkey' },
  moscow: { city: 'Moscow', country: 'Russia' },
  kyiv: { city: 'Kyiv', country: 'Ukraine' },
  kiev: { city: 'Kyiv', country: 'Ukraine' },
  sofia: { city: 'Sofia', country: 'Bulgaria' },
  belgrade: { city: 'Belgrade', country: 'Serbia' },
  zagreb: { city: 'Zagreb', country: 'Croatia' },
  ljubljana: { city: 'Ljubljana', country: 'Slovenia' },
  valletta: { city: 'Valletta', country: 'Malta' },
  monaco: { city: 'Monaco', country: 'Monaco' },
  // Middle East, Asia, Oceania, Americas
  dubai: { city: 'Dubai', country: 'United Arab Emirates' },
  'abu dhabi': { city: 'Abu Dhabi', country: 'United Arab Emirates' },
  doha: { city: 'Doha', country: 'Qatar' },
  riyadh: { city: 'Riyadh', country: 'Saudi Arabia' },
  'tel aviv': { city: 'Tel Aviv', country: 'Israel' },
  singapore: { city: 'Singapore', country: 'Singapore' },
  'hong kong': { city: 'Hong Kong', country: 'Hong Kong' },
  tokyo: { city: 'Tokyo', country: 'Japan' },
  shanghai: { city: 'Shanghai', country: 'China' },
  beijing: { city: 'Beijing', country: 'China' },
  shenzhen: { city: 'Shenzhen', country: 'China' },
  seoul: { city: 'Seoul', country: 'South Korea' },
  mumbai: { city: 'Mumbai', country: 'India' },
  delhi: { city: 'Delhi', country: 'India' },
  bangalore: { city: 'Bangalore', country: 'India' },
  sydney: { city: 'Sydney', country: 'Australia' },
  melbourne: { city: 'Melbourne', country: 'Australia' },
  toronto: { city: 'Toronto', country: 'Canada' },
  montreal: { city: 'Montreal', country: 'Canada' },
  vancouver: { city: 'Vancouver', country: 'Canada' },
  'sao paulo': { city: 'Sao Paulo', country: 'Brazil' },
  'rio de janeiro': { city: 'Rio de Janeiro', country: 'Brazil' },
  'mexico city': { city: 'Mexico City', country: 'Mexico' },
  'buenos aires': { city: 'Buenos Aires', country: 'Argentina' },
  santiago: { city: 'Santiago', country: 'Chile' },
  bogota: { city: 'Bogota', country: 'Colombia' },
  lima: { city: 'Lima', country: 'Peru' },
  johannesburg: { city: 'Johannesburg', country: 'South Africa' },
  'cape town': { city: 'Cape Town', country: 'South Africa' },
  cairo: { city: 'Cairo', country: 'Egypt' },
  lagos: { city: 'Lagos', country: 'Nigeria' },
  nairobi: { city: 'Nairobi', country: 'Kenya' },
};

/** Countries recognised as the second half of an already-complete entry. */
const KNOWN_COUNTRIES = new Set(
  Object.values(CITY_COUNTRY).map((v) => v.country.toLowerCase()),
);

/** Lower-case, accent-free, single-spaced — the lookup key. */
function key(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Title Case, preserving small connecting words inside a name. */
function titleCase(value: string): string {
  const small = new Set(['de', 'da', 'di', 'del', 'della', 'van', 'von', 'the', 'of', 'am']);
  return value
    .split(' ')
    .filter(Boolean)
    .map((word, i) => {
      const lower = word.toLowerCase();
      if (i > 0 && small.has(lower)) return lower;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

/**
 * Canonical "City, Country" for a free-typed value.
 * Unknown cities are tidied (trimmed, Title Case) and returned as-is.
 */
export function normaliseCity(input: string | null | undefined): string {
  const raw = (input ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';

  // Already "Something, Something": keep it, but normalise the known half.
  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const cityPart = parts[0];
    const countryPart = parts.slice(1).join(', ');
    const hit = CITY_COUNTRY[key(cityPart)];
    if (hit && KNOWN_COUNTRIES.has(key(countryPart))) return `${hit.city}, ${hit.country}`;
    return `${titleCase(cityPart)}, ${titleCase(countryPart)}`;
  }

  const hit = CITY_COUNTRY[key(raw)];
  if (hit) return `${hit.city}, ${hit.country}`;
  return titleCase(raw);
}

/** Does this value already resolve to a known "City, Country"? */
export function isKnownCity(input: string | null | undefined): boolean {
  const raw = (input ?? '').split(',')[0].trim();
  return !!raw && !!CITY_COUNTRY[key(raw)];
}

/** Suggestions for a partially typed city, as canonical "City, Country". */
export function citySuggestions(input: string | null | undefined, limit = 6): string[] {
  const q = key(input ?? '');
  if (q.length < 2) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const [k, v] of Object.entries(CITY_COUNTRY)) {
    if (!k.startsWith(q)) continue;
    const label = `${v.city}, ${v.country}`;
    if (seen.has(label)) continue;
    seen.add(label);
    out.push(label);
    if (out.length >= limit) break;
  }
  if (out.length < limit) {
    for (const [k, v] of Object.entries(CITY_COUNTRY)) {
      if (k.startsWith(q) || !k.includes(q)) continue;
      const label = `${v.city}, ${v.country}`;
      if (seen.has(label)) continue;
      seen.add(label);
      out.push(label);
      if (out.length >= limit) break;
    }
  }
  return out;
}

/** All canonical city labels, for pickers and filters. */
export function allCityLabels(): string[] {
  return Array.from(new Set(Object.values(CITY_COUNTRY).map((v) => `${v.city}, ${v.country}`))).sort();
}
