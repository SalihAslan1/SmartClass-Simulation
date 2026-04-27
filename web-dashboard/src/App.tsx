import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { ClassroomSimulation, CLASSROOM_TYPES } from './simulation/ClassroomSimulation';
import type {
  ClassroomTypeId,
  EnvironmentSettings,
  SavedSession,
  SimulationSnapshot,
  SimulationStats,
  SimulationStatus,
  TempSettings,
} from './types';
import Sidebar from './components/Sidebar';
import ClassroomView from './components/ClassroomView';
import MetricCard from './components/MetricCard';
import TemperatureChart from './components/TemperatureChart';
import PowerChart from './components/PowerChart';
import StatsPanel from './components/StatsPanel';
import {
  buildSimulationReportHtml,
  buildSimulationReportText,
  downloadSimulationReportHtml,
  downloadSimulationReportText,
} from './utils/report';
import {
  deleteSavedSession,
  listSavedSessions,
  loadLastSession,
  loadSavedSession,
  saveLastSession,
  saveNamedSession,
} from './utils/sessions';
import { buildAlerts, deriveMetrics } from './utils/insights';
import './App.css';

const defaultStatus = (capacity: number, classroomType: ClassroomTypeId): SimulationStatus => ({
  recordedAt: new Date().toISOString(),
  timeStep: 0,
  occupancy: 0,
  occupancyPercentage: 0,
  capacity,
  temperature: 25.0,
  hvacMode: 'OFF',
  hvacPowerPercentage: 0,
  lightStatus: 'OFF',
  frontLight: false,
  backLight: false,
  lightCount: 0,
  hvacPower: 0,
  lightPower: 0,
  totalPower: 0,
  classroomType,
  outsideTemp: 24,
  insulation: 0.6,
  sunIntensity: 0.2,
  windowOpen: false,
  doorOpen: false,
});

const defaultStats = (): SimulationStats => ({
  totalSteps: 0,
  averageTemperature: 0,
  minTemp: 25,
  maxTemp: 25,
  totalEnergy: 0,
  heatingSteps: 0,
  coolingSteps: 0,
  offSteps: 0,
  heatingPercent: 0,
  coolingPercent: 0,
  offPercent: 0,
});

const defaultEnvironmentSettings = (): EnvironmentSettings => ({
  outsideTemp: 24,
  insulation: 0.6,
  sunIntensity: 0.2,
  windowOpen: false,
  doorOpen: false,
});

