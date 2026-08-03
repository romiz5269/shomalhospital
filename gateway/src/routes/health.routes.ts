import { Router } from "express";
import { healthController } from "../modules/health/controller.js";

const router = Router();

router.get("/", healthController);

export default router;
