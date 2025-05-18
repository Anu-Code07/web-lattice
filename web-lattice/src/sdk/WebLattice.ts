import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosError,
  type AxiosResponse,
  AxiosHeaders,
} from "axios";
import type {
  WebLatticeConfig,
  RequestOptions,
  ApiResponse,
  QueryParams,
  Environment,
} from "./types";
import { globalConfig, setNetworkConfig, type NetworkConfig } from "./config";
import { recordMetrics } from "./metrics";
import { encryptData, decryptData, generateEncryptionKeys } from "./encryption";
import CryptoJS from "crypto-js";

export interface ApiRequestConfig extends Omit<AxiosRequestConfig, "params"> {
  baseUrl?: string;
  queryParams?: QueryParams;
  isGraphQL?: boolean;
}

// Storage for encryption keys
const requestKeys = new WeakMap<object, { aesKey: string; iv: string }>();

// Check if we're running in production mode with encryption enabled
const isProd = (config: NetworkConfig) => {
  return config.environment === 'PROD' && config.encryption?.enabled;
};

// Helper to extract URL and method from config for metrics
interface RequestMetadata {
  url: string;
  method: string;
}

const getRequestMetadata = (config: AxiosRequestConfig): RequestMetadata => {
  return {
    url: config.url || "",
    method: config.method?.toUpperCase() || "UNKNOWN",
  };
};


const getPublicKeyDetails = () => {
  const currentKey = globalConfig.encryption?.useRemoteKeys
    ? { id: "remote-key-id", key: "remote-key-value" }
    : { id: "local-key-id", key: globalConfig.encryption?.secretKey || "" };

  return { publicKey: currentKey.key, publicKey_id: currentKey.id };
};

const handleProductionSecurity = (config: AxiosRequestConfig) => {
  const { aesKey, iv } = generateEncryptionKeys();
  requestKeys.set(config, { aesKey, iv });

  if (config.data && typeof config.data === "object") {
    config.data = encryptData(config.data);
  }

  return { generatedAesKeyValue: aesKey, generatedIV: iv };
};

const updateHeadersWithEncryption = (
  config: AxiosRequestConfig,
  aesKey: string,
  iv: string,
  publicKey_id?: string
) => {
  const headers = new AxiosHeaders();
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  headers.set("x-encryption", "true");
  headers.set("x-encryption-key", aesKey);
  headers.set("x-encryption-iv", iv);
  if (publicKey_id) {
    headers.set("x-public-key-id", publicKey_id);
  }
  config.headers = headers;
};

