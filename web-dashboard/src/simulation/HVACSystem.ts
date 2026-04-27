import type { HVACMode, HVACSnapshot, TempSettings } from '../types';

const HVACModeValue = {
  OFF: 'OFF',
  HEATING: 'HEATING',
  COOLING: 'COOLING',
} as const;

export class HVACSystem {
  private mode: HVACMode;
  private targetTemperature: number;
  private powerPercentage: number;
  private powerConsumption: number;
  private heatingPowerMax: number;
  private coolingPowerMax: number;
  private standbyPower: number;
  private minimumPowerPercentage: number;
  private heatingTurnOn: number;
  private heatingTurnOff: number;
  private coolingTurnOn: number;
  private coolingTurnOff: number;
  private minRunSteps: number;
  private minOffSteps: number;
  private maxPowerStep: number;
  private minControlTemp: number;
  private maxControlTemp: number;
  private runSteps: number;
  private offSteps: number;

  constructor() {
    this.mode = HVACModeValue.OFF;
    this.targetTemperature = 25.0;
    this.powerPercentage = 0.0;
    this.powerConsumption = 0.0;

    this.heatingPowerMax = 6500.0;
    this.coolingPowerMax = 9000.0;
    this.standbyPower = 50.0;

    this.minimumPowerPercentage = 35.0;

    this.heatingTurnOn = 24.1;
    this.heatingTurnOff = this.targetTemperature;
    this.coolingTurnOn = 25.4;
    this.coolingTurnOff = this.targetTemperature;
    this.minRunSteps = 6;
    this.minOffSteps = 3;
    this.maxPowerStep = 12.0;

    this.minControlTemp = 22.0;
    this.maxControlTemp = 26.2;

    this.runSteps = 0;
    this.offSteps = this.minOffSteps;
  }

  calculateHvacPower(currentTemp: number, occupancy = 0): HVACMode {
    void occupancy;
    const desiredMode = this._calculateDesiredMode(currentTemp);
    this._applyModeTransition(desiredMode);

    let desiredPower = 0.0;
    if (this.mode === HVACModeValue.HEATING) {
      desiredPower = this._calculateHeatingPower(currentTemp);
    } else if (this.mode === HVACModeValue.COOLING) {
      desiredPower = this._calculateCoolingPower(currentTemp);
    }

    this._rampPower(desiredPower);
    this._updatePowerConsumption();
    return this.mode;
  }

  private _calculateDesiredMode(currentTemp: number): HVACMode {
    if (currentTemp <= this.heatingTurnOn && currentTemp < this.targetTemperature) {
      return HVACModeValue.HEATING;
    }
    if (currentTemp >= this.coolingTurnOn && currentTemp > this.targetTemperature) {
      return HVACModeValue.COOLING;
    }

    if (this.mode === HVACModeValue.HEATING && currentTemp < this.heatingTurnOff) {
      return HVACModeValue.HEATING;
    }
    if (this.mode === HVACModeValue.COOLING && currentTemp > this.coolingTurnOff) {
      return HVACModeValue.COOLING;
    }

    return HVACModeValue.OFF;
  }

  private _applyModeTransition(desiredMode: HVACMode) {
    if (this.mode === HVACModeValue.OFF) {
      this.offSteps += 1;
      this.runSteps = 0;
      if (desiredMode !== HVACModeValue.OFF && this.offSteps >= this.minOffSteps) {
        this.mode = desiredMode;
        this.runSteps = 0;
        this.offSteps = 0;
      }
      return;
    }

    this.runSteps += 1;

    if (desiredMode === this.mode) return;

    if (desiredMode === HVACModeValue.OFF) {
      if (this.runSteps >= this.minRunSteps) {
        this.mode = HVACModeValue.OFF;
        this.runSteps = 0;
        this.offSteps = 0;
      }
      return;
    }

    if (this.runSteps >= this.minRunSteps && this.powerPercentage <= this.minimumPowerPercentage) {
      this.mode = desiredMode;
      this.runSteps = 0;
      this.offSteps = 0;
    }
  }

