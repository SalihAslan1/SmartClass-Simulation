import type {
  ClassroomType,
  EnvironmentSettings,
  SimulationStats,
  SimulationStatus,
  TempSettings,
} from '../types';

interface ReportContext {
  history: SimulationStatus[];
  currentStatus: SimulationStatus;
  stats: SimulationStats;
  classroomType: ClassroomType;
  tempSettings: TempSettings;
  environmentSettings: EnvironmentSettings;
}

interface DerivedMetrics {
  averageOccupancy: number;
  comfortSteps: number;
  comfortPercent: number;
  lightOnSteps: number;
  lightOnPercent: number;
  windowOpenSteps: number;
  doorOpenSteps: number;
  peakPower: number;
  peakPowerStep: number;
  peakTemperature: number;
  minTemperature: number;
  averageHumidity: number;
  averageMeasuredPower: number;
}

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('tr-TR');
};

const formatBool = (value: boolean): string => (value ? 'ACIK' : 'KAPALI');

const escapeHtml = (value: string): string => (
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
);

const getEffectiveHistory = (
  history: SimulationStatus[],
  currentStatus: SimulationStatus
): SimulationStatus[] => (history.length > 0 ? history : [currentStatus]);

const deriveMetrics = (
  rows: SimulationStatus[],
  targetTemp: number
): DerivedMetrics => {
  let occupancySum = 0;
  let comfortSteps = 0;
  let lightOnSteps = 0;
  let windowOpenSteps = 0;
  let doorOpenSteps = 0;
  let peakPower = -1;
  let peakPowerStep = 0;
  let peakTemperature = Number.NEGATIVE_INFINITY;
  let minTemperature = Number.POSITIVE_INFINITY;
  let humiditySum = 0;
  let measuredPowerSum = 0;

  for (const row of rows) {
    occupancySum += row.occupancy;
    humiditySum += row.humidity;
    measuredPowerSum += row.measuredPower;

    if (row.temperature >= targetTemp - 0.5 && row.temperature <= targetTemp + 0.5) {
      comfortSteps += 1;
    }
    if (row.lightStatus !== 'OFF') {
      lightOnSteps += 1;
    }
    if (row.windowOpen) {
      windowOpenSteps += 1;
    }
    if (row.doorOpen) {
      doorOpenSteps += 1;
    }
    if (row.totalPower > peakPower) {
      peakPower = row.totalPower;
      peakPowerStep = row.timeStep;
    }
    if (row.temperature > peakTemperature) {
      peakTemperature = row.temperature;
    }
    if (row.temperature < minTemperature) {
      minTemperature = row.temperature;
    }
  }

  const totalSteps = Math.max(rows.length, 1);

  return {
    averageOccupancy: occupancySum / totalSteps,
    comfortSteps,
    comfortPercent: (comfortSteps / totalSteps) * 100,
    lightOnSteps,
    lightOnPercent: (lightOnSteps / totalSteps) * 100,
    windowOpenSteps,
    doorOpenSteps,
    peakPower: Math.max(peakPower, 0),
    peakPowerStep,
    peakTemperature: Number.isFinite(peakTemperature) ? peakTemperature : targetTemp,
    minTemperature: Number.isFinite(minTemperature) ? minTemperature : targetTemp,
    averageHumidity: humiditySum / totalSteps,
    averageMeasuredPower: measuredPowerSum / totalSteps,
  };
};

const buildDetailRowsText = (rows: SimulationStatus[]): string[] => {
  if (rows.length === 0) {
    return ['Kayitli simulasyon adimi bulunamadi.'];
  }

  return rows.map((step) => (
    [
      `${String(step.timeStep).padStart(4, ' ')}`,
      `${formatDateTime(step.recordedAt).padEnd(19, ' ')}`,
      `${step.temperature.toFixed(1).padStart(6, ' ')} C`,
      `${String(step.occupancy).padStart(3, ' ')}/${String(step.capacity).padEnd(3, ' ')}`,
      `%${step.occupancyPercentage.toFixed(1).padStart(5, ' ')}`,
      `${step.hvacMode.padEnd(7, ' ')}`,
      `%${String(step.hvacPowerPercentage).padStart(5, ' ')}`,
      `${step.lightStatus.padEnd(5, ' ')}`,
      `${String(Math.round(step.totalPower)).padStart(5, ' ')} W`,
      `${String(Math.round(step.hvacPower)).padStart(5, ' ')} W`,
      `${String(Math.round(step.lightPower)).padStart(4, ' ')} W`,
      `${String(Math.round(step.measuredPower)).padStart(5, ' ')} W`,
      `%${step.humidity.toFixed(1).padStart(5, ' ')}`,
      `${String(step.frontLux).padStart(4, ' ')}/${String(step.backLux).padEnd(4, ' ')} lux`,
      `${step.outsideTemp.toFixed(1).padStart(5, ' ')} C`,
      `Pencere:${formatBool(step.windowOpen).padEnd(6, ' ')}`,
      `Kapi:${formatBool(step.doorOpen).padEnd(6, ' ')}`,
    ].join(' | ')
  ));
};

