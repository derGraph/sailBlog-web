export class RequestTimings {
  readonly durations: Record<string, number> = {};
  private readonly running = new Map<symbol, { name: string; start: number }>();

  async measure<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const span = Symbol(name);
    this.running.set(span, { name, start });
    try {
      return await operation();
    } finally {
      this.running.delete(span);
      this.durations[name] = (this.durations[name] ?? 0) + performance.now() - start;
    }
  }

  toHeader() {
    return Object.entries(this.durations)
      .map(([name, duration]) => `${name};dur=${duration.toFixed(1)}`)
      .join(', ');
  }

  snapshot() {
    const now = performance.now();
    const activeMs: Record<string, number> = {};
    for (const { name, start } of this.running.values()) {
      activeMs[name] = Math.max(activeMs[name] ?? 0, now - start);
    }
    return { completedMs: { ...this.durations }, activeMs };
  }
}

export function watchRequest(
  timings: RequestTimings,
  context: { method: string; path: string; rayId: string | null }
) {
  const startedAt = performance.now();
  // Log before a reverse proxy can time out, without interrupting the database operation.
  const timer = setTimeout(() => {
    console.warn('Request still running after 10s:', {
      ...context,
      elapsedMs: performance.now() - startedAt,
      ...timings.snapshot()
    });
  }, 10_000);
  timer.unref();
  return () => clearTimeout(timer);
}
