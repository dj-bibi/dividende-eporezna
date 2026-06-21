import type { RawDividend } from '../../types'
import type { BrokerParser } from './types'
import { trading212 } from './trading212.ts'
import { ibkr } from './ibkr.ts'

const PARSERS: BrokerParser[] = [trading212, ibkr]

export async function parseStatement(file: File): Promise<RawDividend[]> {
  const text = await file.text()
  const parser = PARSERS.find((p) => p.detect(text))
  if (!parser) {
    throw new Error("Couldn't recognize this as a Trading 212 or Interactive Brokers export.")
  }
  return parser.parse(text)
}
