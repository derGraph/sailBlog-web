export class RequestTimings {
  readonly durations: Record<string, number> = {};

  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await operation();
    } finally {
      this.durations[name] = (this.durations[name] ?? 0) + performance.now() - start;
    }
  }

  toHeader() {
    return Object.entries(this.durations)
      .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
      .join(', ');
  }
}
