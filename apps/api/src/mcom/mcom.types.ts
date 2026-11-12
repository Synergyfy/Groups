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
