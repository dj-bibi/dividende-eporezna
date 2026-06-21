import type { BrokerParser } from './types'
import type { RawDividend } from '../../types'
import { assert, cleanCurrency, extractIsin, parseAmount, parseDate, readRows } from './shared'

const SECTION = 0
const KIND = 1
const CURRENCY = 2
const DATE = 3
const DESCRIPTION = 4
const AMOUNT = 5

export const ibkr: BrokerParser = {
  id: 'ibkr',
  label: 'Interactive Brokers',

  detect(text) {
    return /(^|\n)\uFEFF?(Dividends|Withholding Tax),Data,/.test(text)
  },

  parse(text) {
    const rows = readRows(text)
    const divLines = sectionRows(rows, 'Dividends')
    const taxLines = sectionRows(rows, 'Withholding Tax')
    assert(divLines.length > 0, 'No Dividends section found in this Interactive Brokers statement.')

    const taxByKey = new Map<string, number>()
    for (const t of taxLines) {
      const key = dividendKey(t)
      taxByKey.set(key, (taxByKey.get(key) ?? 0) + Math.abs(parseAmount(t[AMOUNT])))
    }

    return divLines.map((d): RawDividend => {
      const gross = parseAmount(d[AMOUNT]) // IBKR lists the gross dividend
      const withholding = taxByKey.get(dividendKey(d)) ?? 0
      return {
        date: parseDate(d[DATE]),
        isin: extractIsin(d[DESCRIPTION]),
        currency: cleanCurrency(d[CURRENCY]),
        net: gross - withholding,
        withholding,
      }
    })
  },
}

function sectionRows(rows: string[][], section: string): string[][] {
  return rows.filter((r) => r[SECTION] === section && r[KIND] === 'Data')
}

function dividendKey(row: string[]): string {
  return `${row[DATE]}|${extractIsin(row[DESCRIPTION])}`
}
