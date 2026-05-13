/**
 * Structured server logs (stdout). Ship logs to your host aggregator or wrap with Sentry later.
 */
export type LogLevel = "info" | "warn" | "error";

export function serverLog(level: LogLevel, message: string, extra?: Record<string, unknown>) {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...extra,
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}
