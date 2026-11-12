-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BUSINESS', 'CUSTOMER', 'AGENT', 'CONSULTANT', 'ACCOUNT_MANAGER', 'PARTNER', 'ADMIN');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "mcom_user_id" TEXT,
    "email" TEXT NOT NULL,
    "first_name" TEXT,
    "last_name" TEXT,
    "full_name" TEXT,
    "display_name" TEXT,
    "job_title" TEXT,
    "avatar_url" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "postcode" TEXT,
    "country" TEXT,
    "role" "UserRole" NOT NULL,
    "profile_type" TEXT,
    "is_affiliate" BOOLEAN NOT NULL DEFAULT false,
    "business_id" TEXT,
    "business_name" TEXT,
    "membership_level" TEXT,
    "membership_tier" TEXT,
    "membership_status" TEXT,
    "membership_plan_name" TEXT,
    "membership_expires_at" TIMESTAMP(3),
    "trial_access_expires_at" TIMESTAMP(3),
    "business_profile" JSONB,
    "customer_profile" JSONB,
    "agent_profile" JSONB,
    "consultant_profile" JSONB,
    "account_manager_profile" JSONB,
    "entitlement" JSONB,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_mcom_user_id_key" ON "users"("mcom_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");
