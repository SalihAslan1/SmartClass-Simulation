import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import type { SimulationStatus } from '../types';

interface PowerChartProps {
  history: SimulationStatus[];
}

export default function PowerChart({ history }: PowerChartProps) {
  const data = history.slice(-100).map((h) => ({
    step: h.timeStep,
    hvac: Math.round(h.hvacPower),
    light: h.lightPower,
    total: Math.round(h.totalPower),
    measured: Math.round(h.measuredPower),
  }));

  return (
    <div className="chart-card">
      <h4 className="chart-title">Guc Tuketimi</h4>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="hvacGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.36} />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#facc15" stopOpacity={0.34} />
              <stop offset="100%" stopColor="#facc15" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="step" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
          <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={(v) => `${v}W`} />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(8,11,15,0.96)', border: '1px solid rgba(245,158,11,0.32)', borderRadius: '8px', color: '#eef4f3' }}
            formatter={(v, name) => [
              `${v} W`,
              name === 'hvac'
                ? 'HVAC'
                : name === 'light'
                  ? 'Isik'
                  : name === 'total'
                    ? 'Hesaplanan toplam'
                    : 'ACS712-05B limitli olcum',
            ]}
            labelFormatter={(l) => `Adim: ${l}`}
          />
          <Area type="monotone" dataKey="hvac" stroke="#f59e0b" strokeWidth={2} fill="url(#hvacGrad)" dot={false} />
          <Area type="monotone" dataKey="light" stroke="#facc15" strokeWidth={2} fill="url(#lightGrad)" dot={false} />
          <Line type="monotone" dataKey="total" stroke="#eef4f3" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="measured" stroke="#34d399" strokeWidth={2.5} dot={false} strokeDasharray="5 4" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
