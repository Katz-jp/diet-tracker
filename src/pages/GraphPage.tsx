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
import { subscribeMealsInRange, subscribeWeightLogs } from '@/lib/firestore';
import type { MealLog } from '@/types';

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

  const rangeEnd = format(new Date(), 'yyyy-MM-dd');
  const rangeStart = format(subDays(new Date(), 29), 'yyyy-MM-dd');

  useEffect(() => {
    document.title = 'グラフ | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const u1 = subscribeMealsInRange(uid, rangeStart, rangeEnd, setMeals);
    const u2 = subscribeWeightLogs(uid, setWeights);
    return () => {
      u1();
      u2();
    };
  }, [uid, rangeStart, rangeEnd]);

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
    </main>
  );
}
