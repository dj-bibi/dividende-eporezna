import { useRef, useState } from 'react'
import type { Dividend } from '../types'
import { parseStatement } from '../lib/parsers'
import { toEur } from '../lib/fx'

interface FileDropProps {
  onParsed: (dividends: Dividend[]) => void
  onError: (message: string | null) => void
}

export default function FileDrop({ onParsed, onError }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      onError('That file is not a CSV. Export your report as CSV and try again.')
      return
    }

    setFileName(file.name)
    setBusy(true)
    onError(null)

    try {
      const raw = await parseStatement(file)
      if (!raw.length) {
        onError('No dividends found in this file.')
        return
      }
      const dividends = await toEur(raw) // convert non-EUR lines via HNB
      onParsed(dividends)
    } catch (err) {
      onError(`Couldn't read the file: ${(err as Error).message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className={`filedrop${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        handleFile(e.dataTransfer.files?.[0])
      }}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      aria-label="Učitaj svoju CSV datoteku generiranu na IBKR ili Trading212 platformi"
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        hidden
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="filedrop-title">
        {busy ? 'Učitavanje…' : (fileName ?? 'Ovdje spusti svoj CSV')}
      </p>
      <p className="filedrop-hint">{busy ? 'Samo trenutak' : 'ili klikni za odabir datoteke'}</p>
    </div>
  )
}