function App() {
  const [classroomTypeId, setClassroomTypeId] = useState<ClassroomTypeId>('small');
  const simulationRef = useRef(new ClassroomSimulation(classroomTypeId, 25.0));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRunning, setIsRunning] = useState(false);
  const [speed, setSpeed] = useState(750);
  const [status, setStatus] = useState<SimulationStatus>(defaultStatus(30, 'small'));
  const [history, setHistory] = useState<SimulationStatus[]>([]);
  const [stats, setStats] = useState<SimulationStats>(defaultStats);
  const [seatedPositions, setSeatedPositions] = useState<Set<number>>(new Set());
  const [environmentSettings, setEnvironmentSettings] = useState<EnvironmentSettings>(defaultEnvironmentSettings);
  const [savedSessions, setSavedSessions] = useState<SavedSession[]>([]);
  const [tempSettings, setTempSettings] = useState<TempSettings>({
    targetTemp: 25.0,
    heatingTurnOn: 24.1,
    coolingTurnOn: 25.4,
  });

  const classroomType = CLASSROOM_TYPES[classroomTypeId];

  const applySnapshot = useCallback((snapshot: SimulationSnapshot) => {
    const nextType = CLASSROOM_TYPES[snapshot.classroomTypeId];
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);

    const simulation = new ClassroomSimulation(snapshot.classroomTypeId, snapshot.status.temperature);
    simulation.restoreSnapshot(snapshot);
    simulationRef.current = simulation;

    setClassroomTypeId(snapshot.classroomTypeId);
    setEnvironmentSettings(snapshot.environmentSettings);
    setTempSettings(snapshot.tempSettings);
    setSpeed(snapshot.speed);
    setStatus({ ...snapshot.status, capacity: nextType.capacity });
    setHistory(snapshot.history);
    setStats(snapshot.stats);
    setSeatedPositions(new Set(snapshot.seatedPositions));
  }, []);

  const runStep = useCallback(() => {
    const sim = simulationRef.current;
    const newStatus = sim.simulationStep(environmentSettings);
    setStatus(newStatus);
    setHistory([...sim.history]);
    setStats(sim.getStatistics());
    setSeatedPositions(new Set(sim.getSeatedPositions()));
  }, [environmentSettings]);

  useEffect(() => {
    const lastSnapshot = loadLastSession();
    if (lastSnapshot) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      applySnapshot(lastSnapshot);
    }
  }, [applySnapshot]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedSessions(listSavedSessions());
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(runStep, speed);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, speed, runStep]);

  useEffect(() => {
    const snapshot = simulationRef.current.createSnapshot(environmentSettings, tempSettings, speed);
    saveLastSession(snapshot);
  }, [status, history, stats, environmentSettings, tempSettings, speed, seatedPositions]);

  const metrics = useMemo(
    () => deriveMetrics(history, stats, tempSettings.targetTemp),
    [history, stats, tempSettings.targetTemp]
  );
  const alerts = useMemo(
    () => buildAlerts(status, environmentSettings, metrics, tempSettings.targetTemp),
    [status, environmentSettings, metrics, tempSettings.targetTemp]
  );

  const handleStart = () => setIsRunning(true);
  const handlePause = () => setIsRunning(false);

  const handleReset = () => {
    setIsRunning(false);
    simulationRef.current.reset();
    simulationRef.current.hvac.setThresholds(tempSettings);
    const ct = CLASSROOM_TYPES[classroomTypeId];
    setStatus(defaultStatus(ct.capacity, ct.id));
    setHistory([]);
    setStats(simulationRef.current.getStatistics());
    setSeatedPositions(new Set());
  };

  const handleClassroomChange = (typeId: ClassroomTypeId) => {
    setIsRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const ct = CLASSROOM_TYPES[typeId];
    simulationRef.current = new ClassroomSimulation(typeId, 25.0);
    simulationRef.current.hvac.setThresholds(tempSettings);
    setClassroomTypeId(typeId);
    setStatus(defaultStatus(ct.capacity, ct.id));
    setHistory([]);
    setStats(simulationRef.current.getStatistics());
    setSeatedPositions(new Set());
  };

  const handleAddPerson = (count: number) => {
    simulationRef.current.addOccupancy(count);
    setSeatedPositions(new Set(simulationRef.current.getSeatedPositions()));
    setStatus((prev) => ({
      ...prev,
      recordedAt: new Date().toISOString(),
      occupancy: simulationRef.current.occupancySensor.getOccupancy(),
      occupancyPercentage: simulationRef.current.occupancySensor.getOccupancyPercentage(),
      outsideTemp: environmentSettings.outsideTemp,
      insulation: environmentSettings.insulation,
      sunIntensity: environmentSettings.sunIntensity,
      windowOpen: environmentSettings.windowOpen,
      doorOpen: environmentSettings.doorOpen,
    }));
  };

  const handleRemovePerson = (count: number) => {
    simulationRef.current.removeOccupancy(count);
    setSeatedPositions(new Set(simulationRef.current.getSeatedPositions()));
    setStatus((prev) => ({
      ...prev,
      recordedAt: new Date().toISOString(),
      occupancy: simulationRef.current.occupancySensor.getOccupancy(),
      occupancyPercentage: simulationRef.current.occupancySensor.getOccupancyPercentage(),
      outsideTemp: environmentSettings.outsideTemp,
      insulation: environmentSettings.insulation,
      sunIntensity: environmentSettings.sunIntensity,
      windowOpen: environmentSettings.windowOpen,
      doorOpen: environmentSettings.doorOpen,
    }));
  };

  const handleTempSettingsChange = (newSettings: TempSettings) => {
    setTempSettings(newSettings);
    simulationRef.current.hvac.setThresholds(newSettings);
  };

  const handleEnvironmentSettingsChange = (newSettings: EnvironmentSettings) => {
    setEnvironmentSettings(newSettings);
    setStatus((prev) => ({
      ...prev,
      recordedAt: new Date().toISOString(),
      outsideTemp: newSettings.outsideTemp,
      insulation: newSettings.insulation,
      sunIntensity: newSettings.sunIntensity,
      windowOpen: newSettings.windowOpen,
      doorOpen: newSettings.doorOpen,
    }));
  };

  const handleGenerateReport = () => {
    const reportHtml = buildSimulationReportHtml({
      history,
      currentStatus: status,
      stats,
      classroomType,
      tempSettings,
      environmentSettings,
    });
    const filename = downloadSimulationReportHtml(reportHtml);
    window.alert(`HTML rapor olusturuldu: ${filename}`);
  };

  const handleGenerateTextReport = () => {
    const reportText = buildSimulationReportText({
      history,
      currentStatus: status,
      stats,
      classroomType,
      tempSettings,
      environmentSettings,
    });
    const filename = downloadSimulationReportText(reportText);
    window.alert(`TXT rapor olusturuldu: ${filename}`);
  };

  const handleSaveSession = () => {
    const name = window.prompt('Kaydedilecek oturum adi:', `Oturum ${new Date().toLocaleString('tr-TR')}`);
    if (!name) return;
    saveNamedSession(name, simulationRef.current.createSnapshot(environmentSettings, tempSettings, speed));
    setSavedSessions(listSavedSessions());
    window.alert('Oturum kaydedildi.');
  };

  const handleLoadSession = (id: string) => {
    const session = loadSavedSession(id);
    if (!session) return;
    applySnapshot(session.snapshot);
    window.alert(`Oturum yuklendi: ${session.name}`);
  };

  const handleDeleteSession = (id: string) => {
    deleteSavedSession(id);
    setSavedSessions(listSavedSessions());
  };

  const handleLoadLastSession = () => {
    const snapshot = loadLastSession();
    console.log('Last session snapshot:', snapshot);
    if (!snapshot) {
      window.alert('Son oturum kaydi bulunamadi.');
      return;
    }
    applySnapshot(snapshot);
  };

  const lightLabel = status.lightStatus === 'BOTH' ? 'On + Arka' :
    status.lightStatus === 'FRONT' ? 'Sadece On' :
    status.lightStatus === 'BACK' ? 'Sadece Arka' : 'Kapali';

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-glow"></div>
        <h1>
          <span className="header-icon">🏫</span>
          Akilli Sinif Enerji Verimliligi Simulasyonu
        </h1>
        <div className="header-info">
          <div className="header-badge classroom-badge">
            <span>{classroomType.icon}</span>
            {classroomType.name} - {classroomType.capacity} kisi
          </div>
          <div className="header-badge">
            <span className={`status-dot ${isRunning ? 'running' : 'paused'}`}></span>
            {isRunning ? 'Simulasyon Calisiyor' : 'Durduruldu'}
          </div>
        </div>
      </header>

      <div className="app-body">
        <Sidebar
          status={status}
          stats={stats}
          isRunning={isRunning}
          speed={speed}
          classroomTypeId={classroomTypeId}
          classroomTypes={CLASSROOM_TYPES}
          onStart={handleStart}
          onPause={handlePause}
          onReset={handleReset}
          onAddPerson={handleAddPerson}
          onRemovePerson={handleRemovePerson}
          onSpeedChange={setSpeed}
          onClassroomChange={handleClassroomChange}
          tempSettings={tempSettings}
          onTempSettingsChange={handleTempSettingsChange}
          environmentSettings={environmentSettings}
          onEnvironmentSettingsChange={handleEnvironmentSettingsChange}
          onGenerateReport={handleGenerateReport}
          onGenerateTextReport={handleGenerateTextReport}
          savedSessions={savedSessions}
          onSaveSession={handleSaveSession}
          onLoadSession={handleLoadSession}
          onDeleteSession={handleDeleteSession}
          onLoadLastSession={handleLoadLastSession}
        />

        <main className="main-content">
          {alerts.length > 0 && (
            <div className="alerts-panel">
              {alerts.map((alert) => (
                <div key={alert.id} className={`alert-card ${alert.level}`}>
                  <strong>{alert.title}</strong>
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          )}

          <div className="metrics-row">
            <MetricCard
              icon="🌡️"
              label="Sicaklik"
              value={`${status.temperature}°C`}
              subValue={`Hedef: ${tempSettings.targetTemp}°C | Dis: ${environmentSettings.outsideTemp}°C`}
              gradient="temp"
              trend={status.temperature > tempSettings.targetTemp ? 'up' : status.temperature < tempSettings.targetTemp ? 'down' : 'stable'}
            />
            <MetricCard
              icon="⚡"
              label="Toplam Enerji"
              value={`${(stats.totalEnergy / 1000).toFixed(1)} kJ`}
              subValue={`${status.totalPower} W anlik | Zirve ${metrics.peakPower} W`}
              gradient="energy"
            />
            <MetricCard
              icon="👥"
              label="Doluluk"
              value={`${status.occupancy} / ${status.capacity}`}
              subValue={`Ort: ${metrics.averageOccupancy} kisi | %${status.occupancyPercentage}`}
              gradient="occupancy"
            />
            <MetricCard
              icon="💡"
              label="Isiklar"
              value={lightLabel}
              subValue={`%${metrics.lightUsageRate} kullanim | ${status.lightPower} W`}
              gradient="hvac"
            />
          </div>

          <div className={`classroom-section classroom-section-${classroomType.id}`}>
            <ClassroomView
              seatedPositions={seatedPositions}
              classroomType={classroomType}
              hvacMode={status.hvacMode}
              hvacPowerPercentage={status.hvacPowerPercentage}
              frontLight={status.frontLight}
              backLight={status.backLight}
              temperature={status.temperature}
            />
          </div>

          <div className="charts-row">
            <div className="chart-container">
              <TemperatureChart history={history} targetTemp={tempSettings.targetTemp} />
            </div>
            <div className="chart-container">
              <PowerChart history={history} />
            </div>
            <div className="chart-container">
              <StatsPanel stats={stats} metrics={metrics} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
