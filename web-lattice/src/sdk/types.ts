export type Environment = 'PROD' | 'UAT' | 'DEV';

export interface WebLatticeConfig {
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

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  headers?: Record<string, string>;
  statusCode?: number;
  errorCode?: string;
}

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>;
