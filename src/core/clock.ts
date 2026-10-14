export interface Clock {
  nowIso(): string;
  nowMs(): number;
}

export const systemClock: Clock = {
  nowIso: () => new Date().toISOString(),
  nowMs: () => Date.now(),
};

export class FrozenClock implements Clock {
  constructor(private ms: number) {}

  nowIso(): string {
    return new Date(this.ms).toISOString();
  }

  nowMs(): number {
    return this.ms;
  }

  advance(ms: number): void {
    this.ms += ms;
  }

  set(ms: number): void {
    this.ms = ms;
  }
}
