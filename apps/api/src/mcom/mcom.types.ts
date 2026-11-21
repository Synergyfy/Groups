import type { Request } from "express";
import type { JWTPayload } from "jose";

export interface ServiceCaller {
  callerAppId: string;
  isDelegated: boolean;
  userId?: string;
  scopes: string[];
  payload: JWTPayload;
}

export interface AuthenticatedServiceRequest extends Request {
  serviceCaller?: ServiceCaller;
}

export interface McomServiceEntry {
  clientId: string;
  name?: string;
  baseUrl?: string;
  allowedCallers?: string[];
  allowedAudiences?: string[];
}

/** A Central Hub rejected the canonical profile lookup. */
export class McomProfileLookupError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "McomProfileLookupError";
  }
}
