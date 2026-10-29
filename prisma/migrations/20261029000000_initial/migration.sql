-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "HouseholdType" AS ENUM ('residential', 'commercial', 'mixed');

-- CreateEnum
CREATE TYPE "OccupancyStatus" AS ENUM ('occupied', 'vacant', 'archived');

-- CreateEnum
CREATE TYPE "ResidencyStatus" AS ENUM ('resident', 'moved_in', 'moved_out', 'deceased');

-- CreateEnum
CREATE TYPE "TariffMode" AS ENUM ('flat', 'progressive');

-- CreateEnum
CREATE TYPE "ReadingStatus" AS ENUM ('recorded', 'needs_review', 'rejected');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('open', 'partially_paid', 'paid', 'overdue', 'needs_review', 'void');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('cash', 'transfer', 'other');

-- CreateEnum
CREATE TYPE "FundTransactionType" AS ENUM ('deposit', 'withdrawal', 'contribution', 'income', 'expense', 'loan_disbursement', 'loan_repayment', 'adjustment');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected', 'void');

-- CreateEnum
CREATE TYPE "LoanStatus" AS ENUM ('applied', 'pending_approval', 'approved', 'active', 'overdue', 'paid', 'rejected', 'void');

-- CreateEnum
CREATE TYPE "InterestMethod" AS ENUM ('flat', 'declining_balance');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('active', 'inactive', 'discontinued');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('completed', 'void_pending', 'voided', 'refunded');

