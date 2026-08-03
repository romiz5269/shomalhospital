export interface ServiceDefinition {
  name: string;
  version:string;
  url: string;

  healthy: boolean;

  timeout: number;

  failures: number;

  latency: number;

  lastCheck?: number;
}