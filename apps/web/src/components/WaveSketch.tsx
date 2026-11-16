/** Illustrative Elliott Wave sketch used when an analysis has no uploaded chart image. */
export default function WaveSketch({ bias }: { bias: string }) {
  const bear = bias === 'Bearish';
  const p = bear ? [10, 6, 8, 3] : [2, 5, 3.5, 8, 6, 10];
  const l = bear ? '0ABC' : '012345';
  const n = p.length, mx = Math.max(...p), mn = Math.min(...p);
  const X = (i: number) => 20 + (i * 260) / (n - 1), Y = (v: number) => 112 - ((v - mn) / (mx - mn || 1)) * 85;
  const c = bear ? '#D64545' : bias === 'Bullish' ? '#1E8E5A' : '#0F2A4A';
  return (
    <svg className="wv" viewBox="0 0 300 130" role="img" aria-label={`${bias} wave sketch`}>
      <polyline fill="none" stroke={c} strokeWidth="3" strokeLinejoin="round" points={p.map((v, i) => `${X(i)},${Y(v)}`).join(' ')} />
      {p.map((v, i) => (
        <g key={i}><circle cx={X(i)} cy={Y(v)} r="3.5" fill={c} /><text x={X(i) - 3} y={Y(v) + (i % 2 ? -9 : 16)}>{l[i]}</text></g>
      ))}
    </svg>
  );
}
