export interface IdGenerator {
  next(): string;
}

export const cryptoIds: IdGenerator = {
  next: () => crypto.randomUUID(),
};

export class SequentialIds implements IdGenerator {
  constructor(private n = 0) {}

  next(): string {
    this.n += 1;
    return `id-${this.n}`;
  }
}
