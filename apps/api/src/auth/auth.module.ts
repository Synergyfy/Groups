import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ContactsModule } from "../contacts/contact-onboarding.module.js";
import { McomModule } from "../mcom/mcom.module.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { AuthController } from "./auth.controller.js";
import { AuthService } from "./auth.service.js";
import { CentralSessionService } from "./central-session.service.js";
import { JwtAuthGuard } from "./jwt-auth.guard.js";

@Module({
  imports: [
    McomModule,
    ContactsModule,
    PrismaModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("AUTH_JWT_SECRET"),
        signOptions: {
          expiresIn: Number(
            config.get<string>("AUTH_SESSION_TTL_SECONDS", "28800"),
          ),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, CentralSessionService],
  exports: [AuthService, JwtAuthGuard, CentralSessionService, JwtModule],
})
export class AuthModule {}
