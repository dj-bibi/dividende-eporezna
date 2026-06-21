import { useState } from 'react'
import type { Dividend } from './types'
import FileDrop from './components/FileDrop.tsx'
import Report from './components/Report.tsx'
import './index.css'
import './App.css'

export default function App() {
  const [dividends, setDividends] = useState<Dividend[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (dividends) {
    return (
      <main className="app-shell">
        <Report
          dividends={dividends}
          onReset={() => {
            setDividends(null)
            setError(null)
          }}
        />
      </main>
    )
  }

  return (
    <main className="app-shell app-shell--centered">
      <section className="hero">
        <h1>INO-DOH obrazac za dividende</h1>
        <p>
          Uvezi Trading212 ili IBKR CSV pregled transakcija. Ako sadrže dividende, prikazat će se
          popis dividendi i inozemnog poreza po odbitku, spremnih za hrvatski INO-DOH obrazac.
          Datoteka se učitava izravno u tvom pregledniku.
        </p>
      </section>

      <FileDrop onParsed={setDividends} onError={setError} />
      {error && <p className="error">{error}</p>}
    </main>
  )
}
