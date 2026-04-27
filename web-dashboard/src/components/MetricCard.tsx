interface MetricCardProps {
  icon: string;
  label: string;
  value: string;
  subValue: string;
  gradient: 'temp' | 'energy' | 'occupancy' | 'hvac';
  trend?: 'up' | 'down' | 'stable';
}

export default function MetricCard({ icon, label, value, subValue, gradient, trend }: MetricCardProps) {
  return (
    <div className={`metric-card gradient-${gradient}`}>
      <div className="metric-icon">{icon}</div>
      <div className="metric-info">
        <span className="metric-label">{label}</span>
        <span className="metric-value">
          {value}
          {trend === 'up' && <span className="trend-arrow up">↑</span>}
          {trend === 'down' && <span className="trend-arrow down">↓</span>}
        </span>
        <span className="metric-sub">{subValue}</span>
      </div>
      <div className="metric-glow"></div>
    </div>
  );
}
