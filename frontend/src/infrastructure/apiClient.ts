import type { ApiEnvelope, ApiRequestOptions } from "../domain/api-console.types";

export class ApiClient {
  constructor(private readonly getBaseUrl: () => string) {}

  async request(path: string, options: ApiRequestOptions = {}): Promise<ApiEnvelope> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (options.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    const response = await fetch(`${this.getBaseUrl()}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const text = await response.text();
    const data = (text ? JSON.parse(text) : {}) as ApiEnvelope;

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data;
  }
}
