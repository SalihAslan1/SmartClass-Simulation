import { useMemo } from 'react';
import type { ClassroomType, HVACMode } from '../types';

interface ClassroomViewProps {
  seatedPositions: Set<number>;
  classroomType: ClassroomType;
  hvacMode: HVACMode;
  hvacPowerPercentage: number;
  frontLight: boolean;
  backLight: boolean;
  temperature: number;
}

export default function ClassroomView({
  seatedPositions,
  classroomType,
  hvacMode,
  hvacPowerPercentage,
  frontLight,
  backLight,
  temperature,
}: ClassroomViewProps) {
  const { capacity, rows, cols } = classroomType;
  const halfRow = Math.ceil(rows / 2);

  const roomTint = useMemo(() => {
    if (temperature < 22) return 'rgba(96, 165, 250, 0.12)';
    if (temperature < 24) return 'rgba(96, 165, 250, 0.06)';
    if (temperature <= 26) return 'rgba(34, 197, 94, 0.06)';
    if (temperature <= 28) return 'rgba(245, 158, 11, 0.08)';
    return 'rgba(248, 113, 113, 0.12)';
  }, [temperature]);

  const particleCount = useMemo(() => {
    if (hvacMode === 'OFF') return 0;
    return Math.max(3, Math.floor(hvacPowerPercentage / 10));
  }, [hvacMode, hvacPowerPercentage]);

  const particles = useMemo(() => (
    Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      left: 15 + ((i * 23) % 70),
      delay: ((i * 7) % 20) / 10,
      duration: 2 + ((i * 5) % 15) / 10,
      size: 3 + ((i * 3) % 4),
    }))
  ), [particleCount]);

  const desks = Array.from({ length: capacity }, (_, i) => i);
  const anyLightOn = frontLight || backLight;

  return (
    <div className={`classroom-view classroom-${classroomType.id}`}>
      <h3 className="classroom-title">
        <span>{classroomType.icon}</span> {classroomType.name} Gorunumu
        <span className="classroom-occupancy">{seatedPositions.size}/{capacity} kisi</span>
      </h3>

      <div className={`classroom-room ${!anyLightOn ? 'lights-off' : ''}`} style={{ backgroundColor: roomTint }}>
        {frontLight && <div className="room-light-overlay front-light-glow"></div>}
        {backLight && <div className="room-light-overlay back-light-glow"></div>}

        {particles.map((p) => (
          <div
            key={`particle-${p.id}`}
            className={`hvac-particle ${hvacMode.toLowerCase()}`}
            style={{
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              width: `${p.size}px`,
              height: `${p.size}px`,
            }}
          />
        ))}

        <div className="room-ceiling">
          <div className={`ceiling-light ${frontLight ? 'on' : ''}`}>
            <span className="light-icon">💡</span>
            <span className="light-label">On Isik</span>
          </div>
          <div className={`vent ${hvacMode !== 'OFF' ? 'active' : ''} ${hvacMode.toLowerCase()}`}>
            <span className="vent-icon">{hvacMode === 'HEATING' ? '🔥' : hvacMode === 'COOLING' ? '❄️' : '⊘'}</span>
            <span className="vent-label">HVAC</span>
          </div>
          <div className="whiteboard">
            <span>TAHTA</span>
          </div>
          <div className={`vent ${hvacMode !== 'OFF' ? 'active' : ''} ${hvacMode.toLowerCase()}`}>
            <span className="vent-icon">{hvacMode === 'HEATING' ? '🔥' : hvacMode === 'COOLING' ? '❄️' : '⊘'}</span>
            <span className="vent-label">HVAC</span>
          </div>
          <div className={`ceiling-light ${backLight ? 'on' : ''}`}>
            <span className="light-icon">💡</span>
            <span className="light-label">Arka Isik</span>
          </div>
        </div>

        <div className="room-divider">
          <span className="divider-label">On Bolge | Arka Bolge</span>
        </div>

        <div className="room-temp-badge">
          <span className={`temp-indicator ${temperature < 24 ? 'cold' : temperature > 26 ? 'hot' : 'comfort'}`}>
            {temperature}°C
          </span>
        </div>

        <div className="desks-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {desks.map((deskIndex) => {
            const isSeated = seatedPositions.has(deskIndex);
            const row = Math.floor(deskIndex / cols);
            const isFrontHalf = row < halfRow;

            return (
              <div
                key={deskIndex}
                className={`desk ${isSeated ? 'occupied' : 'empty'} ${isFrontHalf ? 'front-zone' : 'back-zone'}`}
              >
                <div className="desk-surface">
                  {isSeated ? (
                    <div className="person-avatar">
                      <div className="avatar-body">👤</div>
                      <div className="avatar-glow"></div>
                    </div>
                  ) : (
                    <div className="empty-chair">
                      <span>🪑</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="classroom-legend">
        <div className="legend-item">
          <div className="legend-dot occupied-dot"></div>
          <span>Dolu ({seatedPositions.size})</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot empty-dot"></div>
          <span>Bos ({capacity - seatedPositions.size})</span>
        </div>
        <div className="legend-item">
          <div className={`legend-dot light-dot ${frontLight ? 'on' : ''}`}></div>
          <span>On Isik ({frontLight ? 'Acik' : 'Kapali'})</span>
        </div>
        <div className="legend-item">
          <div className={`legend-dot light-dot ${backLight ? 'on' : ''}`}></div>
          <span>Arka Isik ({backLight ? 'Acik' : 'Kapali'})</span>
        </div>
        <div className="legend-item">
          <div className={`legend-dot hvac-dot ${hvacMode.toLowerCase()}`}></div>
          <span>HVAC ({hvacMode === 'HEATING' ? 'Isitma' : hvacMode === 'COOLING' ? 'Sogutma' : 'Kapali'})</span>
        </div>
      </div>
    </div>
  );
}
