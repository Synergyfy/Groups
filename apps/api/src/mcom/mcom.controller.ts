import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { McomServiceAuthGuard } from "./mcom-service-auth.guard.js";
import { McomService } from "./mcom.service.js";
import type { AuthenticatedServiceRequest } from "./mcom.types.js";

@Controller("mcom")
export class McomController {
  constructor(private readonly mcomService: McomService) {}

  @Get("discovery")
  discovery() {
    return this.mcomService.getDiscovery();
  }

  @Get("services")
  services() {
    return this.mcomService.getServices();
  }

  @Get("service/health")
  @UseGuards(McomServiceAuthGuard)
  serviceHealth(@Req() request: AuthenticatedServiceRequest) {
    return {
      ok: true,
      service: process.env.MCOM_CLIENT_ID ?? "mcom-group",
      caller: request.serviceCaller?.callerAppId ?? null,
      delegated: request.serviceCaller?.isDelegated ?? false,
      scopes: request.serviceCaller?.scopes ?? [],
    };
  }
}
