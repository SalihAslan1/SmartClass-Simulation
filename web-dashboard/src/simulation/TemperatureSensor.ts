import type { EnvironmentSettings, HVACMode } from '../types';

export class TemperatureSensor {
  private currentTemp: number;
  private minTemp: number;
  private maxTemp: number;
  private defaultEnvironment: EnvironmentSettings;

  constructor(initialTemp = 25.0) {
    this.currentTemp = initialTemp;
    this.minTemp = 15.0;
    this.maxTemp = 35.0;
    this.defaultEnvironment = {
      outsideTemp: 24.0,
      insulation: 0.6,
      sunIntensity: 0.2,
      windowOpen: false,
      doorOpen: false,
    };
  }

  updateTemperature(
    occupancy: number,
    hvacMode: HVACMode,
    hvacPowerPercentage = 0.0,
    environment: EnvironmentSettings = this.defaultEnvironment,
    timeStep = 1.0
  ): number {
    const humanHeat = occupancy * 0.1;

    let hvacEffect = 0.0;
    const maxHvacEffect = 7.2;
    if (hvacMode === 'HEATING') {
      hvacEffect = (hvacPowerPercentage / 100.0) * maxHvacEffect;
    } else if (hvacMode === 'COOLING') {
      hvacEffect = -(hvacPowerPercentage / 100.0) * maxHvacEffect;
    }

    const baseTransferRate = 0.06;
    const insulation = Math.max(0, Math.min(1, environment.insulation));
    const outsideEffect =
      (environment.outsideTemp - this.currentTemp) * baseTransferRate * (1 - insulation);

    const solarGain = 0.35;
    const solarEffect = Math.max(0, Math.min(1, environment.sunIntensity)) * solarGain;

    const ventilationRate =
      (environment.windowOpen ? 0.08 : 0) +
      (environment.doorOpen ? 0.04 : 0);
    const ventilationEffect = (environment.outsideTemp - this.currentTemp) * ventilationRate;

    const randomVariation = (Math.random() - 0.5) * 0.02;

    const tempChange =
      humanHeat +
      hvacEffect +
      outsideEffect +
      solarEffect +
      ventilationEffect +
      randomVariation;
    this.currentTemp += tempChange * (timeStep / 14.0);
    this.currentTemp = Math.max(this.minTemp, Math.min(this.maxTemp, this.currentTemp));
    return Math.round(this.currentTemp * 100) / 100;
  }

  getTemperature(): number {
    return this.currentTemp;
  }

  setTemperature(value: number) {
    this.currentTemp = Math.max(this.minTemp, Math.min(this.maxTemp, value));
  }

  reset(initialTemp = 25.0) {
    this.currentTemp = initialTemp;
  }
}
