import { Request } from "express";
import { JWTPayload } from "./api.types";

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export {};