  private _calculateHeatingPower(currentTemp: number): number {
    const tempRange = Math.max(this.heatingTurnOff - this.minControlTemp, 0.1);
    const currentRange = Math.max(this.heatingTurnOff - currentTemp, 0.0);
    const power = (currentRange / tempRange) * 100.0;
    return Math.min(100.0, Math.max(this.minimumPowerPercentage, power));
  }

  private _calculateCoolingPower(currentTemp: number): number {
    const tempRange = Math.max(this.maxControlTemp - this.coolingTurnOff, 0.1);
    const currentRange = Math.max(currentTemp - this.coolingTurnOff, 0.0);
    const power = (currentRange / tempRange) * 100.0;
    if (currentTemp <= this.targetTemperature + 0.2) {
      return Math.min(100.0, Math.max(0.0, power));
    }
    return Math.min(100.0, Math.max(this.minimumPowerPercentage, power));
  }

  private _rampPower(desiredPower: number) {
    if (this.mode === HVACModeValue.OFF) {
      this.powerPercentage = Math.max(0.0, this.powerPercentage - this.maxPowerStep);
      return;
    }

    const delta = desiredPower - this.powerPercentage;
    if (Math.abs(delta) <= this.maxPowerStep) {
      this.powerPercentage = desiredPower;
    } else if (delta > 0) {
      this.powerPercentage += this.maxPowerStep;
    } else {
      this.powerPercentage -= this.maxPowerStep;
    }
  }

  private _updatePowerConsumption() {
    if (this.mode === HVACModeValue.HEATING) {
      this.powerConsumption = (this.powerPercentage / 100.0) * this.heatingPowerMax;
    } else if (this.mode === HVACModeValue.COOLING) {
      this.powerConsumption = (this.powerPercentage / 100.0) * this.coolingPowerMax;
    } else {
      this.powerConsumption = this.standbyPower;
    }
  }

  getMode(): HVACMode {
    return this.mode;
  }

  getPowerConsumption(): number {
    return this.powerConsumption;
  }

  getPowerPercentage(): number {
    return Math.round(this.powerPercentage * 10) / 10;
  }

  setThresholds({ targetTemp, heatingTurnOn, coolingTurnOn }: Partial<TempSettings>) {
    if (targetTemp !== undefined) {
      this.targetTemperature = targetTemp;
    }
    if (heatingTurnOn !== undefined) {
      this.heatingTurnOn = heatingTurnOn;
      this.minControlTemp = heatingTurnOn - 2.1;
    }
    if (coolingTurnOn !== undefined) {
      this.coolingTurnOn = coolingTurnOn;
      this.maxControlTemp = coolingTurnOn + 0.8;
    }

    this.heatingTurnOff = this.targetTemperature;
    this.coolingTurnOff = this.targetTemperature;
  }

  getThresholds(): TempSettings {
    return {
      targetTemp: this.targetTemperature,
      heatingTurnOn: this.heatingTurnOn,
      coolingTurnOn: this.coolingTurnOn,
    };
  }

  getSnapshot(): HVACSnapshot {
    return {
      mode: this.mode,
      powerPercentage: this.powerPercentage,
      runSteps: this.runSteps,
      offSteps: this.offSteps,
      targetTemperature: this.targetTemperature,
      heatingTurnOn: this.heatingTurnOn,
      coolingTurnOn: this.coolingTurnOn,
    };
  }

  restoreSnapshot(snapshot: HVACSnapshot) {
    this.mode = snapshot.mode;
    this.powerPercentage = snapshot.powerPercentage;
    this.runSteps = snapshot.runSteps;
    this.offSteps = snapshot.offSteps;
    this.setThresholds({
      targetTemp: snapshot.targetTemperature,
      heatingTurnOn: snapshot.heatingTurnOn,
      coolingTurnOn: snapshot.coolingTurnOn,
    });
    this._updatePowerConsumption();
  }
}
