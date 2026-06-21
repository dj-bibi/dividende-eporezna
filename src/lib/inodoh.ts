// Takes an INO-DOH XML that the user generated and downloaded from ePorezna
// (their OIB, nadležna ispostava, and tax year already in <Zaglavlje>) and
// injects one <Stavka> per dividend into <Stavke>. Because the header is
// produced by ePorezna itself, all of its codes are already valid - we only
// ever write the per-dividend rows.
//
// NOTE: the per-row <Stavka> field names/order and a couple of codes below are
// carried over from the original tool and still need verifying against the
// official Šifarnik INO-DOH and one real filled export. They are marked VERIFY.

import type { Dividend } from '../types'

const ROOT_TAG = 'ObrazacINODOH'

// Recipient residency: Croatia (bare 3-digit country šifra).
const RESIDENCY_CODE = '191'

// Codes that depend on the Šifarnik INO-DOH.
const CODES = {
  opisPrimitka: '1001', // VERIFY
  vrstaPrimitka: '1001', // VERIFY
  vrstaPremaUIDO: '10', // dividends = Art. 10
  vrstaPremaOECD: '10', // OECD model art. 10
  metodaIzbjegavanja: 'U', // U = uračunavanje (credit)
}

// ISIN country prefix -> Porezna "Oznaka države izvora" (99 + 3 digit "šifra").
const COUNTRY_CODES: Record<string, string> = {
  US: '99840',
  DE: '99276',
  IE: '99372',
  GB: '99826',
  NL: '99528',
  CH: '99756',
  FR: '99250',
  IT: '99380',
  ES: '99724',
  AT: '99040',
  BE: '99056',
  DK: '99208',
  FI: '99246',
  SE: '99752',
  NO: '99578',
  LU: '99442',
  PT: '99620',
  PL: '99616',
  CA: '99124',
  JP: '99392',
  AU: '99036',
}

export interface InoDohOptions {
  hasCertificate?: boolean
  willProvideBy3011?: boolean
}

export interface InoDohResult {
  xml: string
  count: number
  year: number | null
}

interface Filer {
  oib: string
  ime: string
  prezime: string
}

/** Read an uploaded ePorezna INO-DOH file and inject the dividend rows. */
export async function injectDividendsFromFile(
  file: File,
  dividends: Dividend[],
  options: InoDohOptions = {}
): Promise<InoDohResult> {
  const xmlText = await file.text()
  return injectDividends(xmlText, dividends, options)
}

/** Inject dividend rows into an ePorezna-generated INO-DOH XML string. */
export function injectDividends(
  headerXml: string,
  dividends: Dividend[],
  options: InoDohOptions = {}
): InoDohResult {
  const { hasCertificate = true, willProvideBy3011 = false } = options

  const doc = new DOMParser().parseFromString(headerXml, 'application/xml')
  if (doc.getElementsByTagName('parsererror').length) {
    throw new Error('That file is not valid XML. Upload the INO-DOH you downloaded from ePorezna.')
  }

  const root = doc.documentElement
  if (!root || root.localName !== ROOT_TAG) {
    throw new Error('This does not look like an INO-DOH file (missing <ObrazacINODOH> root).')
  }
  const ns = root.namespaceURI

  const stavke = doc.getElementsByTagNameNS(ns, 'Stavke')[0]
  if (!stavke) {
    throw new Error('Could not find <Stavke> in the file. Is this a complete INO-DOH export?')
  }

  // Filer identity comes from the header ePorezna already filled in.
  const filer: Filer = {
    oib: textOf(doc, ns, 'OIB'),
    ime: textOf(doc, ns, 'Ime'),
    prezime: textOf(doc, ns, 'Prezime'),
  }
  if (!filer.oib) {
    throw new Error('Could not read your OIB from the file. Fill in the header in ePorezna first.')
  }

  // If the header states a tax year, only inject that year's dividends.
  const datumOd = textOf(doc, ns, 'DatumOd')
  const year = /^\d{4}/.test(datumOd) ? Number(datumOd.slice(0, 4)) : null
  const rows = year ? dividends.filter((d) => d.date.getFullYear() === year) : dividends
  if (!rows.length) {
    throw new Error(
      year
        ? `No dividends found for ${year} (the tax year in the uploaded form).`
        : 'No dividends to add.'
    )
  }

  // Replace any existing rows so the result is exactly these dividends.
  while (stavke.firstChild) stavke.removeChild(stavke.firstChild)

  rows.forEach((d, i) => {
    stavke.appendChild(buildStavka(doc, ns, d, i + 1, filer, { hasCertificate, willProvideBy3011 }))
  })

  const xml = '<?xml version="1.0" encoding="UTF-8"?>' + new XMLSerializer().serializeToString(doc)
  return { xml, count: rows.length, year }
}

