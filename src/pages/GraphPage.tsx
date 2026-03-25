import { useEffect, useMemo, useState } from 'react';
import { format, subDays } from 'date-fns';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuthStore } from '@/store/authStore';
import {
  deleteBodyPhotoSet,
  saveBodyPhotoSet,
  subscribeBodyPhotoSets,
  subscribeMealsInRange,
  subscribeWeightLogs,
} from '@/lib/firestore';
import type { BodyPhotoSet, MealLog } from '@/types';

const CHART_GRID = 'rgba(255, 209, 209, 0.7)';
const CHART_TICK = { fill: '#b57878', fontSize: 11 };
const chartTooltipProps = {
  contentStyle: {
    background: '#fff9f9',
    border: '1px solid #ffd1d1',
    borderRadius: 10,
    color: '#3d2d2d',
  },
  labelStyle: { color: '#3d2d2d' },
};

function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${m}/${d}`;
}

export function GraphPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [weights, setWeights] = useState<{ id: string; date: string; weight: number; createdAt: Date }[]>([]);
  const [bodyPhotoSets, setBodyPhotoSets] = useState<BodyPhotoSet[]>([]);
  const [photoDate, setPhotoDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [fileFront, setFileFront] = useState<File | null>(null);
  const [fileSide, setFileSide] = useState<File | null>(null);
  const [fileBack, setFileBack] = useState<File | null>(null);
  const [blobFront, setBlobFront] = useState<string | null>(null);
  const [blobSide, setBlobSide] = useState<string | null>(null);
  const [blobBack, setBlobBack] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoDeleting, setPhotoDeleting] = useState<string | null>(null);
  const [photoInputKey, setPhotoInputKey] = useState(0);

  const rangeEnd = format(new Date(), 'yyyy-MM-dd');
  const rangeStart = format(subDays(new Date(), 29), 'yyyy-MM-dd');

  useEffect(() => {
    document.title = 'グラフ | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeMealsInRange(uid, rangeStart, rangeEnd, setMeals);
    const u2 = subscribeWeightLogs(uid, setWeights);
    const u3 = subscribeBodyPhotoSets(uid, setBodyPhotoSets);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [uid, rangeStart, rangeEnd]);

  useEffect(() => {
    if (!fileFront) {
      setBlobFront(null);
      return;
    }
    const u = URL.createObjectURL(fileFront);
    setBlobFront(u);
    return () => URL.revokeObjectURL(u);
  }, [fileFront]);

  useEffect(() => {
    if (!fileSide) {
      setBlobSide(null);
      return;
    }
    const u = URL.createObjectURL(fileSide);
    setBlobSide(u);
    return () => URL.revokeObjectURL(u);
  }, [fileSide]);

  useEffect(() => {
    if (!fileBack) {
      setBlobBack(null);
      return;
    }
    const u = URL.createObjectURL(fileBack);
    setBlobBack(u);
    return () => URL.revokeObjectURL(u);
  }, [fileBack]);

  const existingPhotoForDate = useMemo(
    () => bodyPhotoSets.find((s) => s.date === photoDate) ?? null,
    [bodyPhotoSets, photoDate]
  );

  async function onSavePhotos(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setPhotoError(null);
    setPhotoSaving(true);
    try {
      await saveBodyPhotoSet(
        uid,
        photoDate,
        {
          ...(fileFront ? { front: fileFront } : {}),
          ...(fileSide ? { side: fileSide } : {}),
          ...(fileBack ? { back: fileBack } : {}),
        },
        existingPhotoForDate
      );
      setFileFront(null);
      setFileSide(null);
      setFileBack(null);
      setPhotoInputKey((k) => k + 1);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setPhotoSaving(false);
    }
  }

  async function onDeletePhotoSet(date: string) {
    if (!uid) return;
    if (!confirm(`${date} の写真記録を削除しますか？`)) return;
    setPhotoDeleting(date);
    setPhotoError(null);
    try {
      await deleteBodyPhotoSet(uid, date);
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : '削除に失敗しました');
    } finally {
      setPhotoDeleting(null);
    }
  }

  const daily = useMemo(() => {
    const map = new Map<
      string,
      { calories: number; protein: number; fat: number; carbs: number; fiber: number }
    >();
    for (let i = 0; i < 30; i++) {
      const d = format(subDays(new Date(), 29 - i), 'yyyy-MM-dd');
      map.set(d, { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 });
    }
    meals.forEach((m) => {
      if (!map.has(m.date)) return;
      const cur = map.get(m.date)!;
      cur.calories += m.calories;
      cur.protein += m.protein;
      cur.fat += m.fat;
      cur.carbs += m.carbs;
      cur.fiber += m.fiber;
    });
    return Array.from(map.entries()).map(([date, v]) => ({
      date,
      label: shortDate(date),
      ...v,
    }));
  }, [meals]);

  const weightSeries = useMemo(() => {
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    return sorted.map((w) => ({
      date: w.date,
      label: shortDate(w.date),
      weight: w.weight,
    }));
  }, [weights]);

  return (
    <main className="page">
      <h1>グラフ</h1>
      <p className="muted" style={{ marginTop: '-0.5rem' }}>
        食事は直近30日分の日別合計です。体重は登録がある日のみ表示されます。
      </p>

      <div className="card" style={{ paddingBottom: '1.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>日別カロリー</h2>
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <LineChart data={daily} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={CHART_TICK} />
              <YAxis tick={CHART_TICK} />
              <Tooltip {...chartTooltipProps} />
              <Line type="monotone" dataKey="calories" name="kcal" stroke="#e07070" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ paddingBottom: '1.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>日別 PFC（積み上げ）</h2>
        <div style={{ width: '100%', height: 280 }}>
          <ResponsiveContainer>
            <AreaChart data={daily} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={CHART_TICK} />
              <YAxis tick={CHART_TICK} />
              <Tooltip {...chartTooltipProps} />
              <Legend />
              <Area
                type="monotone"
                stackId="1"
                dataKey="protein"
                name="タンパク質 (g)"
                stroke="#c96a6a"
                fill="#f5b8b8"
              />
              <Area type="monotone" stackId="1" dataKey="fat" name="脂質 (g)" stroke="#c9a070" fill="#ffe8d4" />
              <Area
                type="monotone"
                stackId="1"
                dataKey="carbs"
                name="炭水化物 (g)"
                stroke="#8b9fd4"
                fill="#dde4f7"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ paddingBottom: '1.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>食物繊維（日別）</h2>
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer>
            <LineChart data={daily} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={CHART_TICK} />
              <YAxis tick={CHART_TICK} />
              <Tooltip {...chartTooltipProps} />
              <Line type="monotone" dataKey="fiber" name="繊維(g)" stroke="#9d7aad" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card" style={{ paddingBottom: '1.25rem' }}>
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>体重の推移</h2>
        {weightSeries.length === 0 ? (
          <p className="muted">体重データがありません。</p>
        ) : (
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={weightSeries} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid stroke={CHART_GRID} strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={CHART_TICK} />
                <YAxis domain={['dataMin - 1', 'dataMax + 1']} tick={CHART_TICK} />
                <Tooltip {...chartTooltipProps} />
                <Line type="monotone" dataKey="weight" name="kg" stroke="#d06078" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="card">
        <h2 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>体型写真</h2>
        <p className="muted" style={{ marginTop: 0, marginBottom: '0.85rem' }}>
          同じ日付には1組（正面・横・後ろ）だけ保存できます。既にある日付は写真を選び直して保存で上書きできます。
        </p>
        {photoError ? <div className="error-banner" style={{ marginBottom: '0.75rem' }}>{photoError}</div> : null}
        <form key={photoInputKey} onSubmit={onSavePhotos}>
          <div className="field">
            <label htmlFor="body-photo-date">日付</label>
            <input
              id="body-photo-date"
              type="date"
              value={photoDate}
              onChange={(e) => {
                setPhotoDate(e.target.value);
                setFileFront(null);
                setFileSide(null);
                setFileBack(null);
              }}
            />
          </div>
          <div
            className="row"
            style={{ alignItems: 'stretch', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}
          >
            {(
              [
                ['front', '正面', fileFront, setFileFront, blobFront, existingPhotoForDate?.frontUrl] as const,
                ['side', '横', fileSide, setFileSide, blobSide, existingPhotoForDate?.sideUrl] as const,
                ['back', '後ろ', fileBack, setFileBack, blobBack, existingPhotoForDate?.backUrl] as const,
              ] as const
            ).map(([key, label, _file, setFile, blob, existingUrl]) => {
              const src = blob ?? existingUrl ?? '';
              return (
                <div
                  key={key}
                  className="field"
                  style={{ flex: '1 1 140px', marginBottom: 0 }}
                >
                  <label htmlFor={`ph-${key}`}>{label}</label>
                  <input
                    id={`ph-${key}`}
                    type="file"
                    accept="image/*"
                    onChange={(ev) => {
                      const f = ev.target.files?.[0] ?? null;
                      setFile(f);
                    }}
                  />
                  {src ? (
                    <img
                      src={src}
                      alt={label}
                      style={{
                        width: '100%',
                        maxHeight: 180,
                        objectFit: 'cover',
                        borderRadius: 10,
                        marginTop: '0.5rem',
                        border: '1px solid var(--border)',
                      }}
                    />
                  ) : (
                    <p className="muted" style={{ margin: '0.5rem 0 0', fontSize: '0.82rem' }}>
                      未選択
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <button type="submit" className="btn btn-primary" disabled={photoSaving}>
            {photoSaving ? '保存中…' : '写真を保存'}
          </button>
        </form>
      </div>

      {bodyPhotoSets.length > 0 ? (
        <div className="card">
          <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>保存済みの写真</h2>
          <div className="stack-sm">
            {bodyPhotoSets.map((s) => (
              <div
                key={s.id}
                className="card"
                style={{ marginBottom: '0.65rem', background: 'var(--surface2)', borderColor: 'var(--border)' }}
              >
                <div className="row" style={{ alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700 }}>{s.date}</div>
                  <button
                    type="button"
                    className="btn btn-danger btn-ghost"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    disabled={photoDeleting === s.date}
                    onClick={() => void onDeletePhotoSet(s.date)}
                  >
                    {photoDeleting === s.date ? '削除中…' : '削除'}
                  </button>
                </div>
                <div className="row" style={{ gap: '0.4rem', flexWrap: 'wrap', alignItems: 'stretch' }}>
                  {(
                    [
                      ['正面', s.frontUrl] as const,
                      ['横', s.sideUrl] as const,
                      ['後ろ', s.backUrl] as const,
                    ] as const
                  ).map(([lbl, url]) => (
                    <div key={lbl} style={{ flex: '1 1 100px', minWidth: 0 }}>
                      <div className="muted" style={{ fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                        {lbl}
                      </div>
                      <img
                        src={url}
                        alt={lbl}
                        style={{
                          width: '100%',
                          maxHeight: 160,
                          objectFit: 'cover',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </main>
  );
}
