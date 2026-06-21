import Papa from 'papaparse'

export function parseAmount(value: string | undefined): number {
  if (!value) return 0
  const n = parseFloat(value.replace(/[",\s]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function parseDate(value: string | undefined): Date {
  if (!value) return new Date(NaN)
  // Handles "2026-02-13 12:00:00" (T212) and "2026-02-13" (IBKR).
  return new Date(value.trim().replace(' ', 'T'))
}

export function cleanCurrency(value: string | undefined): string {
  return (value ?? '').trim().toUpperCase().replace(/^"|"$/g, '')
}

/** Pull an ISIN out of free text, e.g. IBKR's "AAPL(US0378331005) Cash Dividend…". */
const ISIN_RE = /\b([A-Z]{2}[A-Z0-9]{9}\d)\b/
export function extractIsin(text: string | undefined): string {
  return text ? (text.match(ISIN_RE)?.[1] ?? '') : ''
}

function stripBom(text: string): string {
  return text.replace(/^\uFEFF/, '')
}

export function readRecords(text: string): {
  records: Record<string, string>[]
  fields: string[]
} {
  const result = Papa.parse<Record<string, string>>(stripBom(text), {
    header: true,
    skipEmptyLines: true,
  })
  return { records: result.data, fields: result.meta.fields ?? [] }
}

export function readRows(text: string): string[][] {
  return Papa.parse<string[]>(stripBom(text), { skipEmptyLines: true }).data
}

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
