'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import type { Analysis, Market } from '@/lib/types';
import { AnalysisCard } from '@/components/Cards';
import AccessSelect from '@/components/AccessSelect';
import Notice from '@/components/Notice';

const blank = { market: '', title: '', timeframe: 'Daily', waveCount: '', bias: 'Bullish', access: 'premium', chartImageUrl: '', summary: '', support: '', resistance: '', target: '', stopLoss: '', notes: '' };

export default function AdminAnalysis() {
  const [f, setF] = useState(blank);
  const [updateId, setUpdateId] = useState('');
  const [markets, setMarkets] = useState<Market[]>([]);
  const [items, setItems] = useState<Analysis[]>([]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const load = () => api<{ items: Analysis[] }>('/analysis').then((d) => setItems(d.items)).catch(() => {});
  useEffect(() => { api<{ items: Market[] }>('/markets').then((d) => { setMarkets(d.items); setF((x) => ({ ...x, market: d.items[0]?._id ?? '' })); }); load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setMsg(''); setErr('');
    const { support, resistance, target, stopLoss, notes, chartImageUrl, summary, ...rest } = f;
    const body = { ...rest, summary: summary || undefined, chartImageUrl: chartImageUrl || undefined, levels: { support, resistance, target, stopLoss, notes } };
    try {
      await api(updateId ? `/admin/analysis/${updateId}/update` : '/admin/analysis', { method: 'POST', body });
      setMsg(updateId ? 'Update posted. The earlier version is kept in history.' : 'Published');
      setUpdateId(''); setF({ ...blank, market: f.market }); load();
    } catch (e: any) { setErr(e.message); }
  }
  function startUpdate(a: Analysis) {
    setUpdateId(a._id);
    setF({ market: a.market._id, title: a.title, timeframe: a.timeframe ?? '', waveCount: a.waveCount, bias: a.bias, access: a.access ?? 'premium', chartImageUrl: a.chartImageUrl ?? '', summary: a.summary ?? '',
      support: a.levels?.support ?? '', resistance: a.levels?.resistance ?? '', target: a.levels?.target ?? '', stopLoss: a.levels?.stopLoss ?? '', notes: a.levels?.notes ?? '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  async function archive(a: Analysis) {
    setMsg(''); setErr('');
    try { await api(`/admin/analysis/${a._id}/archive`, { method: 'POST' }); setMsg('Taken off the website (kept in history)'); load(); } catch (e: any) { setErr(e.message); }
  }
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<any>) => setF({ ...f, [k]: e.target.value });
  const input = (k: keyof typeof blank, label: string, req = false) => (
    <div className="field"><label htmlFor={`a-${k}`}>{label}</label><input id={`a-${k}`} required={req} value={f[k]} onChange={set(k)} /></div>
  );

  return (
    <>
      <Notice msg={msg} err={err} />
      <h1>Market <span className="gold">analysis</span></h1>
      <form className="card" onSubmit={submit}>
        <h2 style={{ marginTop: 0, fontSize: '1.15rem' }}>{updateId ? 'Post an update (the old version stays in history)' : 'Publish new analysis'}</h2>
        <div className="g g3" style={{ gap: '0 16px' }}>
          <div className="field"><label htmlFor="a-market">Market</label><select id="a-market" value={f.market} onChange={set('market')} required>{markets.map((m) => <option key={m._id} value={m._id}>{m.name} ({m.category})</option>)}</select></div>
          <div className="field"><label htmlFor="a-bias">Bias</label><select id="a-bias" value={f.bias} onChange={set('bias')}><option>Bullish</option><option>Bearish</option><option>Neutral</option></select></div>
          <AccessSelect id="a-access" value={f.access} onChange={(v) => setF({ ...f, access: v })} label="Who sees the levels" />
        </div>
        <div className="g g2" style={{ gap: '0 16px' }}>
          {input('title', 'Title', true)}
          {input('timeframe', 'Timeframe (Daily, Weekly…)')}
        </div>
        {input('waveCount', 'Public wave count, e.g. Wave 3 of (5) in progress', true)}
        {input('chartImageUrl', 'Chart image URL (optional)')}
        <div className="field"><label htmlFor="a-summary">Public summary (optional)</label><textarea id="a-summary" rows={2} value={f.summary} onChange={set('summary')} /></div>
        <p className="label">Levels (shown only to the audience chosen above)</p>
        <div className="g g4" style={{ gap: '0 16px' }}>{input('support', 'Support')}{input('resistance', 'Resistance')}{input('target', 'Target')}{input('stopLoss', 'Stop loss')}</div>
        <div className="field"><label htmlFor="a-notes">Notes</label><textarea id="a-notes" rows={2} value={f.notes} onChange={set('notes')} /></div>
        <div className="row">
          <button className="btn btn-primary">{updateId ? 'Post update' : 'Publish'}</button>
          {updateId && <button type="button" className="btn" onClick={() => { setUpdateId(''); setF({ ...blank, market: f.market }); }}>Cancel update</button>}
        </div>
      </form>
      <h2>Current analysis</h2>
      <div className="g g2">
        {items.map((a) => (
          <div key={a._id}>
            <AnalysisCard a={a} />
            <div className="row" style={{ marginTop: 8 }}>
              <button className="btn btn-sm" onClick={() => startUpdate(a)}>Post update</button>
              <button className="btn btn-sm btn-danger" onClick={() => archive(a)}>Take off site</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
