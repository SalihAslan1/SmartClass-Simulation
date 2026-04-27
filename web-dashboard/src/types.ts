export type HVACMode = 'OFF' | 'HEATING' | 'COOLING';

export type LightStatus = 'OFF' | 'FRONT' | 'BACK' | 'BOTH';

export type ClassroomTypeId = 'small' | 'medium' | 'large';

export interface ClassroomType {
  id: ClassroomTypeId;
  name: string;
  capacity: number;
  rows: number;
  cols: number;
  icon: string;
  description: string;
}

export type ClassroomTypes = Record<ClassroomTypeId, ClassroomType>;

export interface TempSettings {
  targetTemp: number;
  heatingTurnOn: number;
  coolingTurnOn: number;
}

export interface EnvironmentSettings {
  outsideTemp: number;
  insulation: number;
  sunIntensity: number;
  windowOpen: boolean;
  doorOpen: boolean;
}

export interface LightState {
  front: boolean;
  back: boolean;
}

export interface SimulationStatus {
  recordedAt: string;
  timeStep: number;
  occupancy: number;
  occupancyPercentage: number;
  capacity: number;
  temperature: number;
  hvacMode: HVACMode;
  hvacPowerPercentage: number;
  lightStatus: LightStatus;
  frontLight: boolean;
  backLight: boolean;
  lightCount: number;
  hvacPower: number;
  lightPower: number;
  totalPower: number;
  classroomType: ClassroomTypeId;
  outsideTemp: number;
  insulation: number;
  sunIntensity: number;
  windowOpen: boolean;
  doorOpen: boolean;
}

export interface SimulationStats {
  totalSteps: number;
  averageTemperature: number;
  minTemp: number;
  maxTemp: number;
  totalEnergy: number;
  heatingSteps: number;
  coolingSteps: number;
  offSteps: number;
  heatingPercent: number;
  coolingPercent: number;
  offPercent: number;
}

export interface HVACSnapshot {
  mode: HVACMode;
  powerPercentage: number;
  runSteps: number;
  offSteps: number;
  targetTemperature: number;
  heatingTurnOn: number;
  coolingTurnOn: number;
}

export interface SimulationSnapshot {
  classroomTypeId: ClassroomTypeId;
  status: SimulationStatus;
  history: SimulationStatus[];
  stats: SimulationStats;
  seatedPositions: number[];
  environmentSettings: EnvironmentSettings;
  tempSettings: TempSettings;
  speed: number;
  savedAt: string;
  hvacSnapshot: HVACSnapshot;
}

export interface SavedSession {
  id: string;
  name: string;
  snapshot: SimulationSnapshot;
}
