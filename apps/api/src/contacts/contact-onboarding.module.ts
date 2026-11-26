import { Module } from "@nestjs/common";
import { ContactOnboardingService } from "./contact-onboarding.service.js";

@Module({
  providers: [ContactOnboardingService],
  exports: [ContactOnboardingService],
})
export class ContactsModule {}
