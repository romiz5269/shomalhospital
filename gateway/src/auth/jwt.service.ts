import jwt, { JwtPayload as StdPayload } from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  sessionId?: string;
  jti?: string;
  type?: string;
  exp?: number;
}

function normalizePublicKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

export class JwtService {
  verify(token: string): JwtPayload {
    const publicKey = process.env.JWT_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error("JWT_PUBLIC_KEY is not set");
    }

    const decoded = jwt.verify(token, normalizePublicKey(publicKey), {
      algorithms: ["RS256"],
    }) as StdPayload & JwtPayload;

    if (decoded.type && decoded.type !== "access") {
      throw new Error("Invalid token type");
    }

    return {
      sub: String(decoded.sub),
      email: decoded.email ?? "",
      role: decoded.role,
      permissions: decoded.permissions ?? [],
      sessionId: decoded.sessionId,
      jti: decoded.jti,
      type: decoded.type,
      exp: typeof decoded.exp === "number" ? decoded.exp : undefined,
    };
  }
}

export const jwtService = new JwtService();
