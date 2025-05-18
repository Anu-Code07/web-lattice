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
const sdk = initWebLattice({
  baseUrl: 'https://api.example.com',
  env: 'PROD'
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

## Complete Example

Here's a comprehensive example showing how to use the SDK with all its features:

```typescript
import { initWebLattice, gql } from 'web-lattice';

// Initialize SDK with all features
const sdk = initWebLattice({
  baseUrl: 'https://api.example.com',
  env: 'PROD',
  encryptionKey: 'your-secret-key',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  },
  useRemoteKeys: true,
  enableMetrics: true
});

// Example of a complete API interaction
async function userManagement() {
  try {
    // Create a user
    const createResponse = await sdk.post('/users', {
      name: 'John Doe',
      email: 'john@example.com'
    });

    if (!createResponse.success) {
      throw new Error(createResponse.error);
    }

    const userId = createResponse.data.id;

    // Get user details with GraphQL
    const GET_USER = gql`
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
          profile {
            bio
            avatar
          }
        }
      }
    `;

    const userResponse = await sdk.graphql(GET_USER, { id: userId });
    
    if (!userResponse.success) {
      throw new Error(userResponse.error);
    }

    console.log('User details:', userResponse.data);

    // Update user
    const updateResponse = await sdk.put(`/users/${userId}`, {
      name: 'John Updated',
      email: 'john.updated@example.com'
    });

    if (!updateResponse.success) {
      throw new Error(updateResponse.error);
    }

    console.log('User updated:', updateResponse.data);

  } catch (error) {
    console.error('Operation failed:', error);
  }
}
```

## Advanced Usage

### With Environment and Encryption

```typescript
// Production environment with encryption
const prodSdk = initWebLattice({
  baseUrl: 'https://api.example.com',
  env: 'PROD',
  encryptionKey: 'your-encryption-key',
  useRemoteKeys: true,
  enableMetrics: true
});

// UAT environment without encryption
const uatSdk = initWebLattice({
  baseUrl: 'https://api-uat.example.com',
  env: 'UAT',
  enableMetrics: true
});

// Development environment
const devSdk = initWebLattice({
  baseUrl: 'https://api-dev.example.com',
  env: 'DEV'
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
initWebLattice({
  baseUrl: string;
  env?: 'PROD' | 'UAT' | 'DEV';
  encryptionKey?: string;
  timeout?: number;
  headers?: Record<string, string>;
  useRemoteKeys?: boolean;
  enableMetrics?: boolean;
}): WebLattice
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
- `env`: Environment setting ('PROD' | 'UAT' | 'DEV')
- `encryptionKey`: Optional encryption key
- `timeout`: Request timeout in milliseconds
- `headers`: Default headers for all requests
- `useRemoteKeys`: Use remote key management
- `enableMetrics`: Enable performance metrics

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
