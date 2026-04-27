import type { LightState, LightStatus } from '../types';

export class LightSensor {
  frontLightOn: boolean;
  backLightOn: boolean;

  constructor() {
    this.frontLightOn = false;
    this.backLightOn = false;
  }

  /**
   * Öğrencilerin oturduğu pozisyonlara göre ön ve arka ışığı kontrol et
   * @param {Set} seatedPositions - Oturan kişilerin masa indeksleri
   * @param {number} totalDesks - Toplam masa sayısı
   * @param {number} cols - Sütun sayısı
   */
  checkLightNeed(seatedPositions: Set<number>, totalDesks: number, cols: number): LightState {
    const rows = Math.ceil(totalDesks / cols);
    const halfRow = Math.ceil(rows / 2);

    let frontOccupied = false;
    let backOccupied = false;

    for (const pos of seatedPositions) {
      const row = Math.floor(pos / cols);
      if (row < halfRow) {
        frontOccupied = true;
      } else {
        backOccupied = true;
      }
      if (frontOccupied && backOccupied) break;
    }

    this.frontLightOn = frontOccupied;
    this.backLightOn = backOccupied;

    return { front: this.frontLightOn, back: this.backLightOn };
  }

  getLightStatus(): LightStatus {
    if (this.frontLightOn && this.backLightOn) return 'BOTH';
    if (this.frontLightOn) return 'FRONT';
    if (this.backLightOn) return 'BACK';
    return 'OFF';
  }

  getLightCount(): number {
    return (this.frontLightOn ? 1 : 0) + (this.backLightOn ? 1 : 0);
  }

  isAnyLightOn(): boolean {
    return this.frontLightOn || this.backLightOn;
  }

  setState(front: boolean, back: boolean) {
    this.frontLightOn = front;
    this.backLightOn = back;
  }
}
