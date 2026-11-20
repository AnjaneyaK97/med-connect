import { Request, Response, NextFunction } from 'express';

export class MetricsService {
  private static requestCounts = new Map<string, number>();
  private static requestDurations = new Map<string, number[]>();
  private static aiStageLatencies = new Map<string, number[]>();
  private static redFlagAlerts = 0;

  public static recordRequest(method: string, path: string, statusCode: number, durationMs: number): void {
    // Group parameterized paths to prevent cardinality explosion (e.g. /notes/:id -> /notes/:id)
    const normalizedPath = path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/(trg|cn|apt|cst|usr)-[a-z0-9_-]+/gi, '/:id');

    const key = `${method}_${normalizedPath}_${statusCode}`;
    const current = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, current + 1);

    const durations = this.requestDurations.get(normalizedPath) || [];
    durations.push(durationMs);
    if (durations.length > 100) durations.shift(); // keep sliding window
    this.requestDurations.set(normalizedPath, durations);
  }

  public static recordAiStage(stage: 'whisper_stt' | 'red_flag_screen' | 'rag_note_generation', durationMs: number): void {
    const list = this.aiStageLatencies.get(stage) || [];
    list.push(durationMs);
    if (list.length > 50) list.shift();
    this.aiStageLatencies.set(stage, list);
  }

  public static incrementRedFlag(): void {
    this.redFlagAlerts++;
  }

  public static metricsMiddleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const start = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - start;
        MetricsService.recordRequest(req.method, req.baseUrl + req.path, res.statusCode, duration);
      });
      next();
    };
  }

  public static getPrometheusMetrics(): string {
    const lines: string[] = [];

    // System uptime
    lines.push('# HELP mediconnect_uptime_seconds Total seconds since service startup.');
    lines.push('# TYPE mediconnect_uptime_seconds counter');
    lines.push(`mediconnect_uptime_seconds ${Math.round(process.uptime())}`);

    // HTTP Requests Total
    lines.push('# HELP mediconnect_http_requests_total Total HTTP requests handled by API gateway.');
    lines.push('# TYPE mediconnect_http_requests_total counter');
    for (const [key, count] of this.requestCounts.entries()) {
      const [method, path, status] = key.split('_');
      lines.push(`mediconnect_http_requests_total{method="${method}",path="${path}",status="${status}"} ${count}`);
    }

    // AI Pipeline Stage Durations
    lines.push('# HELP mediconnect_ai_stage_duration_ms Average duration of AI pipeline stages in milliseconds.');
    lines.push('# TYPE mediconnect_ai_stage_duration_ms gauge');
    for (const [stage, durations] of this.aiStageLatencies.entries()) {
      const avg = durations.length > 0 ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(2) : '0';
      lines.push(`mediconnect_ai_stage_duration_ms{stage="${stage}"} ${avg}`);
    }

    // Red-Flag Alerts Counter
    lines.push('# HELP mediconnect_red_flag_alerts_total Total life-threatening symptoms flagged by deterministic safety engine.');
    lines.push('# TYPE mediconnect_red_flag_alerts_total counter');
    lines.push(`mediconnect_red_flag_alerts_total ${this.redFlagAlerts}`);

    return lines.join('\n') + '\n';
  }
}
