import { globalConfig } from "./config";

interface MetricData {
  url: string;
  method: string;
  startTime: number;
  endTime: number;
  duration: number;
  status?: number;
  success: boolean;
  encrypted?: boolean;
  graphql?: boolean;
  requestSize?: number;
  responseSize?: number;
}

export function recordMetrics(data: MetricData) {
  if (!globalConfig.metrics?.enabled) return;

  const metric = {
    ...data,
    timestamp: new Date().toISOString(),
  };

  if (globalConfig.metrics.logToConsole) {
    console.log("[WebLattice Metrics]", metric);
  }

  // Here you could add additional metric reporting logic
  // such as sending to a metrics service
}
