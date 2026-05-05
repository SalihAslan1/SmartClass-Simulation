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

export interface DHT22Reading {
  model: 'DHT22';
  temperature: number;
  humidity: number;
  lastSampleAgeMs: number;
  sampleRateHz: number;
  temperatureError: number;
  humidityError: number;
}

export interface PIRZoneReading {
  id: string;
  label: string;
  motionDetected: boolean;
  lastMotionSecondsAgo: number | null;
  coveredSeats: number;
}

export interface PIRReading {
  model: 'HC-SR501';
  detectionRangeMeters: number;
  detectionAngleDegrees: number;
  holdSeconds: number;
  zones: PIRZoneReading[];
}

export interface LDRReading {
  model: 'GL5528';
  frontLux: number;
  backLux: number;
  thresholdLux: number;
  frontNeedsLight: boolean;
  backNeedsLight: boolean;
  responseMs: number;
}

export interface ACS712Reading {
  model: 'ACS712-05B';
  currentAmp: number;
  measuredPower: number;
  voltage: number;
  sensitivityMvPerAmp: number;
  errorPercent: number;
  saturated: boolean;
}

export interface VirtualSensorReadings {
  dht22: DHT22Reading;
  pir: PIRReading;
  ldr: LDRReading;
  acs712: ACS712Reading;
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
  humidity: number;
  measuredPower: number;
  measuredCurrent: number;
  frontLux: number;
  backLux: number;
  motionDetected: boolean;
  sensorReadings: VirtualSensorReadings;
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
