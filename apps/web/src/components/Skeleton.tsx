/** Placeholder shapes shown while data loads, instead of a bare "Loading…". */
export function SkeletonCards({ n = 3 }: { n?: number }) {
  return (
    <div className="g g3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: n }, (_, i) => (
        <div className="card" key={i}>
          <div className="sk" style={{ height: 120, marginBottom: 16 }} />
          <div className="sk" style={{ height: 14, width: '40%', marginBottom: 12 }} />
          <div className="sk" style={{ height: 18, width: '80%', marginBottom: 10 }} />
          <div className="sk" style={{ height: 12, width: '60%' }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="card" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => <div key={i} className="sk" style={{ height: 18, margin: '14px 0', width: `${92 - (i % 3) * 12}%` }} />)}
    </div>
  );
}
