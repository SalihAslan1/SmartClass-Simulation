import type {
  ACS712Reading,
  ClassroomType,
  DHT22Reading,
  EnvironmentSettings,
  LDRReading,
  PIRReading,
  PIRZoneReading,
  VirtualSensorReadings,
} from '../types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

const round = (value: number, digits = 1): number => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const noise = (amplitude: number): number => (Math.random() * 2 - 1) * amplitude;

export class DHT22Sensor {
  private sampleIntervalSteps = 3;
  private stepsSinceSample = 999;
  private lastReading: DHT22Reading;
  private ambientHumidity = 46;

  constructor(initialTemp = 25) {
    this.lastReading = this.buildReading(initialTemp, this.ambientHumidity, 0);
  }

  read(temperature: number, occupancy: number, environment: EnvironmentSettings): DHT22Reading {
    const ventilationDrying = (environment.windowOpen || environment.doorOpen) ? -0.28 : 0;
    const occupancyMoisture = occupancy * 0.025;
    const sunDrying = environment.sunIntensity * -0.12;
    const outsideInfluence = (environment.outsideTemp < temperature ? -0.06 : 0.04) * (1 - environment.insulation);

    this.ambientHumidity = clamp(
      this.ambientHumidity + occupancyMoisture + ventilationDrying + sunDrying + outsideInfluence + noise(0.16),
      20,
      85
    );

    this.stepsSinceSample += 1;
    if (this.stepsSinceSample >= this.sampleIntervalSteps) {
      this.lastReading = this.buildReading(temperature, this.ambientHumidity, 0);
      this.stepsSinceSample = 0;
    } else {
      this.lastReading = {
        ...this.lastReading,
        lastSampleAgeMs: this.stepsSinceSample * 750,
      };
    }

    return this.lastReading;
  }

  restoreHumidity(value: number) {
    this.ambientHumidity = clamp(value, 0, 100);
    this.lastReading = this.buildReading(this.lastReading.temperature, this.ambientHumidity, 0);
  }

  reset(initialTemp = 25) {
    this.ambientHumidity = 46;
    this.stepsSinceSample = 999;
    this.lastReading = this.buildReading(initialTemp, this.ambientHumidity, 0);
  }

  private buildReading(temperature: number, humidity: number, ageMs: number): DHT22Reading {
    const temperatureError = noise(0.5);
    const humidityError = noise(3.5);
    return {
      model: 'DHT22',
      temperature: round(clamp(temperature + temperatureError, -40, 80), 1),
      humidity: round(clamp(humidity + humidityError, 0, 100), 1),
      lastSampleAgeMs: ageMs,
      sampleRateHz: 0.5,
      temperatureError: round(temperatureError, 2),
      humidityError: round(humidityError, 2),
    };
  }
}

export class PIRSensorArray {
  private holdSteps: number;
  private zones: PIRZoneReading[];

  constructor(classroomType: ClassroomType) {
    this.holdSteps = classroomType.id === 'large' ? 8 : classroomType.id === 'medium' ? 7 : 6;
    this.zones = this.createZones(classroomType).map((zone) => ({
      ...zone,
      motionDetected: false,
      lastMotionSecondsAgo: null,
    }));
  }

  read(seatedPositions: Set<number>, classroomType: ClassroomType): PIRReading {
    this.zones = this.zones.map((zone) => {
      const hasOccupancy = this.zoneHasOccupancy(zone, seatedPositions, classroomType);
      const movementChance = hasOccupancy ? 0.72 : 0.015;
      const blindSpotMiss = classroomType.id === 'large' ? 0.12 : 0.06;
      const freshMotion = Math.random() < movementChance && Math.random() > blindSpotMiss;

      let lastMotionSecondsAgo = zone.lastMotionSecondsAgo;
      if (freshMotion) {
        lastMotionSecondsAgo = 0;
      } else if (lastMotionSecondsAgo !== null) {
        lastMotionSecondsAgo += 1;
      }

      return {
        ...zone,
        motionDetected: lastMotionSecondsAgo !== null && lastMotionSecondsAgo <= this.holdSteps,
        lastMotionSecondsAgo,
      };
    });

    return {
      model: 'HC-SR501',
      detectionRangeMeters: classroomType.id === 'large' ? 7 : 5,
      detectionAngleDegrees: 120,
      holdSeconds: this.holdSteps,
      zones: this.zones,
    };
  }

  reset(classroomType: ClassroomType) {
    this.zones = this.createZones(classroomType).map((zone) => ({
      ...zone,
      motionDetected: false,
      lastMotionSecondsAgo: null,
    }));
  }

  restore(pir: PIRReading, classroomType: ClassroomType) {
    const expectedZones = this.createZones(classroomType);
    this.zones = expectedZones.map((zone) => {
      const saved = pir.zones.find((item) => item.id === zone.id);
      return saved ? { ...zone, ...saved } : { ...zone, motionDetected: false, lastMotionSecondsAgo: null };
    });
  }

