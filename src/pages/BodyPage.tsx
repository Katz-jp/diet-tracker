import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { addSizeLog, addWeightLog, deleteSizeLog, subscribeSizeLogs } from '@/lib/firestore';
import type { SizeLog } from '@/types';

function fmtNum(n?: number) {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(1);
}

export function BodyPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [sizes, setSizes] = useState<SizeLog[]>([]);

  const [wDate, setWDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [weight, setWeight] = useState('');
  const [sDate, setSDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [waist, setWaist] = useState('');
  const [lowerAbdomen, setLowerAbdomen] = useState('');
  const [hip, setHip] = useState('');
  const [bust, setBust] = useState('');
  const [sNotes, setSNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  useEffect(() => {
    document.title = '体重・サイズ | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeSizeLogs(uid, setSizes);
    return () => unsub();
  }, [uid]);

  async function submitWeight(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    const v = Number(weight);
    if (!weight.trim() || Number.isNaN(v) || v <= 0) return;
    setBusy(true);
    try {
      await addWeightLog(uid, wDate, v);
      setWeight('');
    } finally {
      setBusy(false);
    }
  }

  async function submitSize(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setSizeError(null);
    setBusy(true);
    try {
      await addSizeLog(uid, {
        date: sDate,
        waist: waist !== '' ? Number(waist) : undefined,
        lowerAbdomen: lowerAbdomen !== '' ? Number(lowerAbdomen) : undefined,
        hip: hip !== '' ? Number(hip) : undefined,
        bust: bust !== '' ? Number(bust) : undefined,
        notes: sNotes.trim() || undefined,
      });
      setWaist('');
      setLowerAbdomen('');
      setHip('');
      setBust('');
      setSNotes('');
    } catch (err) {
      setSizeError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <h1>体重・サイズ</h1>

      <form onSubmit={submitWeight} className="card">
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>体重</h2>
        <div className="field">
          <label htmlFor="wd">日付</label>
          <input id="wd" type="date" value={wDate} onChange={(e) => setWDate(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="wv">体重 (kg)</label>
          <input
            id="wv"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="例：62.5"
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          体重を記録
        </button>
      </form>

      <form onSubmit={submitSize} className="card">
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>サイズ（cm）</h2>
        {sizeError ? <div className="error-banner" style={{ marginBottom: '0.75rem' }}>{sizeError}</div> : null}
        <div className="field">
          <label htmlFor="sd">日付</label>
          <input id="sd" type="date" value={sDate} onChange={(e) => setSDate(e.target.value)} />
        </div>
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label htmlFor="sz-waist">ウエスト</label>
            <input id="sz-waist" value={waist} onChange={(e) => setWaist(e.target.value)} inputMode="decimal" />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label htmlFor="sz-low">下腹</label>
            <input id="sz-low" value={lowerAbdomen} onChange={(e) => setLowerAbdomen(e.target.value)} inputMode="decimal" />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label htmlFor="sz-hip">ヒップ</label>
            <input id="sz-hip" value={hip} onChange={(e) => setHip(e.target.value)} inputMode="decimal" />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label htmlFor="sz-bust">バスト</label>
            <input id="sz-bust" value={bust} onChange={(e) => setBust(e.target.value)} inputMode="decimal" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="sn">メモ</label>
          <textarea id="sn" value={sNotes} onChange={(e) => setSNotes(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          サイズを記録
        </button>
      </form>

      <h2 style={{ marginTop: '1.25rem' }}>サイズの履歴</h2>
      {sizes.length === 0 ? (
        <p className="muted">まだ記録がありません。</p>
      ) : (
        sizes.map((s) => (
          <div key={s.id} className="card">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div>
                <strong>{s.date}</strong>
                <p style={{ margin: '0.45rem 0 0', fontSize: '0.9rem' }}>
                  ウエスト {fmtNum(s.waist)} ／ 下腹 {fmtNum(s.lowerAbdomen)} ／ ヒップ {fmtNum(s.hip)} ／ バスト{' '}
                  {fmtNum(s.bust)} cm
                </p>
                {s.notes ? <p className="muted" style={{ margin: '0.35rem 0 0' }}>{s.notes}</p> : null}
              </div>
              <button
                type="button"
                className="btn btn-danger btn-ghost"
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                onClick={() => uid && deleteSizeLog(uid, s.id)}
              >
                削除
              </button>
            </div>
          </div>
        ))
      )}
    </main>
  );
}
