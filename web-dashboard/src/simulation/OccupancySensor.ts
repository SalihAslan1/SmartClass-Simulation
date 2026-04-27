export class OccupancySensor {
  currentOccupancy: number;
  private maxCapacity: number;

  constructor(capacity = 30) {
    this.currentOccupancy = 0;
    this.maxCapacity = capacity;
  }

  addPerson(count = 1): boolean {
    if (this.currentOccupancy + count <= this.maxCapacity) {
      this.currentOccupancy += count;
      return true;
    }
    return false;
  }

  removePerson(count = 1): boolean {
    if (this.currentOccupancy - count >= 0) {
      this.currentOccupancy -= count;
      return true;
    }
    return false;
  }

  getOccupancy(): number {
    return this.currentOccupancy;
  }

  getOccupancyPercentage(): number {
    if (this.maxCapacity === 0) return 0;
    return Math.round((this.currentOccupancy / this.maxCapacity) * 10000) / 100;
  }

  getCapacity(): number {
    return this.maxCapacity;
  }

  setOccupancy(value: number) {
    this.currentOccupancy = Math.max(0, Math.min(this.maxCapacity, value));
  }
}