export function buildSimulationReportText({
  history,
  currentStatus,
  stats,
  classroomType,
  tempSettings,
  environmentSettings,
}: ReportContext): string {
  const generatedAt = new Date();
  const effectiveHistory = getEffectiveHistory(history, currentStatus);
  const firstStep = effectiveHistory[0];
  const lastStep = effectiveHistory[effectiveHistory.length - 1];
  const derived = deriveMetrics(effectiveHistory, tempSettings.targetTemp);

  const lines = [
    'AKILLI SINIF WEB RAPORU',
    '============================================================',
    `Rapor Tarihi: ${generatedAt.toLocaleString('tr-TR')}`,
    '',
    'OTURUM OZETI',
    '------------------------------------------------------------',
    `Sinif Tipi: ${classroomType.name}`,
    `Sinif Buyuklugu: ${classroomType.capacity} kisi (${classroomType.rows} sira x ${classroomType.cols} kolon)`,
    `Kayitli Adim Sayisi: ${effectiveHistory.length}`,
    `Toplam Simulasyon Adimi: ${stats.totalSteps}`,
    `Baslangic Zamani: ${formatDateTime(firstStep.recordedAt)}`,
    `Son Guncelleme: ${formatDateTime(lastStep.recordedAt)}`,
    '',
    'ANA BULGULAR',
    '------------------------------------------------------------',
    `Konfor Araliginda Gecen Adim: ${derived.comfortSteps} (%${derived.comfortPercent.toFixed(1)})`,
    `Ortalama Sinif Mevcudu: ${derived.averageOccupancy.toFixed(1)} kisi`,
    `Isiklarin Acik Oldugu Adimlar: ${derived.lightOnSteps} (%${derived.lightOnPercent.toFixed(1)})`,
    `Ortalama DHT22 Nem Okumasi: %${derived.averageHumidity.toFixed(1)}`,
    `Ortalama ACS712 Guc Okumasi: ${derived.averageMeasuredPower.toFixed(1)} W`,
    `Pencere Acik Adim Sayisi: ${derived.windowOpenSteps}`,
    `Kapi Acik Adim Sayisi: ${derived.doorOpenSteps}`,
    `Zirve Toplam Guc: ${derived.peakPower.toFixed(2)} W (Adim ${derived.peakPowerStep})`,
    '',
    'ANLIK DURUM',
    '------------------------------------------------------------',
    `Zaman Adimi: ${currentStatus.timeStep}`,
    `Sinif Mevcudu: ${currentStatus.occupancy} / ${currentStatus.capacity}`,
    `Doluluk Orani: %${currentStatus.occupancyPercentage.toFixed(2)}`,
    `Sicaklik: ${currentStatus.temperature.toFixed(1)} C`,
    `DHT22 Sicaklik/Nem: ${currentStatus.sensorReadings.dht22.temperature.toFixed(1)} C / %${currentStatus.humidity.toFixed(1)}`,
    `Dis Sicaklik: ${currentStatus.outsideTemp.toFixed(1)} C`,
    `HVAC Durumu: ${currentStatus.hvacMode}`,
    `HVAC Guc Yuzdesi: %${currentStatus.hvacPowerPercentage}`,
    `HVAC Guc Tuketimi: ${currentStatus.hvacPower.toFixed(2)} W`,
    `Isik Durumu: ${currentStatus.lightStatus}`,
    `Isik Guc Tuketimi: ${currentStatus.lightPower.toFixed(2)} W`,
    `Toplam Anlik Guc: ${currentStatus.totalPower.toFixed(2)} W`,
    `ACS712 Olculen Guc/Akim: ${currentStatus.measuredPower.toFixed(2)} W / ${currentStatus.measuredCurrent.toFixed(2)} A`,
    `LDR On/Arka Lux: ${currentStatus.frontLux} / ${currentStatus.backLux}`,
    `PIR Aktif Bolge: ${currentStatus.sensorReadings.pir.zones.filter((zone) => zone.motionDetected).length} / ${currentStatus.sensorReadings.pir.zones.length}`,
    `Pencere Durumu: ${formatBool(currentStatus.windowOpen)}`,
    `Kapi Durumu: ${formatBool(currentStatus.doorOpen)}`,
    `Yalitim Seviyesi: %${Math.round(currentStatus.insulation * 100)}`,
    `Gunes Etkisi: %${Math.round(currentStatus.sunIntensity * 100)}`,
    '',
    'KONTROL AYARLARI',
    '------------------------------------------------------------',
    `Hedef Sicaklik: ${tempSettings.targetTemp.toFixed(1)} C`,
    `Isitma Baslangici: ${tempSettings.heatingTurnOn.toFixed(1)} C`,
    `Sogutma Baslangici: ${tempSettings.coolingTurnOn.toFixed(1)} C`,
    `Varsayilan Dis Sicaklik: ${environmentSettings.outsideTemp.toFixed(1)} C`,
    `Varsayilan Yalitim: %${Math.round(environmentSettings.insulation * 100)}`,
    `Varsayilan Gunes Etkisi: %${Math.round(environmentSettings.sunIntensity * 100)}`,
    `Varsayilan Pencere: ${formatBool(environmentSettings.windowOpen)}`,
    `Varsayilan Kapi: ${formatBool(environmentSettings.doorOpen)}`,
    '',
    'ISTATISTIKLER',
    '------------------------------------------------------------',
    `Ortalama Sicaklik: ${stats.averageTemperature.toFixed(2)} C`,
    `Minimum Sicaklik: ${stats.minTemp.toFixed(2)} C`,
    `Maksimum Sicaklik: ${stats.maxTemp.toFixed(2)} C`,
    `Toplam Harcanan Enerji: ${stats.totalEnergy.toFixed(2)} J`,
    `Isitma Adimlari: ${stats.heatingSteps} (%${stats.heatingPercent})`,
    `Sogutma Adimlari: ${stats.coolingSteps} (%${stats.coolingPercent})`,
    `Kapali Adimlar: ${stats.offSteps} (%${stats.offPercent})`,
    '',
    'SANAL SENSOR TEKNIK MODELLERI',
    '------------------------------------------------------------',
    'DHT22: -40/+80 C, +-0.5 C, %0-%100 RH, +- %2-5 RH, 0.5 Hz ornekleme.',
    'HC-SR501 PIR: 3-7 m algilama, 120 derece aci, hareket sonrasi gecikmeli HIGH cikisi.',
    'GL5528 LDR: Analog lux tahmini, 400 lux esik, 20-30 ms tepki suresi.',
    'ACS712-05B: +-5A aralik, 185 mV/A hassasiyet, yaklasik +- %1.5 hata payi.',
    '',
    'ADIM ADIM DETAYLAR',
    '------------------------------------------------------------',
    'Adim | Tarih-Saat          | Sicak  | Mevcut   | Doluluk  | HVAC    | HVAC%   | Isik  | Toplam | HVAC  | Isik | ACS   | Nem     | Lux       | Dis   | Pencere       | Kapi',
    ...buildDetailRowsText(effectiveHistory),
    '',
    'Rapor sonu.',
  ];

  return lines.join('\n');
}

