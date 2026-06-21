import { useRef, useState } from 'react'
import type { Dividend } from '../types'
import { injectDividendsFromFile, downloadXml } from '../lib/inodoh'
import './Export.css'

interface ExportProps {
  dividends: Dividend[]
}

interface Prepared {
  xml: string
  year: number | null
  count: number
}

export default function Export({ dividends }: ExportProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prepared, setPrepared] = useState<Prepared | null>(null)

  async function handleHeader(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.xml')) {
      setError('To nije XML datoteka. Učitaj INO-DOH koji si preuzeo s ePorezne.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const result = await injectDividendsFromFile(file, dividends)
      setPrepared(result)
    } catch (err) {
      setError((err as Error).message)
      setPrepared(null)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function handleClick() {
    if (busy) return
    if (prepared) {
      downloadXml(prepared.xml, `ObrazacINODOH${prepared.year ? `-${prepared.year}` : ''}.xml`)
    } else {
      inputRef.current?.click()
    }
  }

  return (
    <div className="export">
      <input
        ref={inputRef}
        type="file"
        accept=".xml,text/xml,application/xml"
        hidden
        onChange={(e) => handleHeader(e.target.files?.[0])}
      />
      <button
        className={`export-btn${prepared ? ' export-btn--ready' : ''}`}
        type="button"
        onClick={handleClick}
        disabled={busy}
      >
        {busy ? 'Učitavanje…' : prepared ? 'Izvezi INO-DOH izvještaj' : 'Uvezi zaglavlje INO-DOH-a'}
      </button>

      {prepared && (
        <button
          className="export-redo"
          type="button"
          onClick={() => {
            setPrepared(null)
            setError(null)
          }}
          disabled={busy}
        >
          Odaberi drugo zaglavlje
        </button>
      )}

      <p className="export-hint">
        {prepared
          ? `U tvoj INO-DOH${prepared.year ? ` za ${prepared.year}. godinu` : ''} uspješno je upisan ovoliko dividendi: ${prepared.count}. Klikni na gumb iznad za preuzimanje XML datoteke, zatim je učitaj natrag u ePoreznu, pokreni „Punu provjeru” i pošalji.`
          : 'Otvori novi INO-DOH u ePoreznoj, ispuni svoje podatke i poreznu godinu te ga preuzmi („Izvezi -> Preuzmi XML”) - stavke (redovi) nisu potrebne. Uvezi tu datoteku ovdje kako bi se u nju upisale tvoje dividende.'}
      </p>
      {error && <p className="error">{error}</p>}
    </div>
  )
}
