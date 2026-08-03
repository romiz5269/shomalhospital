import { AxiosRequestConfig } from "axios";

export interface HttpRequest extends AxiosRequestConfig {}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
}
