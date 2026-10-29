# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui, Supabase Auth and PostgreSQL, Prisma for schema/migrations/seed, npm.

## Users

Village staff working mainly at an office, with field staff using mobile phones. Initial roles are system administrator, village head, registry, water operations, finance/fund operator, shop operator, and auditor. Administrators configure module and action permissions.

## Product Purpose

One operational system for household and resident records, village water service, fund and finance operations, and a village shop. Success means staff can maintain traceable records, complete daily work on desktop or mobile, and produce reliable bills, receipts, and reports.

## Positioning

Village records and service transactions share one household-linked source of truth and a consistent permission and audit model.

## Operating Context

One village, approximately 1,000–10,000 households. The application requires internet access. Staff use desktop computers for office work and phones for field workflows. The system starts without migrated records; the village configures it before entering real data.

## Capabilities and Constraints

- Release household/resident registry and water billing first; add finance/funds and lending, then shop/POS.
- Thai language is the default. Display dates in the Buddhist Era and store timestamps in a standard format using Asia/Bangkok.
- Staff accounts are invite-only. An invite is single-use and expires. The invitee chooses a username and password, verifies an email for recovery, and can log in with username or email.
- No public resident portal, online payment gateway, or offline workflow in the initial system.
- National ID numbers are encrypted at the application layer and access-controlled.
- Water tariffs support fixed and progressive tiers, rates by meter size, monthly cycles, partial payments, and audit-preserving corrections.
- Fund modules include loans with configurable flat or declining-balance interest, repayment schedules, guarantors, grace periods, and overdue charges.
- The shop includes product/barcode inventory and POS.
- Approval rules are configurable by module, transaction type, and amount. The person who creates a financial transaction cannot approve it.
- The app must run on a Node.js server host. No migration from a legacy database is planned.
- Production readiness includes daily backups, restore drills, authorization checks, and a PDPA review by the village's responsible data owner.

## Brand Commitments

There is no existing logo or brand guide. Use primary blue #008BF8 and a modern, restrained, clear operational interface. Avoid excessive decoration.

## Evidence on Hand

No initial records, logo, or brand assets were supplied. All demonstration records must be visibly identified as sample data.

## Product Principles

- Keep official records and money movements traceable.
- Put the next actionable task ahead of decoration.
- Protect sensitive personal data by default.
- Make office workflows efficient and field workflows usable on a phone.

## Accessibility & Inclusion

Thai-first copy, responsive layouts, keyboard access, visible focus, readable contrast, and forms that identify errors beside the affected field.
