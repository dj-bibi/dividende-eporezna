/** A dividend in its native currency, straight from the broker file. */
export interface RawDividend {
  date: Date
  isin: string
  /** ISO currency of the native amounts, e.g. 'USD'. 'EUR' needs no conversion. */
  currency: string
  /** Net amount received, in the native currency. */
  net: number
  /** Foreign tax withheld at source, in the native currency. */
  withholding: number
}

/** A dividend normalized to EUR — exactly what the INO-DOH needs. */
export interface Dividend {
  date: Date
  isin: string
  /** Net amount received, in EUR. Gross = total + withholding. */
  total: number
  /** Foreign tax withheld at source, in EUR. */
  withholding: number
}
