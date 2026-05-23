import type { VirtualSensorReadings } from '../types';

interface SensorPanelProps {
  readings: VirtualSensorReadings;
}

const formatMotionAge = (value: number | null): string => (
  value === null ? 'Hareket yok' : `${value} sn once`
);

export default function SensorPanel({ readings }: SensorPanelProps) {
  const activeZoneCount = readings.pir.zones.filter((zone) => zone.motionDetected).length;

  return (
    <div className="sensor-panel">
      <div className="sensor-panel-header">
        <h3>Sanal Sensorler</h3>
        <span>Gercek sensor teknik sinirlari baz alinir</span>
      </div>

      <div className="sensor-grid">
        <div className="sensor-card">
          <div className="sensor-name">DHT22</div>
          <div className="sensor-value">{readings.dht22.temperature} C / %{readings.dht22.humidity}</div>
          <div className="sensor-meta">
            0.5 Hz | hata {readings.dht22.temperatureError} C, %{readings.dht22.humidityError}
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-name">HC-SR501 PIR</div>
          <div className="sensor-value">{activeZoneCount}/{readings.pir.zones.length} bolge aktif</div>
          <div className="sensor-meta">
            {readings.pir.detectionRangeMeters} m | {readings.pir.detectionAngleDegrees} derece | {readings.pir.holdSeconds} sn gecikme
          </div>
        </div>

        <div className="sensor-card">
          <div className="sensor-name">GL5528 LDR</div>
          <div className="sensor-value">{readings.ldr.frontLux} / {readings.ldr.backLux} lux</div>
          <div className="sensor-meta">
            Esik {readings.ldr.thresholdLux} lux | tepki {readings.ldr.responseMs} ms
          </div>
        </div>

        <div className={`sensor-card ${readings.acs712.saturated ? 'sensor-warning' : ''}`}>
          <div className="sensor-name">ACS712-05B</div>
          <div className="sensor-value">{readings.acs712.currentAmp} A / {readings.acs712.measuredPower} W</div>
          <div className="sensor-meta">
            185 mV/A | hata %{readings.acs712.errorPercent}
            {readings.acs712.saturated ? ' | 5A siniri asildi' : ''}
          </div>
        </div>
      </div>

      <div className="pir-zone-list">
        {readings.pir.zones.map((zone) => (
          <div key={zone.id} className={`pir-zone ${zone.motionDetected ? 'active' : ''}`}>
            <span>{zone.label}</span>
            <strong>{zone.motionDetected ? 'Hareket var' : formatMotionAge(zone.lastMotionSecondsAgo)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}
