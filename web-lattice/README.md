# Web Lattice SDK

A modern TypeScript SDK for making HTTP requests with advanced features like encryption, metrics, and GraphQL support.

## Features

- TypeScript support
- Promise-based API
- Automatic error handling
- Request/response encryption
- Performance metrics
- GraphQL support
- Query parameter handling
- Custom headers support
- Request/response interceptors
- Authentication handling
- Environment-based encryption (PROD/UAT/DEV)

## Installation

```bash
npm install web-lattice
```

## Basic Usage

```typescript
import { initWebLattice } from 'web-lattice';

// Initialize the SDK
const sdk = initWebLattice('https://api.example.com', {
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Make requests
async function example() {
  try {
    // GET request
    const getResponse = await sdk.get('/users');
    console.log(getResponse.data);

    // POST request
    const postResponse = await sdk.post('/users', {
      name: 'John Doe',
      email: 'john@example.com'
    });
    console.log(postResponse.data);

    // Request with options
    const response = await sdk.get('/users', {
      queryParams: { page: 1, limit: 10 },
      headers: { 'Custom-Header': 'value' },
      timeout: 5000
    });
    console.log(response.data);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Advanced Usage

### With Environment and Encryption

```typescript
// Production environment with encryption
const prodSdk = initWebLattice('https://api.example.com', 'your-encryption-key', {
  environment: 'PROD',
  useRemoteKeys: true,
  enableMetrics: true
});

// UAT environment without encryption
const uatSdk = initWebLattice('https://api-uat.example.com', undefined, {
  environment: 'UAT',
  enableMetrics: true
});

// Development environment
const devSdk = initWebLattice('https://api-dev.example.com', undefined, {
  environment: 'DEV'
});
```

### GraphQL Support

```typescript
import { gql } from 'web-lattice';

const query = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`;

const response = await sdk.graphql(query, { id: '123' });
```

### Error Handling

```typescript
const response = await sdk.get('/users');
if (!response.success) {
  console.error('Error:', response.error);
  console.error('Error Code:', response.errorCode);
  console.error('Status Code:', response.statusCode);
} else {
  console.log('Data:', response.data);
}
```

## API Reference

### Initialization

```typescript
initWebLattice(
  baseUrl: string,
  encryptionKey?: string,
  options?: {
    timeout?: number;
    headers?: Record<string, string>;
    useRemoteKeys?: boolean;
    enableMetrics?: boolean;
    environment?: 'PROD' | 'UAT' | 'DEV';
  }
): WebLattice
```

### Methods

- `get<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>`
- `post<T, R = any>(url: string, data: T, config?: ApiRequestConfig): Promise<ApiResponse<R>>`
- `put<T, R = any>(url: string, data: T, config?: ApiRequestConfig): Promise<ApiResponse<R>>`
- `patch<T, R = any>(url: string, data: T, config?: ApiRequestConfig): Promise<ApiResponse<R>>`
- `delete<T>(url: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>`
- `graphql<T, V = any>(query: string, variables?: V, config?: ApiRequestConfig): Promise<ApiResponse<T>>`

### Configuration Options

- `baseUrl`: Base URL for all requests
- `timeout`: Request timeout in milliseconds
- `headers`: Default headers for all requests
- `environment`: Environment setting ('PROD' | 'UAT' | 'DEV')
- `encryption`: Encryption configuration
  - `enabled`: Enable request/response encryption (automatically enabled in PROD)
  - `secretKey`: Encryption key
  - `useRemoteKeys`: Use remote key management
- `metrics`: Metrics configuration
  - `enabled`: Enable performance metrics
  - `logToConsole`: Log metrics to console

## Error Handling

The SDK provides detailed error information in the response:

```typescript
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  headers?: Record<string, string>;
  statusCode?: number;
  errorCode?: string;
}
```

## Security

- All requests can be encrypted using AES encryption
- Environment-based encryption (enabled by default in PROD)
- Support for remote key management
- Automatic token handling
- Secure header management

## Metrics

The SDK automatically collects performance metrics for all requests:

- Request duration
- Request/response sizes
- Success/failure rates
- Encryption status
- GraphQL vs REST requests

## License

MIT
