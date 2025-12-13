/**
 * Exporters
 *
 * Multiple export formats for telemetry data:
 * - Prometheus (scrape endpoint)
 * - JSON (local files)
 * - OpenTelemetry (OTLP protocol)
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  Exporter,
  Metric,
  PrometheusConfig,
  JsonExporterConfig,
  OpenTelemetryConfig,
} from './types';

/**
 * Prometheus Exporter
 *
 * Exports metrics in Prometheus text format
 */
export class PrometheusExporter implements Exporter {
  private config: PrometheusConfig;
  private metricsCache: string = '';
  private lastUpdate: number = 0;

  constructor(config: PrometheusConfig) {
    this.config = config;
  }

  /**
   * Export metrics in Prometheus format
   */
  async export(metrics: Metric[]): Promise<void> {
    this.metricsCache = this.formatPrometheus(metrics);
    this.lastUpdate = Date.now();
  }

  /**
   * Format metrics in Prometheus exposition format
   */
  private formatPrometheus(metrics: Metric[]): string {
    const lines: string[] = [];
    const metricsByName = this.groupByName(metrics);

    for (const [name, metricsList] of metricsByName.entries()) {
      if (metricsList.length === 0) continue;

      const firstMetric = metricsList[0];

      // Add HELP text
      if (firstMetric.description) {
        lines.push(`# HELP ${name} ${firstMetric.description}`);
      }

      // Add TYPE
      lines.push(`# TYPE ${name} ${firstMetric.type}`);

      // Add metrics
      for (const metric of metricsList) {
        const labels = this.formatLabels(metric.labels);
        const metricLine = labels
          ? `${name}{${labels}} ${metric.value} ${metric.timestamp}`
          : `${name} ${metric.value} ${metric.timestamp}`;
        lines.push(metricLine);
      }

      lines.push(''); // Empty line between metric families
    }

    return lines.join('\n');
  }

  /**
   * Format labels for Prometheus
   */
  private formatLabels(labels: Record<string, string>): string {
    const pairs = Object.entries(labels).map(
      ([key, value]) => `${key}="${value.replace(/"/g, '\\"')}"`
    );
    return pairs.join(',');
  }

  /**
   * Group metrics by name
   */
  private groupByName(metrics: Metric[]): Map<string, Metric[]> {
    const grouped = new Map<string, Metric[]>();
    for (const metric of metrics) {
      const existing = grouped.get(metric.name) || [];
      existing.push(metric);
      grouped.set(metric.name, existing);
    }
    return grouped;
  }

  /**
   * Get metrics endpoint path
   */
  getMetricsEndpoint(): string {
    return this.metricsCache;
  }

  /**
   * Get last update timestamp
   */
  getLastUpdate(): number {
    return this.lastUpdate;
  }

  async shutdown(): Promise<void> {
    this.metricsCache = '';
  }
}

/**
 * JSON Exporter
 *
 * Exports metrics to local JSON files with rotation
 */
export class JSONExporter implements Exporter {
  private config: JsonExporterConfig;
  private currentFile: string = '';
  private rotationTimer: NodeJS.Timeout | null = null;

