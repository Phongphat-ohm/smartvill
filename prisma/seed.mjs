import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });

const roles = [
  ["system_admin", "ผู้ดูแลระบบ"],
  ["village_head", "ผู้ใหญ่บ้าน"],
  ["registry", "งานทะเบียน"],
  ["water_operator", "งานประปา"],
  ["finance_operator", "การเงินและกองทุน"],
  ["shop_operator", "ร้านค้า"],
  ["auditor", "ผู้ตรวจสอบ"],
];

const permissions = [
  "dashboard.view",
  "registry.household.view", "registry.household.create", "registry.household.update", "registry.resident.view", "registry.resident.create", "registry.resident.update", "registry.resident.sensitive.read",
  "water.reading.view", "water.reading.create", "water.reading.review", "water.invoice.view", "water.invoice.create", "water.payment.create", "water.payment.adjust", "water.tariff.manage",
  "fund.view", "fund.transaction.create", "fund.transaction.approve", "fund.member.manage", "loan.view", "loan.apply", "loan.approve", "loan.payment.create", "loan.product.manage",
  "store.view", "store.product.manage", "store.sale.create", "store.sale.refund", "store.stock.adjust",
  "reports.view", "reports.export", "users.manage", "users.invite", "roles.manage", "settings.manage", "audit.view",
];

const all = new Set(permissions);
const grants = {
  system_admin: all,
  village_head: new Set(permissions.filter((key) => !key.endsWith("sensitive.read"))),
  registry: new Set(["dashboard.view", ...permissions.filter((key) => key.startsWith("registry.") && !key.endsWith("sensitive.read"))]),
  water_operator: new Set(["dashboard.view", ...permissions.filter((key) => key.startsWith("water.") && !key.endsWith("tariff.manage"))]),
  finance_operator: new Set(["dashboard.view", ...permissions.filter((key) => key.startsWith("fund.") || key.startsWith("loan.") || key === "reports.view" || key === "reports.export")]),
  shop_operator: new Set(["dashboard.view", ...permissions.filter((key) => key.startsWith("store.") || key === "reports.view")]),
  auditor: new Set(["dashboard.view", ...permissions.filter((key) => key.endsWith(".view") || key === "audit.view" || key === "reports.export")]),
};

try {
  for (const [id, name] of roles) await prisma.role.upsert({ where: { id }, create: { id, name, isSystem: true }, update: { name, isSystem: true } });
  for (const key of permissions) await prisma.permission.upsert({ where: { key }, create: { key }, update: {} });
  for (const [roleId, rolePermissions] of Object.entries(grants)) {
    for (const permissionKey of rolePermissions) {
      await prisma.rolePermission.upsert({ where: { roleId_permissionKey: { roleId, permissionKey } }, create: { roleId, permissionKey }, update: {} });
    }
  }
  await prisma.villageSettings.upsert({ where: { id: 1 }, create: { id: 1, name: "หมู่บ้านสมาร์ทวิลล์" }, update: {} });
  console.log("Seeded default roles, permissions, and village settings.");
} finally {
  await prisma.$disconnect();
}
