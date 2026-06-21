import type { RawDividend } from '../../types'

export interface BrokerParser {
  id: string
  label: string
  detect(text: string): boolean
  parse(text: string): RawDividend[]
}
