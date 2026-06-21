import type { Dividend } from '../types'
import Export from './Export'
import './Report.css'

interface ReportProps {
  dividends: Dividend[]
  onReset?: () => void
}

const eur = new Intl.NumberFormat('hr-HR', { style: 'currency', currency: 'EUR' })
const dateFmt = new Intl.DateTimeFormat('hr-HR')

export default function Report({ dividends, onReset }: ReportProps) {
  return (
    <div className="results">
      <header className="results-head">
        <p className="eyebrow">Uvezene dividende</p>
        <h1 className="figure">{dividends.length}</h1>
        {onReset && (
          <button className="reset" type="button" onClick={onReset}>
            Učitaj drugu datoteku
          </button>
        )}
      </header>

      <section className="panel">
        <table className="divs">
          <thead>
            <tr>
              <th>Datum</th>
              <th>ISIN</th>
              <th>Ukupno</th>
              <th>Porez po odbitku</th>
            </tr>
          </thead>
          <tbody>
            {dividends.map((d, i) => (
              <tr key={`${i}-${d.isin}`}>
                <td>{isValidDate(d.date) ? dateFmt.format(d.date) : '—'}</td>
                <td>{d.isin || '—'}</td>
                <td>{eur.format(d.total)}</td>
                <td>{eur.format(d.withholding)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Export dividends={dividends} />
    </div>
  )
}

function isValidDate(d: Date): boolean {
  return !Number.isNaN(d.getTime())
}
