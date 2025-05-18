import type { Environment } from './types';

export interface NetworkConfig {
  baseUrl: string;
  timeout?: number;
  headers?: Record<string, string>;
  environment?: Environment;
  encryption?: {
    enabled: boolean;
    secretKey?: string;
    useRemoteKeys?: boolean;
  };
  metrics?: {
    enabled: boolean;
    logToConsole?: boolean;
  };
  graphql?: {
    endpoint?: string;
  };
}

let globalConfig: NetworkConfig = {
  baseUrl: "",
  timeout: 10000,
  environment: 'DEV',
  encryption: {
    enabled: false,
  },
  metrics: {
    enabled: true,
    logToConsole: true,
  },
};

export function setNetworkConfig(config: Partial<NetworkConfig>) {
  globalConfig = {
    ...globalConfig,
    ...config,
  };
}

export function getNetworkConfig(): NetworkConfig {
  return globalConfig;
}

export { globalConfig };
