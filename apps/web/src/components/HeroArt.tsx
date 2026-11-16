/** Hero illustration: an Elliott impulse (1-5) and correction (A-B-C) over a candlestick chart. Pure SVG, no image request. */
export default function HeroArt() {
  const pts: [number, number, string][] = [
    [30, 300, ''], [110, 210, '1'], [160, 255, '2'], [270, 110, '3'], [320, 160, '4'], [400, 60, '5'], [445, 130, 'A'], [480, 95, 'B'], [520, 175, 'C'],
  ];
  const candles = Array.from({ length: 22 }, (_, i) => {
    const x = 30 + i * 22.5;
    const base = 300 - i * 9 + Math.sin(i * 1.3) * 26;
    const up = Math.sin(i * 2.1) > -0.2;
    const h = 14 + ((i * 37) % 22);
    return { x, y: base - h / 2, h, up };
  });
  return (
    <svg viewBox="0 0 560 360" role="img" aria-labelledby="hero-art-t">
      <title id="hero-art-t">Illustration of an Elliott Wave count: five waves up and an A-B-C correction</title>
      <defs>
        <linearGradient id="ha-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#C9A227" stopOpacity=".28" />
          <stop offset="1" stopColor="#C9A227" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[60, 120, 180, 240, 300].map((y) => <line key={y} x1="20" x2="540" y1={y} y2={y} stroke="#fff" strokeOpacity=".07" />)}
      {candles.map((c, i) => (
        <g key={i} opacity=".35">
          <line x1={c.x} x2={c.x} y1={c.y - 8} y2={c.y + c.h + 8} stroke={c.up ? '#5fd39b' : '#f08585'} strokeWidth="1.5" />
          <rect x={c.x - 5} y={c.y} width="10" height={c.h} rx="1.5" fill={c.up ? '#1E8E5A' : '#D64545'} />
        </g>
      ))}
      <path d={`M${pts.map((p) => `${p[0]},${p[1]}`).join(' L')} L520,340 L30,340 Z`} fill="url(#ha-fill)" />
      <g className="wave-draw">
        <path d={`M${pts.map((p) => `${p[0]},${p[1]}`).join(' L')}`} fill="none" stroke="#C9A227" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
      </g>
      {pts.filter((p) => p[2]).map(([x, y, l], i) => (
        <g key={l}>
          <circle cx={x} cy={y} r="6" fill="#0F2A4A" stroke="#C9A227" strokeWidth="3" />
          <text x={x} y={i % 2 === 0 ? y - 16 : y + 28} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="Georgia, serif">{l}</text>
        </g>
      ))}
    </svg>
  );
}