-- CreateTable
CREATE TABLE "roles" (
    "id" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "key" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" VARCHAR(64) NOT NULL,
    "permission_key" VARCHAR(100) NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "username" VARCHAR(32) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(160) NOT NULL,
    "role_id" VARCHAR(64) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_invitations" (
    "id" UUID NOT NULL,
    "code_hash" CHAR(64) NOT NULL,
    "role_id" VARCHAR(64) NOT NULL,
    "created_by" UUID NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_by" UUID,
    "used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_rate_limits" (
    "bucket_key" CHAR(64) NOT NULL,
    "window_start" TIMESTAMPTZ(6) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "login_rate_limits_pkey" PRIMARY KEY ("bucket_key")
);

-- CreateTable
CREATE TABLE "village_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "name" VARCHAR(160) NOT NULL DEFAULT 'หมู่บ้าน',
    "moo" VARCHAR(40),
    "subdistrict" VARCHAR(100),
    "district" VARCHAR(100),
    "province" VARCHAR(100),
    "postal_code" VARCHAR(5),
    "max_monthly_water_use" DECIMAL(12,3) NOT NULL DEFAULT 100,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "village_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "households" (
    "id" UUID NOT NULL,
    "house_number" VARCHAR(40) NOT NULL,
    "moo" VARCHAR(40) NOT NULL,
    "road" VARCHAR(120),
    "subdistrict" VARCHAR(100) NOT NULL,
    "district" VARCHAR(100) NOT NULL,
    "province" VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(5) NOT NULL,
    "household_type" "HouseholdType" NOT NULL DEFAULT 'residential',
    "occupancy_status" "OccupancyStatus" NOT NULL DEFAULT 'occupied',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "households_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "residents" (
    "id" UUID NOT NULL,
    "first_name" VARCHAR(100) NOT NULL,
    "last_name" VARCHAR(100) NOT NULL,
    "national_id_ciphertext" TEXT,
    "national_id_lookup_hash" CHAR(64),
    "birth_date" DATE,
    "phone" VARCHAR(30),
    "residency_status" "ResidencyStatus" NOT NULL DEFAULT 'resident',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "residents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "household_memberships" (
    "id" UUID NOT NULL,
    "household_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "relationship" VARCHAR(80) NOT NULL,
    "is_head" BOOLEAN NOT NULL DEFAULT false,
    "move_in_at" DATE NOT NULL,
    "move_out_at" DATE,
    "move_reason" VARCHAR(255),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "household_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_connections" (
    "id" UUID NOT NULL,
    "account_number" VARCHAR(40) NOT NULL,
    "household_id" UUID NOT NULL,
    "account_name" VARCHAR(160) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "started_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_meters" (
    "id" UUID NOT NULL,
    "connection_id" UUID NOT NULL,
    "serial_number" VARCHAR(80),
    "size_mm" INTEGER NOT NULL,
    "installed_at" DATE NOT NULL,
    "removed_at" DATE,
    "start_reading" DECIMAL(12,3) NOT NULL DEFAULT 0,

    CONSTRAINT "water_meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meter_readings" (
    "id" UUID NOT NULL,
    "meter_id" UUID NOT NULL,
    "reading_date" DATE NOT NULL,
    "reading_value" DECIMAL(12,3) NOT NULL,
    "usage" DECIMAL(12,3),
    "status" "ReadingStatus" NOT NULL DEFAULT 'recorded',
    "note" TEXT,
    "recorded_by" UUID NOT NULL,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_plans" (
    "id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "meter_size_mm" INTEGER NOT NULL,
    "mode" "TariffMode" NOT NULL,
    "flat_rate_per_cubic_meter" DECIMAL(12,4),
    "service_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "due_days" INTEGER NOT NULL DEFAULT 15,
    "effective_from" DATE NOT NULL,
    "effective_until" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tariff_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff_tiers" (
    "id" UUID NOT NULL,
    "tariff_plan_id" UUID NOT NULL,
    "up_to_cubic_meters" DECIMAL(12,3),
    "rate_per_cubic_meter" DECIMAL(12,4) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tariff_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_invoices" (
    "id" UUID NOT NULL,
    "invoice_number" VARCHAR(40) NOT NULL,
    "connection_id" UUID NOT NULL,
    "meter_reading_id" UUID NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "usage" DECIMAL(12,3) NOT NULL,
    "service_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'open',
    "tariff_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "water_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_invoice_lines" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "description" VARCHAR(160) NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit_rate" DECIMAL(12,4) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "water_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "water_payments" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "receipt_number" VARCHAR(40) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "reference" VARCHAR(120),
    "received_by" UUID NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "idempotency_key" VARCHAR(100),

    CONSTRAINT "water_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "number_sequences" (
    "key" VARCHAR(40) NOT NULL,
    "prefix" VARCHAR(12) NOT NULL,
    "next_value" BIGINT NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "funds" (
    "id" UUID NOT NULL,
    "code" VARCHAR(24) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_accounts" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "account_type" VARCHAR(30) NOT NULL,
    "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_members" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "member_no" VARCHAR(40) NOT NULL,
    "joined_at" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "fund_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fund_transactions" (
    "id" UUID NOT NULL,
    "transaction_no" VARCHAR(40) NOT NULL,
    "fund_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "member_id" UUID,
    "type" "FundTransactionType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "created_by" UUID NOT NULL,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fund_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_products" (
    "id" UUID NOT NULL,
    "fund_id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "min_principal" DECIMAL(14,2) NOT NULL,
    "max_principal" DECIMAL(14,2) NOT NULL,
    "annual_rate_percent" DECIMAL(7,4) NOT NULL,
    "interest_method" "InterestMethod" NOT NULL,
    "max_term_months" INTEGER NOT NULL,
    "due_day" INTEGER NOT NULL DEFAULT 5,
    "grace_period_days" INTEGER NOT NULL DEFAULT 0,
    "late_fee_percent" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "min_guarantors" INTEGER NOT NULL DEFAULT 0,
    "max_guarantors" INTEGER NOT NULL DEFAULT 2,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "loan_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loans" (
    "id" UUID NOT NULL,
    "contract_no" VARCHAR(40) NOT NULL,
    "product_id" UUID NOT NULL,
    "borrower_id" UUID NOT NULL,
    "principal" DECIMAL(14,2) NOT NULL,
    "annual_rate" DECIMAL(7,4) NOT NULL,
    "interest_method" "InterestMethod" NOT NULL,
    "term_months" INTEGER NOT NULL,
    "status" "LoanStatus" NOT NULL DEFAULT 'applied',
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "issued_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),

    CONSTRAINT "loans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_guarantors" (
    "loan_id" UUID NOT NULL,
    "resident_id" UUID NOT NULL,
    "signed_at" TIMESTAMPTZ(6),

    CONSTRAINT "loan_guarantors_pkey" PRIMARY KEY ("loan_id","resident_id")
);

-- CreateTable
CREATE TABLE "loan_installments" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "installment_no" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "principal_due" DECIMAL(14,2) NOT NULL,
    "interest_due" DECIMAL(14,2) NOT NULL,
    "penalty_due" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "loan_installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "loan_payments" (
    "id" UUID NOT NULL,
    "loan_id" UUID NOT NULL,
    "installment_id" UUID,
    "receipt_number" VARCHAR(40) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "principal_paid" DECIMAL(14,2) NOT NULL,
    "interest_paid" DECIMAL(14,2) NOT NULL,
    "penalty_paid" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "method" "PaymentMethod" NOT NULL,
    "received_by" UUID NOT NULL,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "loan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "barcode" VARCHAR(80),
    "sku" VARCHAR(50) NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "category_id" UUID NOT NULL,
    "cost_price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "sale_price" DECIMAL(14,2) NOT NULL,
    "stock" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reorder_at" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "status" "ProductStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "movement_type" VARCHAR(30) NOT NULL,
    "reference" VARCHAR(80),
    "reason" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales" (
    "id" UUID NOT NULL,
    "receipt_number" VARCHAR(40) NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_amount" DECIMAL(14,2) NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'completed',
    "sold_by" UUID NOT NULL,
    "sold_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "void_reason" TEXT,

    CONSTRAINT "sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_items" (
    "id" UUID NOT NULL,
    "sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "product_name" VARCHAR(160) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "line_total" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_id" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entity_type" VARCHAR(80) NOT NULL,
    "entity_id" VARCHAR(80),
    "changes" JSONB,
    "reason" TEXT,
    "request_id" VARCHAR(100),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "staff_invitations_code_hash_key" ON "staff_invitations"("code_hash");

-- CreateIndex
CREATE INDEX "staff_invitations_expires_at_used_at_idx" ON "staff_invitations"("expires_at", "used_at");

-- CreateIndex
CREATE INDEX "households_house_number_idx" ON "households"("house_number");

-- CreateIndex
CREATE INDEX "households_occupancy_status_idx" ON "households"("occupancy_status");

-- CreateIndex
CREATE UNIQUE INDEX "households_house_number_moo_key" ON "households"("house_number", "moo");

-- CreateIndex
CREATE UNIQUE INDEX "residents_national_id_lookup_hash_key" ON "residents"("national_id_lookup_hash");

-- CreateIndex
CREATE INDEX "residents_last_name_first_name_idx" ON "residents"("last_name", "first_name");

-- CreateIndex
CREATE INDEX "residents_residency_status_idx" ON "residents"("residency_status");

-- CreateIndex
CREATE INDEX "household_memberships_household_id_move_out_at_idx" ON "household_memberships"("household_id", "move_out_at");

-- CreateIndex
CREATE INDEX "household_memberships_resident_id_move_out_at_idx" ON "household_memberships"("resident_id", "move_out_at");

-- CreateIndex
CREATE UNIQUE INDEX "water_connections_account_number_key" ON "water_connections"("account_number");

-- CreateIndex
CREATE INDEX "water_connections_household_id_status_idx" ON "water_connections"("household_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "water_meters_serial_number_key" ON "water_meters"("serial_number");

-- CreateIndex
CREATE INDEX "water_meters_connection_id_removed_at_idx" ON "water_meters"("connection_id", "removed_at");

-- CreateIndex
CREATE INDEX "meter_readings_meter_id_reading_date_idx" ON "meter_readings"("meter_id", "reading_date" DESC);

-- CreateIndex
CREATE INDEX "meter_readings_status_reading_date_idx" ON "meter_readings"("status", "reading_date");

-- CreateIndex
CREATE UNIQUE INDEX "meter_readings_meter_id_reading_date_key" ON "meter_readings"("meter_id", "reading_date");

-- CreateIndex
CREATE INDEX "tariff_plans_meter_size_mm_effective_from_effective_until_idx" ON "tariff_plans"("meter_size_mm", "effective_from", "effective_until");

-- CreateIndex
CREATE UNIQUE INDEX "tariff_tiers_tariff_plan_id_sort_order_key" ON "tariff_tiers"("tariff_plan_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "water_invoices_invoice_number_key" ON "water_invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "water_invoices_meter_reading_id_key" ON "water_invoices"("meter_reading_id");

-- CreateIndex
CREATE INDEX "water_invoices_status_due_date_idx" ON "water_invoices"("status", "due_date");

-- CreateIndex
CREATE INDEX "water_invoices_connection_id_period_end_idx" ON "water_invoices"("connection_id", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "water_payments_receipt_number_key" ON "water_payments"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "water_payments_idempotency_key_key" ON "water_payments"("idempotency_key");

-- CreateIndex
CREATE INDEX "water_payments_invoice_id_received_at_idx" ON "water_payments"("invoice_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "funds_code_key" ON "funds"("code");

-- CreateIndex
CREATE UNIQUE INDEX "fund_accounts_fund_id_name_key" ON "fund_accounts"("fund_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "fund_members_fund_id_member_no_key" ON "fund_members"("fund_id", "member_no");

-- CreateIndex
CREATE UNIQUE INDEX "fund_members_fund_id_resident_id_key" ON "fund_members"("fund_id", "resident_id");

-- CreateIndex
CREATE UNIQUE INDEX "fund_transactions_transaction_no_key" ON "fund_transactions"("transaction_no");

-- CreateIndex
CREATE INDEX "fund_transactions_fund_id_created_at_idx" ON "fund_transactions"("fund_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "fund_transactions_status_created_at_idx" ON "fund_transactions"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "loans_contract_no_key" ON "loans"("contract_no");

-- CreateIndex
CREATE INDEX "loans_status_applied_at_idx" ON "loans"("status", "applied_at");

-- CreateIndex
CREATE INDEX "loan_installments_due_date_status_idx" ON "loan_installments"("due_date", "status");

-- CreateIndex
CREATE UNIQUE INDEX "loan_installments_loan_id_installment_no_key" ON "loan_installments"("loan_id", "installment_no");

-- CreateIndex
CREATE UNIQUE INDEX "loan_payments_receipt_number_key" ON "loan_payments"("receipt_number");

-- CreateIndex
CREATE INDEX "loan_payments_loan_id_received_at_idx" ON "loan_payments"("loan_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_name_key" ON "product_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "products_barcode_key" ON "products"("barcode");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "products_name_idx" ON "products"("name");

-- CreateIndex
CREATE INDEX "products_status_stock_idx" ON "products"("status", "stock");

-- CreateIndex
CREATE INDEX "inventory_movements_product_id_created_at_idx" ON "inventory_movements"("product_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "sales_receipt_number_key" ON "sales"("receipt_number");

-- CreateIndex
CREATE INDEX "sales_sold_at_idx" ON "sales"("sold_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "permissions"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_invitations" ADD CONSTRAINT "staff_invitations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "household_memberships" ADD CONSTRAINT "household_memberships_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_connections" ADD CONSTRAINT "water_connections_household_id_fkey" FOREIGN KEY ("household_id") REFERENCES "households"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_meters" ADD CONSTRAINT "water_meters_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "water_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_meter_id_fkey" FOREIGN KEY ("meter_id") REFERENCES "water_meters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff_tiers" ADD CONSTRAINT "tariff_tiers_tariff_plan_id_fkey" FOREIGN KEY ("tariff_plan_id") REFERENCES "tariff_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_invoices" ADD CONSTRAINT "water_invoices_connection_id_fkey" FOREIGN KEY ("connection_id") REFERENCES "water_connections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_invoices" ADD CONSTRAINT "water_invoices_meter_reading_id_fkey" FOREIGN KEY ("meter_reading_id") REFERENCES "meter_readings"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_invoice_lines" ADD CONSTRAINT "water_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "water_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_payments" ADD CONSTRAINT "water_payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "water_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "water_payments" ADD CONSTRAINT "water_payments_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_accounts" ADD CONSTRAINT "fund_accounts_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_members" ADD CONSTRAINT "fund_members_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_members" ADD CONSTRAINT "fund_members_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "fund_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "fund_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_products" ADD CONSTRAINT "loan_products_fund_id_fkey" FOREIGN KEY ("fund_id") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "loan_products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loans" ADD CONSTRAINT "loans_borrower_id_fkey" FOREIGN KEY ("borrower_id") REFERENCES "fund_members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_guarantors" ADD CONSTRAINT "loan_guarantors_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_guarantors" ADD CONSTRAINT "loan_guarantors_resident_id_fkey" FOREIGN KEY ("resident_id") REFERENCES "residents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_installments" ADD CONSTRAINT "loan_installments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_fkey" FOREIGN KEY ("loan_id") REFERENCES "loans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "loan_installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales" ADD CONSTRAINT "sales_sold_by_fkey" FOREIGN KEY ("sold_by") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