/** Trigger a browser download of the produced XML. */
export function downloadXml(xml: string, filename = 'ObrazacINODOH.xml'): void {
  const blob = new Blob([xml], { type: 'application/xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Row builder: element order follows the schema sequence - do not reorder.
function buildStavka(
  doc: Document,
  ns: string | null,
  d: Dividend,
  redniBroj: number,
  filer: Filer,
  flags: Required<InoDohOptions>
): Element {
  const gross = round2(d.total + d.withholding)
  const foreignTax = round2(d.withholding)
  const country = countryCodeFor(d.isin)

  const stavka = doc.createElementNS(ns, 'Stavka')
  const add = (tag: string, value: string) => stavka.appendChild(el(doc, ns, tag, value))

  add('RedniBroj', String(redniBroj))
  add('ImePrezimePrimateljaPrimitka', `${filer.ime} ${filer.prezime}`.trim())
  add('OibPrimateljaPrimitka', filer.oib)
  add('OznakaDrzaveRezidentnostiPrimateljaPrimitka', RESIDENCY_CODE)
  add('PorezniBrojPrimateljaPrimitka', '')
  for (let i = 1; i <= 9; i++) add(`BrojBankovnogRacunaPrimateljaPrimitka${i}`, '')
  add('Drzava', country)
  add('OznakaDrzaveIzvoraMedjunarodneOrganizacije', country)
  add('OpisPrimitka', CODES.opisPrimitka)
  add('OznakaVrstePrimitka', CODES.vrstaPrimitka)
  add('VrstaPrimitkaPremaUIDO', CODES.vrstaPremaUIDO)
  add('VrstaPrimitkaPremaOECD', CODES.vrstaPremaOECD)
  add('Primitak', amount(gross))
  add('Izdatak', amount(0)) // dividends: no deductible expenses
  add('Dohodak', amount(gross)) // Primitak − Izdatak
  add('UplaceniPorezIPrirezUTuzemstvu', amount(0))
  add('UplaceniPorezIPrirezUInozemstvu', amount(foreignTax))
  add('PorezniObveznikRaspolazeSPotvrdomOPlacenomPorezu', flags.hasCertificate ? '1' : '0')
  add('PorezniObveznikCePotvrduOPlacenomPorezuDostavitiDo3011', flags.willProvideBy3011 ? '1' : '')
  add('MetodaIzbjegavanjaDvostrukogOporezivanja', CODES.metodaIzbjegavanja)
  // ePorezna recomputes these on "Puna provjera"; emitted as 0.00.
  add('IznosPorezaKojiSeMozeUracunati', amount(0))
  add('UkupnoZaPovratUplatu', amount(0))

  return stavka
}

function el(doc: Document, ns: string | null, tag: string, value: string): Element {
  const e = doc.createElementNS(ns, tag)
  if (value !== '') e.textContent = value
  return e
}

function textOf(doc: Document, ns: string | null, name: string): string {
  const e = doc.getElementsByTagNameNS(ns, name)[0]
  return e ? (e.textContent ?? '').trim() : ''
}

function countryCodeFor(isin: string): string {
  const prefix = (isin || '').slice(0, 2).toUpperCase()
  const code = COUNTRY_CODES[prefix]
  if (!code) {
    throw new Error(
      `No Porezna country code mapped for ISIN prefix "${prefix}". Add it to COUNTRY_CODES in lib/inodoh.ts.`
    )
  }
  return code
}

function amount(n: number): string {
  return round2(n).toFixed(2)
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
