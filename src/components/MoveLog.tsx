import { useEffect, useRef } from 'react'
import type { LogEntry } from '../game/engine'

export function MoveLog({ log }: { log: LogEntry[] }) {
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'nearest' })
  }, [log.length])

  return (
    <section className="panel log-panel">
      <h2>Battle log</h2>
      <ol className="log-list">
        {log.map((item) => (
          <li key={item.id} className={`log-item log-${item.kind} log-side-${item.side}`}>
            {item.text}
          </li>
        ))}
      </ol>
      <div ref={endRef} />
    </section>
  )
}
