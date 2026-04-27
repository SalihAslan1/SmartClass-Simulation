import { useState } from 'react';
import type {
  ClassroomTypeId,
  ClassroomTypes,
  EnvironmentSettings,
  SavedSession,
  SimulationStats,
  SimulationStatus,
  TempSettings,
} from '../types';

interface SidebarProps {
  status: SimulationStatus;
  stats: SimulationStats;
  isRunning: boolean;
  speed: number;
  classroomTypeId: ClassroomTypeId;
  classroomTypes: ClassroomTypes;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onAddPerson: (count: number) => void;
  onRemovePerson: (count: number) => void;
  onSpeedChange: (speed: number) => void;
  onClassroomChange: (typeId: ClassroomTypeId) => void;
  tempSettings: TempSettings;
  onTempSettingsChange: (settings: TempSettings) => void;
  environmentSettings: EnvironmentSettings;
  onEnvironmentSettingsChange: (settings: EnvironmentSettings) => void;
  onGenerateReport: () => void;
  onGenerateTextReport: () => void;
  savedSessions: SavedSession[];
  onSaveSession: () => void;
  onLoadSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  onLoadLastSession: () => void;
}

export default function Sidebar({
  status, stats, isRunning, speed,
  classroomTypeId, classroomTypes,
  onStart, onPause, onReset,
  onAddPerson, onRemovePerson, onSpeedChange,
  onClassroomChange,
  tempSettings, onTempSettingsChange,
  environmentSettings, onEnvironmentSettingsChange,
  onGenerateReport, onGenerateTextReport,
  savedSessions, onSaveSession, onLoadSession, onDeleteSession, onLoadLastSession,
}: SidebarProps) {
  void stats;
  const [bulkCount, setBulkCount] = useState(5);

  const lightLabel = status.lightStatus === 'BOTH' ? 'On + Arka' :
    status.lightStatus === 'FRONT' ? 'Sadece On' :
    status.lightStatus === 'BACK' ? 'Sadece Arka' : 'Kapali';

  return (
    <aside className="sidebar">
      <div className="sidebar-section classroom-selector-section">
        <h3 className="section-title"><span className="section-icon">S</span>Sinif Secimi</h3>
        <div className="classroom-selector">
          {Object.values(classroomTypes).map((ct) => (
            <button
              key={ct.id}
              className={`classroom-type-btn ${classroomTypeId === ct.id ? 'active' : ''}`}
              onClick={() => onClassroomChange(ct.id)}
              disabled={isRunning}
              title={isRunning ? 'Simulasyonu durdurup sinif degistirin' : ct.description}
            >
              <span className="ct-icon">{ct.icon}</span>
              <div className="ct-info">
                <span className="ct-name">{ct.name}</span>
                <span className="ct-capacity">{ct.capacity} kisi</span>
              </div>
            </button>
          ))}
        </div>
        {isRunning && <div className="selector-warning">Sinif degistirmek icin simulasyonu durdurun</div>}
      </div>

      <div className="sidebar-section">
        <h3 className="section-title"><span className="section-icon">K</span>Simulasyon Kontrolu</h3>
        <div className="control-buttons">
          <button className={`btn btn-start ${isRunning ? 'disabled' : ''}`} onClick={onStart} disabled={isRunning}>Baslat</button>
          <button className={`btn btn-pause ${!isRunning ? 'disabled' : ''}`} onClick={onPause} disabled={!isRunning}>Duraklat</button>
          <button className="btn btn-reset" onClick={onReset}>Sifirla</button>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title"><span className="section-icon">H</span>Simulasyon Hizi</h3>
        <div className="speed-control">
          <input type="range" min="100" max="2000" step="50" value={speed} onChange={(e) => onSpeedChange(Number(e.target.value))} className="speed-slider" />
          <div className="speed-labels">
            <span>Hizli</span>
            <span className="speed-value">{speed} ms</span>
            <span>Yavas</span>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title"><span className="section-icon">T</span>Sicaklik Ayarlari</h3>
        <div className="temp-settings">
          <div className="temp-setting-row">
            <label className="temp-setting-label">Hedef Sicaklik</label>
            <div className="temp-setting-control">
              <input type="range" min="18" max="30" step="0.5" value={tempSettings.targetTemp} onChange={(e) => onTempSettingsChange({ ...tempSettings, targetTemp: Number(e.target.value) })} className="temp-slider" />
              <span className="temp-setting-value">{tempSettings.targetTemp} C</span>
            </div>
          </div>
          <div className="temp-setting-row">
            <label className="temp-setting-label">Isitma Baslangici</label>
            <div className="temp-setting-control">
              <input type="range" min="16" max="28" step="0.1" value={tempSettings.heatingTurnOn} onChange={(e) => onTempSettingsChange({ ...tempSettings, heatingTurnOn: Number(e.target.value) })} className="temp-slider heating-slider" />
              <span className="temp-setting-value heating-value">{tempSettings.heatingTurnOn} C</span>
            </div>
          </div>
          <div className="temp-setting-row">
            <label className="temp-setting-label">Sogutma Baslangici</label>
            <div className="temp-setting-control">
              <input type="range" min="18" max="35" step="0.1" value={tempSettings.coolingTurnOn} onChange={(e) => onTempSettingsChange({ ...tempSettings, coolingTurnOn: Number(e.target.value) })} className="temp-slider cooling-slider" />
              <span className="temp-setting-value cooling-value">{tempSettings.coolingTurnOn} C</span>
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title"><span className="section-icon">C</span>Cevre Kosullari</h3>
        <div className="temp-settings">
          <div className="temp-setting-row">
            <label className="temp-setting-label">Dis Sicaklik</label>
            <div className="temp-setting-control">
              <input type="range" min="-10" max="45" step="0.5" value={environmentSettings.outsideTemp} onChange={(e) => onEnvironmentSettingsChange({ ...environmentSettings, outsideTemp: Number(e.target.value) })} className="temp-slider" />
              <span className="temp-setting-value">{environmentSettings.outsideTemp} C</span>
            </div>
          </div>
          <div className="temp-setting-row">
            <label className="temp-setting-label">Yalitim Katsayisi</label>
            <div className="temp-setting-control">
              <input type="range" min="0" max="1" step="0.05" value={environmentSettings.insulation} onChange={(e) => onEnvironmentSettingsChange({ ...environmentSettings, insulation: Number(e.target.value) })} className="temp-slider" />
              <span className="temp-setting-value">%{Math.round(environmentSettings.insulation * 100)}</span>
            </div>
          </div>
          <div className="temp-setting-row">
            <label className="temp-setting-label">Gunes Etkisi</label>
            <div className="temp-setting-control">
              <input type="range" min="0" max="1" step="0.05" value={environmentSettings.sunIntensity} onChange={(e) => onEnvironmentSettingsChange({ ...environmentSettings, sunIntensity: Number(e.target.value) })} className="temp-slider heating-slider" />
              <span className="temp-setting-value heating-value">%{Math.round(environmentSettings.sunIntensity * 100)}</span>
            </div>
          </div>
          <div className="environment-toggles">
            <button className={`toggle-btn ${environmentSettings.windowOpen ? 'active' : ''}`} onClick={() => onEnvironmentSettingsChange({ ...environmentSettings, windowOpen: !environmentSettings.windowOpen })}>
              Pencere {environmentSettings.windowOpen ? 'Acik' : 'Kapali'}
            </button>
            <button className={`toggle-btn ${environmentSettings.doorOpen ? 'active' : ''}`} onClick={() => onEnvironmentSettingsChange({ ...environmentSettings, doorOpen: !environmentSettings.doorOpen })}>
              Kapi {environmentSettings.doorOpen ? 'Acik' : 'Kapali'}
            </button>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title"><span className="section-icon">M</span>Kisi Yonetimi</h3>
        <div className="quick-buttons">
          <button className="btn btn-add-small" onClick={() => onAddPerson(1)}>+1 Kisi</button>
          <button className="btn btn-remove-small" onClick={() => onRemovePerson(1)}>-1 Kisi</button>
        </div>
        <div className="bulk-control">
          <label className="bulk-label">Toplu Islem</label>
          <div className="bulk-input-row">
            <button className="btn-stepper" onClick={() => setBulkCount(Math.max(1, bulkCount - 1))}>-</button>
            <span className="bulk-value">{bulkCount}</span>
            <button className="btn-stepper" onClick={() => setBulkCount(Math.min(status.capacity, bulkCount + 1))}>+</button>
          </div>
          <div className="quick-buttons">
            <button className="btn btn-add" onClick={() => onAddPerson(bulkCount)}>Ekle</button>
            <button className="btn btn-remove" onClick={() => onRemovePerson(bulkCount)}>Cikar</button>
          </div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title"><span className="section-icon">D</span>Anlik Durum</h3>
        <div className="status-grid">
          <div className="status-item"><span className="status-icon">A</span><div><span className="status-label">Adim</span><span className="status-value">{status.timeStep}</span></div></div>
          <div className="status-item"><span className="status-icon">S</span><div><span className="status-label">Sicaklik</span><span className="status-value temp-value">{status.temperature} C</span></div></div>
          <div className="status-item"><span className="status-icon">H</span><div><span className="status-label">HVAC</span><span className={`status-value hvac-${status.hvacMode.toLowerCase()}`}>{status.hvacMode === 'HEATING' ? 'Isitma' : status.hvacMode === 'COOLING' ? 'Sogutma' : 'Kapali'}{status.hvacMode !== 'OFF' && ` %${status.hvacPowerPercentage}`}</span></div></div>
          <div className="status-item"><span className="status-icon">I</span><div><span className="status-label">Isiklar</span><span className={`status-value ${status.lightCount > 0 ? 'light-on' : 'light-off'}`}>{lightLabel}</span></div></div>
          <div className="status-item"><span className="status-icon">G</span><div><span className="status-label">Toplam Guc</span><span className="status-value power-value">{Math.round(status.hvacPower + status.lightPower)} W</span></div></div>
        </div>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title"><span className="section-icon">R</span>Rapor</h3>
        <div className="report-actions">
          <button className="btn btn-report" onClick={onGenerateReport}>HTML Raporu</button>
          <button className="btn btn-report-secondary" onClick={onGenerateTextReport}>TXT Raporu</button>
        </div>
        <p className="report-help">HTML raporu sunum ve inceleme icin, TXT raporu ise hizli arsivleme icin kullan.</p>
      </div>

      <div className="sidebar-section">
        <h3 className="section-title"><span className="section-icon">O</span>Oturumlar</h3>
        <div className="report-actions">
          <button className="btn btn-report" onClick={onSaveSession}>Oturumu Kaydet</button>
          <button className="btn btn-report-secondary" onClick={onLoadLastSession}>Son Oturumu Yukle</button>
        </div>
        <div className="session-list">
          {savedSessions.length === 0 && <p className="report-help">Henuz kayitli oturum yok.</p>}
          {savedSessions.map((session) => (
            <div key={session.id} className="session-item">
              <div className="session-text">
                <span className="session-name">{session.name}</span>
                <span className="session-meta">{new Date(session.snapshot.savedAt).toLocaleString('tr-TR')}</span>
              </div>
              <div className="session-buttons">
                <button className="session-btn load" onClick={() => onLoadSession(session.id)}>Yukle</button>
                <button className="session-btn delete" onClick={() => onDeleteSession(session.id)}>Sil</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
