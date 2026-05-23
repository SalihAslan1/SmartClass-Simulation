import type { EnvironmentSettings, SimulationStats, SimulationStatus } from '../types';

export interface DerivedMetrics {
  comfortRate: number;
  averageOccupancy: number;
  energyPerOccupancyStep: number;
  lightUsageRate: number;
  inefficientHvacSteps: number;
  peakPower: number;
}

export interface AlertItem {
  id: string;
  level: 'info' | 'warning' | 'danger';
  title: string;
  message: string;
}

export function deriveMetrics(
  history: SimulationStatus[],
  stats: SimulationStats,
  targetTemp: number
): DerivedMetrics {
  const total = Math.max(history.length, 1);
  const comfortSteps = history.filter(
    (item) => item.temperature >= targetTemp - 0.5 && item.temperature <= targetTemp + 0.5
  ).length;
  const occupancySum = history.reduce((sum, item) => sum + item.occupancy, 0);
  const lightSteps = history.filter((item) => item.lightStatus !== 'OFF').length;
  const inefficientHvacSteps = history.filter(
    (item) => item.hvacMode !== 'OFF' && (item.windowOpen || item.doorOpen)
  ).length;
  const peakPower = history.reduce((max, item) => Math.max(max, item.totalPower), 0);

  return {
    comfortRate: Math.round((comfortSteps / total) * 1000) / 10,
    averageOccupancy: Math.round((occupancySum / total) * 10) / 10,
    energyPerOccupancyStep: occupancySum > 0 ? Math.round((stats.totalEnergy / occupancySum) * 100) / 100 : 0,
    lightUsageRate: Math.round((lightSteps / total) * 1000) / 10,
    inefficientHvacSteps,
    peakPower: Math.round(peakPower * 100) / 100,
  };
}

export function buildAlerts(
  status: SimulationStatus,
  environment: EnvironmentSettings,
  metrics: DerivedMetrics,
  targetTemp: number
): AlertItem[] {
  const alerts: AlertItem[] = [];

  if (status.temperature >= targetTemp + 2 || status.temperature <= targetTemp - 2) {
    alerts.push({
      id: 'comfort-out',
      level: 'danger',
      title: 'Konfor Disi Sicaklik',
      message: `Sinif sicakligi ${status.temperature}°C. Hedef ${targetTemp}°C cevresinden belirgin sekilde uzaklasmis.`,
    });
  }

  if (status.hvacMode !== 'OFF' && (status.windowOpen || status.doorOpen)) {
    alerts.push({
      id: 'hvac-loss',
      level: 'warning',
      title: 'Verimsiz HVAC Kullanimi',
      message: 'HVAC calisirken pencere veya kapi acik. Enerji kaybi olusuyor olabilir.',
    });
  }

  if (status.occupancy === 0 && status.totalPower > 100) {
    alerts.push({
      id: 'empty-class',
      level: 'warning',
      title: 'Bos Sinifta Tuketim',
      message: 'Sinifta kimse yok ama sistem enerji tuketmeye devam ediyor.',
    });
  }

  if (status.humidity < 30 || status.humidity > 70) {
    alerts.push({
      id: 'humidity-comfort',
      level: 'info',
      title: 'DHT22 Nem Konforu',
      message: `Sanal DHT22 nem okumasi %${status.humidity}. Konfor araligi disinda olabilir.`,
    });
  }

  if (status.motionDetected && status.lightStatus === 'OFF' && (status.frontLux < 250 || status.backLux < 250)) {
    alerts.push({
      id: 'low-lux-motion',
      level: 'warning',
      title: 'LDR Dusuk Aydinlik',
      message: 'PIR hareket algiliyor ancak LDR olcumu dusuk. Isik esigi ve bolge kararini kontrol edin.',
    });
  }

  if (status.sensorReadings.acs712.saturated) {
    alerts.push({
      id: 'acs-limit',
      level: 'danger',
      title: 'ACS712 Olcum Siniri',
      message: 'Sanal ACS712-05B 5A sinirina ulasti. Gercek sistemde daha yuksek akim aralikli sensor gerekebilir.',
    });
  }

  if (metrics.inefficientHvacSteps >= 3) {
    alerts.push({
      id: 'repeated-loss',
      level: 'info',
      title: 'Tekrarlayan Verimsizlik',
      message: `${metrics.inefficientHvacSteps} adim boyunca HVAC acikken pencere veya kapi da acik kalmis.`,
    });
  }

  if (environment.sunIntensity >= 0.8 && status.temperature > targetTemp) {
    alerts.push({
      id: 'solar-gain',
      level: 'info',
      title: 'Yuksek Gunes Etkisi',
      message: 'Gunes etkisi yuksek oldugu icin sinif beklenenden daha hizli isinabilir.',
    });
  }

  return alerts;
}
