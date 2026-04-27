import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
  }));

  return (
    <div className="chart-card">
      <h4 className="chart-title">Guc Tuketimi</h4>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="hvacGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f97316" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lightGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eab308" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#eab308" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="step" stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} />
          <YAxis stroke="rgba(255,255,255,0.3)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }} tickFormatter={(v) => `${v}W`} />
          <Tooltip
            contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: '8px', color: '#e2e8f0' }}
            formatter={(v, name) => [`${v} W`, name === 'hvac' ? 'HVAC' : 'Isik']}
            labelFormatter={(l) => `Adim: ${l}`}
          />
          <Area type="monotone" dataKey="hvac" stroke="#f97316" strokeWidth={2} fill="url(#hvacGrad)" dot={false} />
          <Area type="monotone" dataKey="light" stroke="#eab308" strokeWidth={2} fill="url(#lightGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
