import type { BrokerParser } from './types'
import type { RawDividend } from '../../types'
import { assert, cleanCurrency, parseAmount, parseDate, readRecords } from './shared'

const COLUMNS = {
  action: 'Action',
  time: 'Time',
  isin: 'ISIN',
  withholding: 'Withholding tax',
  total: 'Total',
  totalCurrency: 'Currency (Total)',
} as const

type Row = Record<string, string>
const REQUIRED = [COLUMNS.action, COLUMNS.time, COLUMNS.isin, COLUMNS.total]

export const trading212: BrokerParser = {
  id: 'trading212',
  label: 'Trading 212',

  detect(text) {
    const header = text.slice(0, text.indexOf('\n'))
    return REQUIRED.every((c) => header.includes(c))
  },

  parse(text) {
    const { records, fields } = readRecords(text)
    const missing = REQUIRED.filter((c) => !fields.includes(c))
    assert(missing.length === 0, `Trading 212 export is missing column(s): ${missing.join(', ')}.`)

    return records.filter(isDividendRow).map(
      (r): RawDividend => ({
        date: parseDate(r[COLUMNS.time]),
        isin: (r[COLUMNS.isin] ?? '').trim(),
        currency: cleanCurrency(r[COLUMNS.totalCurrency]) || 'EUR',
        net: parseAmount(r[COLUMNS.total]),
        withholding: parseAmount(r[COLUMNS.withholding]),
      })
    )
  },
}

function isDividendRow(row: Row): boolean {
  return (row[COLUMNS.action] ?? '').trim().toLowerCase().startsWith('dividend')
}
