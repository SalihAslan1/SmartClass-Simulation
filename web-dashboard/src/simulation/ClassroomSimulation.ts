import { TemperatureSensor } from './TemperatureSensor';
import { LightSensor } from './LightSensor';
import { OccupancySensor } from './OccupancySensor';
import { HVACSystem } from './HVACSystem';
import { VirtualSensorSuite } from './VirtualSensors';
import type {
  ClassroomType,
  ClassroomTypeId,
  ClassroomTypes,
  EnvironmentSettings,
  LightState,
  SimulationSnapshot,
  SimulationStats,
  SimulationStatus,
  TempSettings,
  VirtualSensorReadings,
} from '../types';

export const CLASSROOM_TYPES: ClassroomTypes = {
  small: {
    id: 'small',
    name: 'Kucuk Sinif',
    capacity: 30,
    rows: 5,
    cols: 6,
    icon: '🏫',
    description: '30 kisilik standart sinif',
  },
  medium: {
    id: 'medium',
    name: 'Orta Sinif',
    capacity: 50,
    rows: 5,
    cols: 10,
    icon: '🏢',
    description: '50 kisilik orta boy sinif',
  },
  large: {
    id: 'large',
    name: 'Buyuk Sinif',
    capacity: 70,
    rows: 7,
    cols: 10,
    icon: '🏛️',
    description: '70 kisilik amfi sinif',
  },
};

const DEFAULT_ENVIRONMENT: EnvironmentSettings = {
  outsideTemp: 24.0,
  insulation: 0.6,
  sunIntensity: 0.2,
  windowOpen: false,
  doorOpen: false,
};

export class ClassroomSimulation {
  private classroomType: ClassroomType;
  private temperatureSensor: TemperatureSensor;
  lightSensor: LightSensor;
  occupancySensor: OccupancySensor;
  hvac: HVACSystem;
  private timeStep: number;
  private singleLightPower: number;
  history: SimulationStatus[];
  private totalEnergy: number;
  private heatingSteps: number;
  private coolingSteps: number;
  private offSteps: number;
  private tempSum: number;
  private minTemp: number;
  private maxTemp: number;
  private seatedPositions: Set<number>;
  private sensorSuite: VirtualSensorSuite;

  constructor(classroomTypeId: ClassroomTypeId = 'small', initialTemp = 25.0) {
    this.classroomType = CLASSROOM_TYPES[classroomTypeId] || CLASSROOM_TYPES.small;
    const capacity = this.classroomType.capacity;

    this.temperatureSensor = new TemperatureSensor(initialTemp);
    this.lightSensor = new LightSensor();
    this.occupancySensor = new OccupancySensor(capacity);
    this.hvac = new HVACSystem();

    this.timeStep = 0;
    this.singleLightPower = 250.0;
    this.history = [];
    this.totalEnergy = 0;
    this.heatingSteps = 0;
    this.coolingSteps = 0;
    this.offSteps = 0;
    this.tempSum = 0;
    this.minTemp = initialTemp;
    this.maxTemp = initialTemp;
    this.seatedPositions = new Set();
    this.sensorSuite = new VirtualSensorSuite(this.classroomType, initialTemp);
  }

