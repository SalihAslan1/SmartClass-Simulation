import type { SimulationStats } from '../types';
import type { DerivedMetrics } from '../utils/insights';

interface StatsPanelProps {
  stats: SimulationStats;
  metrics: DerivedMetrics;
}

export default function StatsPanel({ stats, metrics }: StatsPanelProps) {
  return (
    <div className="chart-card stats-panel">
      <h4 className="chart-title">Istatistikler</h4>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Toplam Adim</span>
          <span className="stat-value">{stats.totalSteps}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Ort. Sicaklik</span>
          <span className="stat-value">{stats.averageTemperature}°C</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Min Sicaklik</span>
          <span className="stat-value cold">{stats.minTemp}°C</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Max Sicaklik</span>
          <span className="stat-value hot">{stats.maxTemp}°C</span>
        </div>
        <div className="stat-item wide">
          <span className="stat-label">Toplam Enerji</span>
          <span className="stat-value energy">{(stats.totalEnergy / 1000).toFixed(1)} kJ</span>
        </div>
      </div>

      <h4 className="chart-title" style={{ marginTop: '16px' }}>Ek Metrikler</h4>
      <div className="stats-grid">
        <div className="stat-item">
          <span className="stat-label">Konfor Orani</span>
          <span className="stat-value">{metrics.comfortRate}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Ort. Mevcut</span>
          <span className="stat-value">{metrics.averageOccupancy}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Kisi Basi Enerji</span>
          <span className="stat-value">{metrics.energyPerOccupancyStep} J</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Isik Kullanim Orani</span>
          <span className="stat-value">{metrics.lightUsageRate}%</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Verimsiz HVAC Adimi</span>
          <span className="stat-value">{metrics.inefficientHvacSteps}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Zirve Guc</span>
          <span className="stat-value">{metrics.peakPower} W</span>
        </div>
      </div>

      <h4 className="chart-title" style={{ marginTop: '16px' }}>HVAC Dagilimi</h4>
      <div className="hvac-bars">
        <div className="hvac-bar-row">
          <span className="bar-label">Isitma</span>
          <div className="bar-track">
            <div className="bar-fill heating" style={{ width: `${stats.heatingPercent}%` }}></div>
          </div>
          <span className="bar-percent">{stats.heatingPercent}%</span>
        </div>
        <div className="hvac-bar-row">
          <span className="bar-label">Sogutma</span>
          <div className="bar-track">
            <div className="bar-fill cooling" style={{ width: `${stats.coolingPercent}%` }}></div>
          </div>
          <span className="bar-percent">{stats.coolingPercent}%</span>
        </div>
        <div className="hvac-bar-row">
          <span className="bar-label">Kapali</span>
          <div className="bar-track">
            <div className="bar-fill off-mode" style={{ width: `${stats.offPercent}%` }}></div>
          </div>
          <span className="bar-percent">{stats.offPercent}%</span>
        </div>
      </div>
    </div>
  );
}
