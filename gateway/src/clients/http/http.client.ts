import axios, { AxiosInstance } from "axios";

export class HttpClient {
  private readonly client: AxiosInstance;

  constructor(baseURL: string) {
    this.client = axios.create({
      baseURL,
      timeout: 10000,
    });

    this.registerInterceptors();
  }

  private registerInterceptors() {
    this.client.interceptors.request.use((config) => {
      config.headers["x-gateway"] = "hospital-gateway";

      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      (error) => Promise.reject(error),
    );
  }

  get instance() {
    return this.client;
  }
}