  simulationStep(environmentSettings?: EnvironmentSettings): SimulationStatus {
    const activeEnvironment = environmentSettings ?? DEFAULT_ENVIRONMENT;
    const occupancy = this.occupancySensor.getOccupancy();
    const currentTemp = this.temperatureSensor.getTemperature();

    const hvacMode = this.hvac.calculateHvacPower(currentTemp, occupancy);
    const hvacPowerPercentage = this.hvac.getPowerPercentage();

    const newTemp = this.temperatureSensor.updateTemperature(
      occupancy,
      hvacMode,
      hvacPowerPercentage,
      activeEnvironment
    );

    const roomSensorReadings = this.sensorSuite.readRoom({
      temperature: newTemp,
      occupancy,
      environment: activeEnvironment,
      seatedPositions: this.seatedPositions,
      classroomType: this.classroomType,
    });
    const lightState = this.calculateSensorBasedLightState(roomSensorReadings, occupancy);
    this.lightSensor.setState(lightState.front, lightState.back);
    const lightStatus = this.lightSensor.getLightStatus();
    const lightCount = this.lightSensor.getLightCount();

    const hvacPower = this.hvac.getPowerConsumption();
    const lightPowerValue = lightCount * this.singleLightPower;
    const totalPower = hvacPower + lightPowerValue;
    const acs712 = this.sensorSuite.measurePower(totalPower);

    this.totalEnergy += totalPower;
    if (hvacMode === 'HEATING') this.heatingSteps++;
    else if (hvacMode === 'COOLING') this.coolingSteps++;
    else this.offSteps++;

    this.tempSum += newTemp;
    this.minTemp = Math.min(this.minTemp, newTemp);
    this.maxTemp = Math.max(this.maxTemp, newTemp);

    const status: SimulationStatus = {
      recordedAt: new Date().toISOString(),
      timeStep: this.timeStep,
      occupancy,
      occupancyPercentage: this.occupancySensor.getOccupancyPercentage(),
      capacity: this.occupancySensor.getCapacity(),
      temperature: Math.round(newTemp * 10) / 10,
      hvacMode,
      hvacPowerPercentage,
      lightStatus,
      frontLight: lightState.front,
      backLight: lightState.back,
      lightCount,
      hvacPower: Math.round(hvacPower * 100) / 100,
      lightPower: lightPowerValue,
      totalPower: Math.round(totalPower * 100) / 100,
      classroomType: this.classroomType.id,
      outsideTemp: activeEnvironment.outsideTemp,
      insulation: activeEnvironment.insulation,
      sunIntensity: activeEnvironment.sunIntensity,
      windowOpen: activeEnvironment.windowOpen,
      doorOpen: activeEnvironment.doorOpen,
      humidity: roomSensorReadings.dht22.humidity,
      measuredPower: acs712.measuredPower,
      measuredCurrent: acs712.currentAmp,
      frontLux: roomSensorReadings.ldr.frontLux,
      backLux: roomSensorReadings.ldr.backLux,
      motionDetected: roomSensorReadings.pir.zones.some((zone) => zone.motionDetected),
      sensorReadings: {
        ...roomSensorReadings,
        acs712,
      },
    };

    this.history.push(status);
    if (this.history.length > 300) {
      this.history = this.history.slice(-300);
    }

    this.timeStep++;
    return status;
  }

  addOccupancy(count = 1): boolean {
    const success = this.occupancySensor.addPerson(count);
    if (success) {
      const totalDesks = this.classroomType.capacity;
      let added = 0;
      while (added < count) {
        const pos = Math.floor(Math.random() * totalDesks);
        if (!this.seatedPositions.has(pos)) {
          this.seatedPositions.add(pos);
          added++;
        }
      }
    }
    return success;
  }

  removeOccupancy(count = 1): boolean {
    const success = this.occupancySensor.removePerson(count);
    if (success) {
      const positions = Array.from(this.seatedPositions);
      let removed = 0;
      while (removed < count && positions.length > 0) {
        const idx = Math.floor(Math.random() * positions.length);
        this.seatedPositions.delete(positions[idx]);
        positions.splice(idx, 1);
        removed++;
      }
    }
    return success;
  }

  getSeatedPositions(): Set<number> {
    return this.seatedPositions;
  }

  getClassroomType(): ClassroomType {
    return this.classroomType;
  }

  getCurrentStatus(): SimulationStatus {
    const lightCount = this.lightSensor.getLightCount();
    const sensorReadings = this.sensorSuite.read({
      temperature: this.temperatureSensor.getTemperature(),
      occupancy: this.occupancySensor.getOccupancy(),
      environment: DEFAULT_ENVIRONMENT,
      seatedPositions: this.seatedPositions,
      classroomType: this.classroomType,
      actualPower: this.hvac.getPowerConsumption() + lightCount * this.singleLightPower,
    });
    return {
      recordedAt: new Date().toISOString(),
      timeStep: this.timeStep,
      temperature: this.temperatureSensor.getTemperature(),
      occupancy: this.occupancySensor.getOccupancy(),
      occupancyPercentage: this.occupancySensor.getOccupancyPercentage(),
      capacity: this.occupancySensor.getCapacity(),
      hvacMode: this.hvac.getMode(),
      hvacPowerPercentage: this.hvac.getPowerPercentage(),
      lightStatus: this.lightSensor.getLightStatus(),
      frontLight: this.lightSensor.frontLightOn,
      backLight: this.lightSensor.backLightOn,
      lightCount,
      hvacPower: this.hvac.getPowerConsumption(),
      lightPower: lightCount * this.singleLightPower,
      totalPower: this.hvac.getPowerConsumption() + lightCount * this.singleLightPower,
      classroomType: this.classroomType.id,
      outsideTemp: DEFAULT_ENVIRONMENT.outsideTemp,
      insulation: DEFAULT_ENVIRONMENT.insulation,
      sunIntensity: DEFAULT_ENVIRONMENT.sunIntensity,
      windowOpen: DEFAULT_ENVIRONMENT.windowOpen,
      doorOpen: DEFAULT_ENVIRONMENT.doorOpen,
      humidity: sensorReadings.dht22.humidity,
      measuredPower: sensorReadings.acs712.measuredPower,
      measuredCurrent: sensorReadings.acs712.currentAmp,
      frontLux: sensorReadings.ldr.frontLux,
      backLux: sensorReadings.ldr.backLux,
      motionDetected: sensorReadings.pir.zones.some((zone) => zone.motionDetected),
      sensorReadings,
    };
  }