  constructor(config: JsonExporterConfig) {
    this.config = config;
    this.ensureOutputDir();
    this.setupRotation();
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.config.outputDir)) {
      fs.mkdirSync(this.config.outputDir, { recursive: true });
    }
  }

  /**
   * Setup file rotation
   */
  private setupRotation(): void {
    this.rotateFile();
    this.rotationTimer = setInterval(() => {
      this.rotateFile();
      this.cleanupOldFiles();
    }, this.config.rotateInterval);
  }

  /**
   * Rotate to a new file
   */
  private rotateFile(): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    this.currentFile = path.join(this.config.outputDir, `metrics-${timestamp}.json`);
  }

  /**
   * Clean up old files
   */
  private cleanupOldFiles(): void {
    const files = fs.readdirSync(this.config.outputDir)
      .filter((f) => f.startsWith('metrics-') && f.endsWith('.json'))
      .map((f) => ({
        name: f,
        path: path.join(this.config.outputDir, f),
        mtime: fs.statSync(path.join(this.config.outputDir, f)).mtime.getTime(),
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // Delete files beyond maxFiles limit
    for (let i = this.config.maxFiles; i < files.length; i++) {
      try {
        fs.unlinkSync(files[i].path);
      } catch (error) {
        console.error(`Failed to delete old metrics file: ${files[i].path}`, error);
      }
    }
  }

  /**
   * Export metrics to JSON file
   */
  async export(metrics: Metric[]): Promise<void> {
    const data = {
      timestamp: new Date().toISOString(),
      metrics,
      count: metrics.length,
    };

    try {
      fs.writeFileSync(this.currentFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to write metrics to JSON file:', error);
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    if (this.rotationTimer) {
      clearInterval(this.rotationTimer);
      this.rotationTimer = null;
    }
  }
}

/**
 * OpenTelemetry Exporter
 *
 * Exports metrics via OTLP protocol
 */
export class OpenTelemetryExporter implements Exporter {
  private config: OpenTelemetryConfig;

  constructor(config: OpenTelemetryConfig) {
    this.config = config;
  }

  /**
   * Export metrics via OTLP
   */
  async export(metrics: Metric[]): Promise<void> {
    const payload = this.formatOTLP(metrics);

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`OTLP export failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to export metrics via OTLP:', error);
      throw error;
    }
  }

  /**
   * Format metrics in OTLP JSON format
   */
  private formatOTLP(metrics: Metric[]): any {
    const resourceMetrics = {
      resource: {
        attributes: [
          {
            key: 'service.name',
            value: { stringValue: 'golden-armada' },
          },
          {
            key: 'service.version',
            value: { stringValue: '1.0.0' },
          },
        ],
      },
      scopeMetrics: [
        {
          scope: {
            name: 'golden-armada-telemetry',
            version: '1.0.0',
          },
          metrics: this.groupAndFormatMetrics(metrics),
        },
      ],
    };

    return {
      resourceMetrics: [resourceMetrics],
    };
  }

  /**
   * Group and format metrics by name and type
   */
  private groupAndFormatMetrics(metrics: Metric[]): any[] {
    const metricsByName = new Map<string, Metric[]>();

    for (const metric of metrics) {
      const existing = metricsByName.get(metric.name) || [];
      existing.push(metric);
      metricsByName.set(metric.name, existing);
    }

    const formattedMetrics: any[] = [];

    for (const [name, metricsList] of metricsByName.entries()) {
      if (metricsList.length === 0) continue;

      const firstMetric = metricsList[0];
      const metricData: any = {
        name,
        description: firstMetric.description || '',
        unit: firstMetric.unit || '',
      };

      switch (firstMetric.type) {
        case 'counter':
          metricData.sum = {
            dataPoints: metricsList.map((m) => this.createDataPoint(m)),
            aggregationTemporality: 2, // CUMULATIVE
            isMonotonic: true,
          };
          break;

        case 'gauge':
          metricData.gauge = {
            dataPoints: metricsList.map((m) => this.createDataPoint(m)),
          };
          break;

        case 'histogram':
          // Simplified histogram representation
          metricData.histogram = {
            dataPoints: metricsList.map((m) => ({
              ...this.createDataPoint(m),
              count: 1,
              sum: m.value,
            })),
            aggregationTemporality: 2, // CUMULATIVE
          };
          break;

        case 'summary':
          metricData.summary = {
            dataPoints: metricsList.map((m) => this.createDataPoint(m)),
          };
          break;
      }

      formattedMetrics.push(metricData);
    }

    return formattedMetrics;
  }

  /**
   * Create OTLP data point
   */
  private createDataPoint(metric: Metric): any {
    return {
      attributes: Object.entries(metric.labels).map(([key, value]) => ({
        key,
        value: { stringValue: value },
      })),
      timeUnixNano: metric.timestamp * 1000000,
      asDouble: metric.value,
    };
  }

  async shutdown(): Promise<void> {
    // No cleanup needed for HTTP exporter
  }
}

/**
 * Multi-Exporter
 *
 * Exports metrics to multiple destinations simultaneously
 */
export class MultiExporter implements Exporter {
  private exporters: Exporter[];

  constructor(exporters: Exporter[]) {
    this.exporters = exporters;
  }

  async export(metrics: Metric[]): Promise<void> {
    await Promise.all(this.exporters.map((exporter) => exporter.export(metrics)));
  }

  async shutdown(): Promise<void> {
    await Promise.all(this.exporters.map((exporter) => exporter.shutdown()));
  }
}
