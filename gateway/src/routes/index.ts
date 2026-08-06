import { Router } from "express";
import { registry } from "../proxy/registry.js";
import { registerProxies } from "../proxy/register-proxies.js";

export function createRouter() {
  const router = Router();

  registerProxies(router);

  return router;
}
