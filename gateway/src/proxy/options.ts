import { Options } from "http-proxy-middleware";
import { DEFAULT_TIMEOUT } from "./constants.js";

export const proxyOptions: Partial<Options> = {
  changeOrigin: true,
  xfwd: true,
  ws: true,
  timeout: DEFAULT_TIMEOUT,
  proxyTimeout: DEFAULT_TIMEOUT,
};