const addCommonHeaders = (config: AxiosRequestConfig) => {
  const headers = new AxiosHeaders();
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      headers.set(key, value);
    });
  }
  headers.set(
    "x-correlation-id",
    `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
  );
  headers.set("x-client-version", "1.0.0");
  headers.set("x-app-platform", "web");
  config.headers = headers;
};

export class WebLattice {
  private client: AxiosInstance;
  private config: NetworkConfig;

  constructor(config: NetworkConfig) {
    this.config = config;
    setNetworkConfig(config);

    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout || 10000,
      transformRequest: [
        (data, headers) => {
          return isProd(config) ? JSON.stringify(data) : data;
        },
      ],
      headers: {
        ...config.headers,
        "Content-Type": "application/json",
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const startTime = Date.now();

        try {
          const accessToken = sessionStorage.getItem("accessToken");

          if (isProd(this.config)) {
            const { publicKey_id } = getPublicKeyDetails();
            const { generatedAesKeyValue, generatedIV } =
              handleProductionSecurity(config);
            updateHeadersWithEncryption(
              config,
              generatedAesKeyValue,
              generatedIV,
              publicKey_id
            );
          }

          if (accessToken) {
            const headers = new AxiosHeaders(config.headers);
            headers.set("Authorization", `Bearer ${accessToken}`);
            config.headers = headers;
          }

          addCommonHeaders(config);

          // Store start time for metrics
          (config as any)._startTime = startTime;

          // Store GraphQL flag for metrics
          const customConfig = config as unknown as ApiRequestConfig;
          (config as any)._isGraphQL = customConfig.isGraphQL || false;
        } catch (error) {
          console.error("Error in request interceptor:", error);
          return Promise.reject(error);
        }

        return config;
      },
      (error) => {
        console.error("Request error:", error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      async (response) => {
        const endTime = Date.now();
        const startTime = (response.config as any)._startTime || endTime;
        const isGraphQL = (response.config as any)._isGraphQL || false;
        const { url, method } = getRequestMetadata(response.config);

        try {
          if (isProd(this.config)) {
            const keys = requestKeys.get(response.config);
            if (keys) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { aesKey, iv } = keys;
              if (response.data && typeof response.data === "string") {
                const decryptedData = decryptData(response.data);
                try {
                  response.data = JSON.parse(decryptedData);
                } catch (parseError) {
                  console.error("Error parsing decrypted JSON:", parseError);
                  return Promise.reject(parseError);
                }
              }
            }
          }

          recordMetrics({
            url,
            method,
            startTime,
            endTime,
            duration: endTime - startTime,
            status: response.status,
            success: true,
            encrypted: isProd(this.config),
            graphql: isGraphQL,
            requestSize: JSON.stringify(response.config.data || {}).length,
            responseSize: JSON.stringify(response.data || {}).length,
          });

          return response;
        } catch (error) {
          console.error("Error in response decryption:", error);
          return Promise.reject(error);
        }
      },
      async (error: AxiosError) => {
        const endTime = Date.now();
        const config = error.config || {};
        const startTime = (config as any)?._startTime || endTime;
        const isGraphQL = (config as any)?._isGraphQL || false;
        const { url, method } = getRequestMetadata(config);

        try {
          if (isProd(this.config) && error.response?.data && error.config) {
            const keys = requestKeys.get(error.config);
            if (keys) {
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { aesKey, iv } = keys;
              if (typeof error.response.data === "string") {
                const decryptedData = decryptData(error.response.data);
                try {
                  error.response.data = JSON.parse(decryptedData);
                } catch (parseError) {
                  console.error("Error parsing decrypted error JSON:", parseError);
                }
              }
            }
          }

          recordMetrics({
            url,
            method,
            startTime,
            endTime,
            duration: endTime - startTime,
            status: error.response?.status,
            success: false,
            encrypted: isProd(this.config),
            graphql: isGraphQL,
          });

          if (error.response?.status === 401) {
            window.location.assign("/enter-email");
          } else if (
            error.response?.status &&
            error.response.status >= 500 &&
            error.response.status < 600
          ) {
            window.location.assign("/generic-error");
          }
        } catch (decryptError) {
          console.error("Error decrypting error response data:", decryptError);
        }

        return Promise.reject(error);
      }
    );
  }

  private constructUrl(url: string, queryParams: QueryParams = {}): string {
    const params = new URLSearchParams();
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });

    const queryString = params.toString();
    return queryString
      ? `${url}${url.includes("?") ? "&" : "?"}${queryString}`
      : url;
  }

  async get<T>(
    url: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { queryParams, isGraphQL, ...restConfig } = config;
      const finalUrl = this.constructUrl(url, queryParams);

      const axiosConfig: AxiosRequestConfig = {
        ...restConfig,
      };

      (axiosConfig as any).isGraphQL = isGraphQL;

      const response = await this.client.get<T>(finalUrl, axiosConfig);

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "An unknown error occurred",
        statusCode: error.response?.status || 500,
        errorCode: `ERR_${error.response?.status || "UNKNOWN"}`,
      };
    }
  }

  async post<T, R = any>(
    url: string,
    data: T,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<R>> {
    try {
      const { queryParams, isGraphQL, ...restConfig } = config;
      const finalUrl = this.constructUrl(url, queryParams);

      const axiosConfig: AxiosRequestConfig = {
        ...restConfig,
      };

      (axiosConfig as any).isGraphQL = isGraphQL;

      const response = await this.client.post<R>(finalUrl, data, axiosConfig);

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "An unknown error occurred",
        statusCode: error.response?.status || 500,
        errorCode: `ERR_${error.response?.status || "UNKNOWN"}`,
      };
    }
  }

  async put<T, R = any>(
    url: string,
    data: T,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<R>> {
    try {
      const { queryParams, isGraphQL, ...restConfig } = config;
      const finalUrl = this.constructUrl(url, queryParams);

      const axiosConfig: AxiosRequestConfig = {
        ...restConfig,
      };

      (axiosConfig as any).isGraphQL = isGraphQL;

      const response = await this.client.put<R>(finalUrl, data, axiosConfig);

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "An unknown error occurred",
        statusCode: error.response?.status || 500,
        errorCode: `ERR_${error.response?.status || "UNKNOWN"}`,
      };
    }
  }

  async patch<T, R = any>(
    url: string,
    data: T,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<R>> {
    try {
      const { queryParams, isGraphQL, ...restConfig } = config;
      const finalUrl = this.constructUrl(url, queryParams);

      const axiosConfig: AxiosRequestConfig = {
        ...restConfig,
      };

      (axiosConfig as any).isGraphQL = isGraphQL;

      const response = await this.client.patch<R>(finalUrl, data, axiosConfig);

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "An unknown error occurred",
        statusCode: error.response?.status || 500,
        errorCode: `ERR_${error.response?.status || "UNKNOWN"}`,
      };
    }
  }

  async delete<T>(
    url: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const { queryParams, isGraphQL, ...restConfig } = config;
      const finalUrl = this.constructUrl(url, queryParams);

      const axiosConfig: AxiosRequestConfig = {
        ...restConfig,
      };

      (axiosConfig as any).isGraphQL = isGraphQL;

      const response = await this.client.delete<T>(finalUrl, axiosConfig);

      return {
        success: true,
        data: response.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "An unknown error occurred",
        statusCode: error.response?.status || 500,
        errorCode: `ERR_${error.response?.status || "UNKNOWN"}`,
      };
    }
  }

  async graphql<T, V = any>(
    query: string,
    variables?: V,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    try {
      const endpoint = config.baseUrl || globalConfig.graphql?.endpoint || "";

      if (!endpoint) {
        throw new Error("GraphQL endpoint is not configured");
      }

      const axiosConfig: AxiosRequestConfig = {
        ...config,
      };

      (axiosConfig as any).isGraphQL = true;

      const response = await this.client.post<{ data: T }>(
        endpoint,
        {
          query,
          variables,
        },
        axiosConfig
      );

      return {
        success: true,
        data: response.data.data,
        statusCode: response.status,
        headers: response.headers as Record<string, string>,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "An unknown error occurred",
        statusCode: error.response?.status || 500,
        errorCode: `ERR_${error.response?.status || "UNKNOWN"}`,
      };
    }
  }
}

// Simple GraphQL tag function for syntax highlighting
export function gql(strings: TemplateStringsArray, ...values: any[]): string {
  return strings.reduce((result, str, i) => {
    return result + str + (values[i] || "");
  }, "");
}

export function initWebLattice(config: {
  baseUrl: string;
  env?: Environment;
  encryptionKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
  useRemoteKeys?: boolean;
  enableMetrics?: boolean;
}): WebLattice {
  const sdkConfig: NetworkConfig = {
    baseUrl: config.baseUrl,
    timeout: config.timeout || 10000,
    headers: config.headers,
    environment: config.env || 'DEV',
    encryption: {
      enabled: !!config.encryptionKey,
      secretKey: config.encryptionKey || "",
      useRemoteKeys: config.useRemoteKeys || false,
    },
    metrics: {
      enabled: config.enableMetrics !== false,
      logToConsole: true,
    },
  };

  return new WebLattice(sdkConfig);
}
