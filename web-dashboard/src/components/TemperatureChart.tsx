import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ReferenceArea, ResponsiveContainer,
} from 'recharts';
import type { SimulationStatus } from '../types';

interface TemperatureChartProps {
  history: SimulationStatus[];
  targetTemp?: number;
}

export default function TemperatureChart({ history, targetTemp = 25 }: TemperatureChartProps) {
  const data = history.slice(-100).map((h) => ({
    step: h.timeStep,
    temp: h.temperature,
  }));

  return (
    <div className="chart-card">
      <h4 className="chart-title">Sicaklik Degisimi</h4>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="step"
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
          />
          <YAxis
            domain={[18, 32]}
            stroke="rgba(255,255,255,0.3)"
            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 11 }}
            tickFormatter={(v) => `${v}°`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              border: '1px solid rgba(6, 182, 212, 0.3)',
              borderRadius: '8px',
              color: '#e2e8f0',
            }}
            formatter={(v) => [`${v}°C`, 'Sicaklik']}
            labelFormatter={(l) => `Adim: ${l}`}
          />
          <ReferenceArea y1={targetTemp - 0.5} y2={targetTemp + 0.5} fill="rgba(34, 197, 94, 0.08)" />
          <ReferenceLine
            y={targetTemp}
            stroke="#ef4444"
            strokeDasharray="5 5"
            strokeOpacity={0.6}
            label={{ value: `Hedef ${targetTemp}°C`, fill: '#ef4444', fontSize: 10, position: 'right' }}
          />
          <Line
            type="monotone"
            dataKey="temp"
            stroke="#06b6d4"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, fill: '#06b6d4', stroke: '#0f172a', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
