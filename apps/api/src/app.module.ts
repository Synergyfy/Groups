import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { fileURLToPath } from "node:url";
import { AdminModule } from "./admin/admin.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { BusinessModule } from "./business/business.module.js";
import { ChatModule } from "./chat/chat.module.js";
import { ConsumerModule } from "./consumer/consumer.module.js";
import { ContactsModule } from "./contacts/contact-onboarding.module.js";
import { GroupsModule } from "./groups/groups.module.js";
import { HealthModule } from "./health/health.module.js";
import { MailModule } from "./mail/mail.module.js";
import { McomModule } from "./mcom/mcom.module.js";
import { MembershipSyncModule } from "./membership-sync/membership-sync.module.js";
import { PaymentsModule } from "./payments/payments.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { ProfileSyncModule } from "./profile-sync/profile-sync.module.js";
import { SystemModule } from "./system/system.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [
        fileURLToPath(new URL("../../../.env", import.meta.url)),
        fileURLToPath(new URL("../.env", import.meta.url)),
      ],
    }),
    PrismaModule,
    HealthModule,
    GroupsModule,
    McomModule,
    MailModule,
    ContactsModule,
    AuthModule,
    AdminModule,
    BusinessModule,
    ChatModule,
    ConsumerModule,
    PaymentsModule,
    ProfileSyncModule,
    MembershipSyncModule,
    SystemModule,
  ],
})
export class AppModule {}