  private createZones(classroomType: ClassroomType): Omit<PIRZoneReading, 'motionDetected' | 'lastMotionSecondsAgo'>[] {
    if (classroomType.id === 'small') {
      return [{ id: 'center', label: 'Merkez PIR', coveredSeats: classroomType.capacity }];
    }

    if (classroomType.id === 'medium') {
      return [
        { id: 'front', label: 'On Bolge PIR', coveredSeats: Math.ceil(classroomType.capacity / 2) },
        { id: 'back', label: 'Arka Bolge PIR', coveredSeats: Math.floor(classroomType.capacity / 2) },
      ];
    }

    return [
      { id: 'front-left', label: 'On Sol PIR', coveredSeats: 18 },
      { id: 'front-right', label: 'On Sag PIR', coveredSeats: 17 },
      { id: 'back-left', label: 'Arka Sol PIR', coveredSeats: 18 },
      { id: 'back-right', label: 'Arka Sag PIR', coveredSeats: 17 },
    ];
  }

  private zoneHasOccupancy(zone: PIRZoneReading, seatedPositions: Set<number>, classroomType: ClassroomType): boolean {
    for (const pos of seatedPositions) {
      const row = Math.floor(pos / classroomType.cols);
      const col = pos % classroomType.cols;
      const isFront = row < Math.ceil(classroomType.rows / 2);
      const isLeft = col < Math.ceil(classroomType.cols / 2);

      if (zone.id === 'center') return true;
      if (zone.id === 'front' && isFront) return true;
      if (zone.id === 'back' && !isFront) return true;
      if (zone.id === 'front-left' && isFront && isLeft) return true;
      if (zone.id === 'front-right' && isFront && !isLeft) return true;
      if (zone.id === 'back-left' && !isFront && isLeft) return true;
      if (zone.id === 'back-right' && !isFront && !isLeft) return true;
    }

    return false;
  }
}

export class GL5528LdrSensor {
  read(environment: EnvironmentSettings, classroomType: ClassroomType): LDRReading {
    const daylightLux = environment.sunIntensity * 850;
    const insulationLoss = 1 - environment.insulation * 0.18;
    const windowBoost = environment.windowOpen ? 90 : 0;
    const roomDepthLoss = classroomType.id === 'large' ? 0.48 : classroomType.id === 'medium' ? 0.6 : 0.72;

    const frontLux = clamp(daylightLux * insulationLoss + windowBoost + noise(18), 0, 1200);
    const backLux = clamp(frontLux * roomDepthLoss + noise(22), 0, 1000);
    const thresholdLux = 400;

    return {
      model: 'GL5528',
      frontLux: Math.round(frontLux),
      backLux: Math.round(backLux),
      thresholdLux,
      frontNeedsLight: frontLux < thresholdLux,
      backNeedsLight: backLux < thresholdLux,
      responseMs: Math.round(20 + Math.random() * 10),
    };
  }
}

export class ACS712Sensor {
  read(actualPower: number): ACS712Reading {
    const voltage = 220;
    const actualCurrent = actualPower / voltage;
    const offsetCurrent = noise(0.03);
    const percentError = noise(1.5);
    const measuredCurrent = clamp(actualCurrent * (1 + percentError / 100) + offsetCurrent, 0, 5);
    const saturated = actualCurrent > 5;

    return {
      model: 'ACS712-05B',
      currentAmp: round(measuredCurrent, 2),
      measuredPower: Math.round(measuredCurrent * voltage),
      voltage,
      sensitivityMvPerAmp: 185,
      errorPercent: round(percentError, 2),
      saturated,
    };
  }
}

export class VirtualSensorSuite {
  private dht22: DHT22Sensor;
  private pir: PIRSensorArray;
  private ldr: GL5528LdrSensor;
  private acs712: ACS712Sensor;

  constructor(classroomType: ClassroomType, initialTemp = 25) {
    this.dht22 = new DHT22Sensor(initialTemp);
    this.pir = new PIRSensorArray(classroomType);
    this.ldr = new GL5528LdrSensor();
    this.acs712 = new ACS712Sensor();
  }

  read({
    temperature,
    occupancy,
    environment,
    seatedPositions,
    classroomType,
    actualPower,
  }: {
    temperature: number;
    occupancy: number;
    environment: EnvironmentSettings;
    seatedPositions: Set<number>;
    classroomType: ClassroomType;
    actualPower: number;
  }): VirtualSensorReadings {
    const roomReadings = this.readRoom({
      temperature,
      occupancy,
      environment,
      seatedPositions,
      classroomType,
    });

    return {
      ...roomReadings,
      acs712: this.measurePower(actualPower),
    };
  }

  readRoom({
    temperature,
    occupancy,
    environment,
    seatedPositions,
    classroomType,
  }: {
    temperature: number;
    occupancy: number;
    environment: EnvironmentSettings;
    seatedPositions: Set<number>;
    classroomType: ClassroomType;
  }): Omit<VirtualSensorReadings, 'acs712'> {
    return {
      dht22: this.dht22.read(temperature, occupancy, environment),
      pir: this.pir.read(seatedPositions, classroomType),
      ldr: this.ldr.read(environment, classroomType),
    };
  }

  measurePower(actualPower: number): ACS712Reading {
    return this.acs712.read(actualPower);
  }

  reset(classroomType: ClassroomType, initialTemp = 25) {
    this.dht22.reset(initialTemp);
    this.pir.reset(classroomType);
  }

  restore(readings: VirtualSensorReadings, classroomType: ClassroomType) {
    this.dht22.restoreHumidity(readings.dht22.humidity);
    this.pir.restore(readings.pir, classroomType);
  }
}