  getStatistics(): SimulationStats {
    const totalSteps = this.timeStep || 1;
    return {
      totalSteps: this.timeStep,
      averageTemperature: Math.round((this.tempSum / totalSteps) * 100) / 100,
      minTemp: Math.round(this.minTemp * 100) / 100,
      maxTemp: Math.round(this.maxTemp * 100) / 100,
      totalEnergy: Math.round(this.totalEnergy * 100) / 100,
      heatingSteps: this.heatingSteps,
      coolingSteps: this.coolingSteps,
      offSteps: this.offSteps,
      heatingPercent: Math.round((this.heatingSteps / totalSteps) * 1000) / 10,
      coolingPercent: Math.round((this.coolingSteps / totalSteps) * 1000) / 10,
      offPercent: Math.round((this.offSteps / totalSteps) * 1000) / 10,
    };
  }

  createSnapshot(
    environmentSettings: EnvironmentSettings,
    tempSettings: TempSettings,
    speed: number
  ): SimulationSnapshot {
    return {
      classroomTypeId: this.classroomType.id,
      status: this.history.at(-1) ?? this.getCurrentStatus(),
      history: [...this.history],
      stats: this.getStatistics(),
      seatedPositions: Array.from(this.seatedPositions),
      environmentSettings,
      tempSettings,
      speed,
      savedAt: new Date().toISOString(),
      hvacSnapshot: this.hvac.getSnapshot(),
    };
  }

  restoreSnapshot(snapshot: SimulationSnapshot) {
    this.classroomType = CLASSROOM_TYPES[snapshot.classroomTypeId] || CLASSROOM_TYPES.small;
    this.temperatureSensor.setTemperature(snapshot.status.temperature);
    this.occupancySensor = new OccupancySensor(this.classroomType.capacity);
    this.occupancySensor.setOccupancy(snapshot.status.occupancy);
    this.lightSensor = new LightSensor();
    this.lightSensor.setState(snapshot.status.frontLight, snapshot.status.backLight);
    this.hvac = new HVACSystem();
    this.hvac.restoreSnapshot(snapshot.hvacSnapshot);
    this.sensorSuite = new VirtualSensorSuite(this.classroomType, snapshot.status.temperature);
    if (snapshot.status.sensorReadings) {
      this.sensorSuite.restore(snapshot.status.sensorReadings, this.classroomType);
    }

    this.timeStep = snapshot.stats.totalSteps;
    this.history = [...snapshot.history];
    this.totalEnergy = snapshot.stats.totalEnergy;
    this.heatingSteps = snapshot.stats.heatingSteps;
    this.coolingSteps = snapshot.stats.coolingSteps;
    this.offSteps = snapshot.stats.offSteps;
    this.tempSum = snapshot.stats.averageTemperature * snapshot.stats.totalSteps;
    this.minTemp = snapshot.stats.minTemp;
    this.maxTemp = snapshot.stats.maxTemp;
    this.seatedPositions = new Set(snapshot.seatedPositions);
  }

  reset() {
    this.temperatureSensor.reset();
    this.occupancySensor.currentOccupancy = 0;
    this.hvac = new HVACSystem();
    this.lightSensor = new LightSensor();
    this.sensorSuite = new VirtualSensorSuite(this.classroomType, 25.0);
    this.timeStep = 0;
    this.history = [];
    this.totalEnergy = 0;
    this.heatingSteps = 0;
    this.coolingSteps = 0;
    this.offSteps = 0;
    this.tempSum = 0;
    this.minTemp = 25.0;
    this.maxTemp = 25.0;
    this.seatedPositions = new Set();
  }

  private calculateSensorBasedLightState(
    readings: Omit<VirtualSensorReadings, 'acs712'>,
    occupancy: number
  ): LightState {
    if (occupancy === 0) {
      return {
        front: false,
        back: false,
      };
    }

    const zones = readings.pir.zones;
    const hasFrontMotion = zones.some((zone) => (
      zone.motionDetected && (zone.id.includes('front') || zone.id === 'center')
    ));
    const hasBackMotion = zones.some((zone) => (
      zone.motionDetected && (zone.id.includes('back') || zone.id === 'center')
    ));

    return {
      front: hasFrontMotion && readings.ldr.frontNeedsLight,
      back: hasBackMotion && readings.ldr.backNeedsLight,
    };
  }
}
