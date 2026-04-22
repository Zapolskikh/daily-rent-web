import { useEffect, useRef, useState } from 'react'
import { debugRunSql } from '../lib/api'

const PRESETS = [
  { label: 'Все товары', sql: 'SELECT id, data->>\'name\' AS name FROM products ORDER BY id;' },
  { label: 'Структура products', sql: 'SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'products\';' },
  { label: 'Все заказы', sql: 'SELECT id, status, created_at FROM orders ORDER BY created_at DESC LIMIT 20;' },
  { label: 'Все таблицы', sql: 'SELECT tablename FROM pg_tables WHERE schemaname = \'public\';' },
]

export default function SqlTerminal({ token, externalLog }) {
  const [sql, setSql] = useState('')
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  // Append external API call logs from admin panel buttons
  useEffect(() => {
    if (!externalLog) return
    setHistory((h) => [...h, externalLog])
  }, [externalLog])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history])

  async function run(querySql) {
    const q = (querySql ?? sql).trim()
    if (!q) return
    const entry = { type: 'query', sql: q, ts: new Date().toLocaleTimeString() }
    setHistory((h) => [...h, entry])
    setLoading(true)
    try {
      const result = await debugRunSql(q, token)
      setHistory((h) => [...h, { type: 'result', ...result, ts: new Date().toLocaleTimeString() }])
    } catch (err) {
      setHistory((h) => [...h, { type: 'error', message: err.message, ts: new Date().toLocaleTimeString() }])
    } finally {
      setLoading(false)
      if (!querySql) setSql('')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) run()
  }

  return (
    <div className="card flex flex-col gap-3 font-mono text-xs">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold font-sans">🖥 SQL Терминал</h2>
        <button className="btn-outline text-xs" onClick={() => setHistory([])}>Очистить</button>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-1">
        {PRESETS.map((p) => (
          <button key={p.label} className="btn-outline text-xs py-0.5 px-2"
            onClick={() => { setSql(p.sql); run(p.sql) }}>
            {p.label}
          </button>
        ))}
      </div>

      {/* Log */}
      <div className="bg-slate-950 text-slate-100 rounded-xl p-3 h-72 overflow-y-auto space-y-2">
        {history.length === 0 && (
          <p className="text-slate-500">// Введите SQL или нажмите пресет. Ctrl+Enter для запуска.</p>
        )}
        {history.map((entry, i) => (
          <div key={i}>
            {entry.type === 'query' && (
              <div className="text-amber-400">
                <span className="text-slate-500">{entry.ts} &gt; </span>{entry.sql}
              </div>
            )}
            {entry.type === 'api' && (
              <div>
                <div className="text-cyan-400">
                  <span className="text-slate-500">{entry.ts} API </span>
                  <span className="text-cyan-300">{entry.method} {entry.path}</span>
                </div>
                {entry.body && <div className="text-slate-400 pl-4">req: {JSON.stringify(entry.body)}</div>}
                {entry.response && <div className="text-green-400 pl-4">res: {JSON.stringify(entry.response)}</div>}
                {entry.error && <div className="text-red-400 pl-4">err: {entry.error}</div>}
              </div>
            )}
            {entry.type === 'result' && (
              <div>
                <div className="text-green-400">✓ {entry.rowcount} строк</div>
                {entry.rows?.length > 0 && (
                  <div className="overflow-x-auto mt-1">
                    <table className="border-collapse text-xs">
                      <thead>
                        <tr>
                          {entry.columns.map((c) => (
                            <th key={c} className="border border-slate-700 px-2 py-0.5 text-slate-300 bg-slate-800">{c}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {entry.rows.map((row, ri) => (
                          <tr key={ri}>
                            {entry.columns.map((c) => (
                              <td key={c} className="border border-slate-700 px-2 py-0.5 text-slate-200 max-w-xs truncate">
                                {typeof row[c] === 'object' ? JSON.stringify(row[c]) : String(row[c] ?? '')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
            {entry.type === 'error' && (
              <div className="text-red-400">
                <span className="text-slate-500">{entry.ts} ✗ </span>{entry.message}
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          className="input flex-1 min-h-12 font-mono text-xs resize-none"
          placeholder="SELECT * FROM products LIMIT 5;   (Ctrl+Enter)"
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button className="btn-primary px-4" onClick={() => run()} disabled={loading}>
          {loading ? '...' : '▶'}
        </button>
      </div>
    </div>
  )
}
