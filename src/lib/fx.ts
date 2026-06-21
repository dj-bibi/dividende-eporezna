import type { Dividend, RawDividend } from '../types'

const HNB = '/hnb/tecajn-eur/v3'

interface HnbRow {
  datum_primjene: string
  valuta: string
  srednji_tecaj: string
}

/** Convert native-currency dividends to EUR using HNB middle rates. */
export async function toEur(raws: RawDividend[]): Promise<Dividend[]> {
  const cache = new Map<string, Promise<number>>()

  const rateFor = (currency: string, date: string): Promise<number> => {
    if (currency === '' || currency === 'EUR') return Promise.resolve(1)
    const key = `${currency}|${date}`
    let pending = cache.get(key)
    if (!pending) {
      pending = middleRate(currency, date)
      cache.set(key, pending)
    }
    return pending
  }

  return Promise.all(
    raws.map(async (r): Promise<Dividend> => {
      const date = isoDate(r.date)
      const rate = await rateFor(r.currency, date)
      return {
        date: r.date,
        isin: r.isin,
        total: round2(r.net / rate),
        withholding: round2(r.withholding / rate),
      }
    })
  )
}

/** HNB middle rate (foreign units per 1 EUR) applicable on `date`. */
async function middleRate(currency: string, date: string): Promise<number> {
  // Query a short window ending at `date`, so weekends/holidays fall back to
  // the last published list (HNB publishes only on working days).
  const from = shiftDays(date, -7)

  // 1. Determine base target URL structure depending on the environment
  let url = import.meta.env.DEV
    ? `${HNB}?valuta=${currency}&datum-primjene-od=${from}&datum-primjene-do=${date}`
    : `https://api.hnb.hr/tecajn-eur/v3?valuta=${currency}&datum-primjene-od=${from}&datum-primjene-do=${date}`

  // 2. Wrap the final endpoint with the public CORS proxy in production
  if (!import.meta.env.DEV) {
    url = `https://corsproxy.io/?url=${encodeURIComponent(url)}`
  }

  let res: Response
  try {
    res = await fetch(url)
  } catch {
    throw new Error('Could not reach the HNB exchange-rate service. Check your connection.')
  }
  if (!res.ok) throw new Error(`HNB rate lookup failed (HTTP ${res.status}).`)

  const rows = (await res.json()) as HnbRow[]
  if (!rows.length) {
    throw new Error(`No HNB rate found for ${currency} around ${date}.`)
  }

  // Latest list on or before the date.
  const latest = rows.reduce((a, b) => (a.datum_primjene >= b.datum_primjene ? a : b))
  return parseHrNumber(latest.srednji_tecaj)
}

/** Parse HNB's comma-decimal string, e.g. "1,146700" -> 1.1467. */
function parseHrNumber(value: string): number {
  const n = parseFloat(value.replace(/\./g, '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) throw new Error(`Unexpected HNB rate value "${value}".`)
  return n
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function shiftDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}