export function buildSimulationReportHtml({
  history,
  currentStatus,
  stats,
  classroomType,
  tempSettings,
  environmentSettings,
}: ReportContext): string {
  const generatedAt = new Date();
  const effectiveHistory = getEffectiveHistory(history, currentStatus);
  const firstStep = effectiveHistory[0];
  const lastStep = effectiveHistory[effectiveHistory.length - 1];
  const derived = deriveMetrics(effectiveHistory, tempSettings.targetTemp);

  const detailRows = effectiveHistory.map((step) => `
    <tr>
      <td>${step.timeStep}</td>
      <td>${escapeHtml(formatDateTime(step.recordedAt))}</td>
      <td>${step.temperature.toFixed(1)} C</td>
      <td>${step.occupancy}/${step.capacity}</td>
      <td>%${step.occupancyPercentage.toFixed(1)}</td>
      <td>${step.hvacMode}</td>
      <td>%${step.hvacPowerPercentage}</td>
      <td>${step.lightStatus}</td>
      <td>${step.totalPower.toFixed(2)} W</td>
      <td>${step.hvacPower.toFixed(2)} W</td>
      <td>${step.lightPower.toFixed(2)} W</td>
      <td>${step.measuredPower.toFixed(2)} W</td>
      <td>%${step.humidity.toFixed(1)}</td>
      <td>${step.frontLux}/${step.backLux} lux</td>
      <td>${step.outsideTemp.toFixed(1)} C</td>
      <td>${formatBool(step.windowOpen)}</td>
      <td>${formatBool(step.doorOpen)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Akilli Sinif Web Raporu</title>
  <style>
    :root {
      --bg: #f3f7fb;
      --card: #ffffff;
      --text: #14213d;
      --muted: #5c6b81;
      --line: #dbe5f0;
      --blue: #1d4ed8;
      --cyan: #0891b2;
      --green: #15803d;
      --orange: #ea580c;
      --red: #dc2626;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 32px;
      font-family: "Segoe UI", Arial, sans-serif;
      background: linear-gradient(180deg, #eef4fb 0%, #f8fbff 100%);
      color: var(--text);
    }
    .page {
      max-width: 1280px;
      margin: 0 auto;
    }
    .hero {
      background: linear-gradient(135deg, var(--blue), var(--cyan));
      color: white;
      border-radius: 20px;
      padding: 28px;
      box-shadow: 0 18px 50px rgba(29, 78, 216, 0.18);
      margin-bottom: 24px;
    }
    .hero h1 {
      margin: 0 0 8px;
      font-size: 30px;
    }
    .hero p {
      margin: 6px 0;
      opacity: 0.95;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px;
      box-shadow: 0 10px 25px rgba(20, 33, 61, 0.06);
    }
    .card h3 {
      margin: 0 0 8px;
      font-size: 14px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .big {
      font-size: 28px;
      font-weight: 700;
      margin: 0;
    }
    .section {
      background: var(--card);
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 22px;
      margin-bottom: 20px;
      box-shadow: 0 10px 25px rgba(20, 33, 61, 0.06);
    }
    .section h2 {
      margin: 0 0 16px;
      font-size: 20px;
    }
    .meta {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px 20px;
    }
    .meta div {
      padding: 10px 12px;
      background: #f8fbff;
      border-radius: 12px;
      border: 1px solid #edf2f8;
    }
    .label {
      display: block;
      font-size: 12px;
      color: var(--muted);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .value {
      font-size: 18px;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      padding: 10px 8px;
      border-bottom: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f7faff;
      color: var(--muted);
      position: sticky;
      top: 0;
    }
    .table-wrap {
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 14px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 700;
      color: white;
    }
    .heating { background: var(--red); }
    .cooling { background: var(--cyan); }
    .off { background: #64748b; }
    .light { background: #ca8a04; }
    .ok { color: var(--green); }
    .warn { color: var(--orange); }
    @media (max-width: 1100px) {
      .grid { grid-template-columns: repeat(2, 1fr); }
      .meta { grid-template-columns: 1fr; }
    }
    @media (max-width: 700px) {
      body { padding: 16px; }
      .grid { grid-template-columns: 1fr; }
      .hero h1 { font-size: 24px; }
    }
  </style>
</head>
<body>
  <div class="page">
    <section class="hero">
      <h1>Akilli Sinif Enerji Verimliligi Web Raporu</h1>
      <p>Rapor Tarihi: ${escapeHtml(generatedAt.toLocaleString('tr-TR'))}</p>
      <p>Sinif Tipi: ${escapeHtml(classroomType.name)} | Kapasite: ${classroomType.capacity} kisi</p>
      <p>Baslangic: ${escapeHtml(formatDateTime(firstStep.recordedAt))} | Son Durum: ${escapeHtml(formatDateTime(lastStep.recordedAt))}</p>
    </section>

    <section class="grid">
      <div class="card">
        <h3>Toplam Enerji</h3>
        <p class="big">${stats.totalEnergy.toFixed(2)} J</p>
      </div>
      <div class="card">
        <h3>Ortalama Sicaklik</h3>
        <p class="big">${stats.averageTemperature.toFixed(2)} C</p>
      </div>
      <div class="card">
        <h3>Ortalama Mevcut</h3>
        <p class="big">${derived.averageOccupancy.toFixed(1)} kisi</p>
      </div>
      <div class="card">
        <h3>Konfor Orani</h3>
        <p class="big">${derived.comfortPercent.toFixed(1)}%</p>
      </div>
      <div class="card">
        <h3>DHT22 Ortalama Nem</h3>
        <p class="big">${derived.averageHumidity.toFixed(1)}%</p>
      </div>
      <div class="card">
        <h3>ACS712 Ortalama Guc</h3>
        <p class="big">${derived.averageMeasuredPower.toFixed(1)} W</p>
      </div>
    </section>

    <section class="section">
      <h2>Oturum Ozeti</h2>
      <div class="meta">
        <div><span class="label">Sinif Buyuklugu</span><span class="value">${classroomType.capacity} kisi (${classroomType.rows} x ${classroomType.cols})</span></div>
        <div><span class="label">Kayitli Adim</span><span class="value">${effectiveHistory.length}</span></div>
        <div><span class="label">Zirve Guc</span><span class="value">${derived.peakPower.toFixed(2)} W (Adim ${derived.peakPowerStep})</span></div>
        <div><span class="label">Isik Acik Orani</span><span class="value">${derived.lightOnPercent.toFixed(1)}%</span></div>
        <div><span class="label">Pencere Acik Adim</span><span class="value">${derived.windowOpenSteps}</span></div>
        <div><span class="label">Kapi Acik Adim</span><span class="value">${derived.doorOpenSteps}</span></div>
        <div><span class="label">Sicaklik Araligi</span><span class="value">${derived.minTemperature.toFixed(1)} C - ${derived.peakTemperature.toFixed(1)} C</span></div>
        <div><span class="label">HVAC Dagilimi</span><span class="value">Isitma ${stats.heatingPercent}% | Sogutma ${stats.coolingPercent}% | Kapali ${stats.offPercent}%</span></div>
      </div>
    </section>

    <section class="section">
      <h2>Anlik Durum</h2>
      <div class="meta">
        <div><span class="label">Zaman Adimi</span><span class="value">${currentStatus.timeStep}</span></div>
        <div><span class="label">Sinif Mevcudu</span><span class="value">${currentStatus.occupancy} / ${currentStatus.capacity} (%${currentStatus.occupancyPercentage.toFixed(1)})</span></div>
        <div><span class="label">Sicaklik</span><span class="value">${currentStatus.temperature.toFixed(1)} C</span></div>
        <div><span class="label">DHT22 Sicaklik / Nem</span><span class="value">${currentStatus.sensorReadings.dht22.temperature.toFixed(1)} C / %${currentStatus.humidity.toFixed(1)}</span></div>
        <div><span class="label">Dis Sicaklik</span><span class="value">${currentStatus.outsideTemp.toFixed(1)} C</span></div>
        <div><span class="label">HVAC</span><span class="value"><span class="badge ${currentStatus.hvacMode === 'HEATING' ? 'heating' : currentStatus.hvacMode === 'COOLING' ? 'cooling' : 'off'}">${currentStatus.hvacMode}</span> %${currentStatus.hvacPowerPercentage}</span></div>
        <div><span class="label">Isiklar</span><span class="value"><span class="badge light">${currentStatus.lightStatus}</span></span></div>
        <div><span class="label">HVAC Gucu</span><span class="value">${currentStatus.hvacPower.toFixed(2)} W</span></div>
        <div><span class="label">Isik Gucu</span><span class="value">${currentStatus.lightPower.toFixed(2)} W</span></div>
        <div><span class="label">Toplam Guc</span><span class="value">${currentStatus.totalPower.toFixed(2)} W</span></div>
        <div><span class="label">ACS712 Olcum</span><span class="value">${currentStatus.measuredPower.toFixed(2)} W / ${currentStatus.measuredCurrent.toFixed(2)} A</span></div>
        <div><span class="label">LDR Lux</span><span class="value">On ${currentStatus.frontLux} / Arka ${currentStatus.backLux}</span></div>
        <div><span class="label">PIR Aktif Bolge</span><span class="value">${currentStatus.sensorReadings.pir.zones.filter((zone) => zone.motionDetected).length} / ${currentStatus.sensorReadings.pir.zones.length}</span></div>
        <div><span class="label">Pencere / Kapi</span><span class="value">${formatBool(currentStatus.windowOpen)} / ${formatBool(currentStatus.doorOpen)}</span></div>
        <div><span class="label">Yalitim</span><span class="value">%${Math.round(currentStatus.insulation * 100)}</span></div>
        <div><span class="label">Gunes Etkisi</span><span class="value">%${Math.round(currentStatus.sunIntensity * 100)}</span></div>
      </div>
    </section>

    <section class="section">
      <h2>Kontrol Ayarlari</h2>
      <div class="meta">
        <div><span class="label">Hedef Sicaklik</span><span class="value">${tempSettings.targetTemp.toFixed(1)} C</span></div>
        <div><span class="label">Isitma Baslangici</span><span class="value">${tempSettings.heatingTurnOn.toFixed(1)} C</span></div>
        <div><span class="label">Sogutma Baslangici</span><span class="value">${tempSettings.coolingTurnOn.toFixed(1)} C</span></div>
        <div><span class="label">Varsayilan Dis Sicaklik</span><span class="value">${environmentSettings.outsideTemp.toFixed(1)} C</span></div>
        <div><span class="label">Varsayilan Yalitim</span><span class="value">%${Math.round(environmentSettings.insulation * 100)}</span></div>
        <div><span class="label">Varsayilan Gunes Etkisi</span><span class="value">%${Math.round(environmentSettings.sunIntensity * 100)}</span></div>
        <div><span class="label">Varsayilan Pencere</span><span class="value">${formatBool(environmentSettings.windowOpen)}</span></div>
        <div><span class="label">Varsayilan Kapi</span><span class="value">${formatBool(environmentSettings.doorOpen)}</span></div>
      </div>
    </section>

    <section class="section">
      <h2>Sanal Sensor Teknik Modelleri</h2>
      <div class="meta">
        <div><span class="label">DHT22</span><span class="value">+-0.5 C, +- %2-5 RH, 0.5 Hz</span></div>
        <div><span class="label">HC-SR501 PIR</span><span class="value">3-7 m, 120 derece, gecikmeli hareket cikisi</span></div>
        <div><span class="label">GL5528 LDR</span><span class="value">Analog lux tahmini, 20-30 ms tepki</span></div>
        <div><span class="label">ACS712-05B</span><span class="value">+-5A, 185 mV/A, +- %1.5 hata</span></div>
      </div>
    </section>

    <section class="section">
      <h2>Detayli Kayit Tablosu</h2>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Adim</th>
              <th>Tarih-Saat</th>
              <th>Sicaklik</th>
              <th>Mevcut</th>
              <th>Doluluk</th>
              <th>HVAC</th>
              <th>HVAC %</th>
              <th>Isik</th>
              <th>Toplam Guc</th>
              <th>HVAC Guc</th>
              <th>Isik Guc</th>
              <th>ACS712</th>
              <th>Nem</th>
              <th>Lux</th>
              <th>Dis Sicaklik</th>
              <th>Pencere</th>
              <th>Kapi</th>
            </tr>
          </thead>
          <tbody>
            ${detailRows}
          </tbody>
        </table>
      </div>
    </section>
  </div>
</body>
</html>`;
}

function downloadFile(content: string, filename: string, contentType: string): string {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
  return filename;
}

const buildTimestamp = (): string => {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    '_',
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
};

export function downloadSimulationReportText(reportText: string): string {
  const filename = `smart-classroom-report-${buildTimestamp()}.txt`;
  return downloadFile(reportText, filename, 'text/plain;charset=utf-8');
}

export function downloadSimulationReportHtml(reportHtml: string): string {
  const filename = `smart-classroom-report-${buildTimestamp()}.html`;
  return downloadFile(reportHtml, filename, 'text/html;charset=utf-8');
}
