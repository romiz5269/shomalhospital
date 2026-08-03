import jwt from "jsonwebtoken";

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
}

export class JwtService {
  verify(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_PUBLIC_KEY!) as JwtPayload;
  }
}

export const jwtService = new JwtService();
