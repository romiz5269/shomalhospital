import helmet from "helmet";
import cors from "cors";
import compression from "compression";

export const securityMiddleware = [helmet(), cors(), compression()];
