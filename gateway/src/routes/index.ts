import { Router } from "express";
import { registerProxies } from "../proxy/register-proxies.js";
import { createOpsRouter } from "./ops.routes.js";

export function createRouter() {
  const router = Router();

  router.use("/ops", createOpsRouter());
  registerProxies(router);

  return router;
}
