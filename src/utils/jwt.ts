import * as jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JWTPayload } from "../types/api.types";

export function signAccessToken(payload: JWTPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_EXPIRES_IN as unknown as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET as jwt.Secret, options);
}

export function signRefreshToken(payload: JWTPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as unknown as jwt.SignOptions['expiresIn'],
  };
  return jwt.sign(payload, env.JWT_SECRET as jwt.Secret, options);
}

export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET as jwt.Secret) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired token");
  }
}

export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET as jwt.Secret) as JWTPayload;
  } catch (error) {
    throw new Error("Invalid or expired refresh token");
  }
}

export function decodeToken(token: string): JWTPayload | null {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
}
