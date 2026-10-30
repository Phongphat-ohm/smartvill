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

const asDate = (value) => new Date(`${value}T00:00:00.000Z`);
const seedId = (group, index) => `${group.toString(16).padStart(8, "0")}-0000-4000-8000-${index.toString(16).padStart(12, "0")}`;

const demoHouseholds = [
  ["44/2", "4", "RESIDENTIAL"], ["72/1", "4", "RESIDENTIAL"], ["118", "5", "MIXED"],
  ["155", "5", "COMMERCIAL"], ["201/3", "6", "RESIDENTIAL"], ["8/7", "3", "RESIDENTIAL"],
  ["91", "4", "MIXED"], ["136/2", "5", "RESIDENTIAL"], ["174", "5", "COMMERCIAL"],
  ["225/4", "6", "RESIDENTIAL"], ["63", "4", "RESIDENTIAL"], ["240", "6", "RESIDENTIAL"],
];

const demoResidents = [
  ["สมชาย", "ใจดี", "0811111001"], ["กมลวรรณ", "แสงดี", "0811111002"],
  ["วิไลพร", "ใจมั่น", "0811111003"], ["สุชาติ", "แก้วใจ", "0811111004"],
  ["มานพ", "พูนผล", "0811111005"], ["อรุณี", "พรมมา", "0811111006"],
  ["ธนกร", "คำสุข", "0811111007"], ["สายฝน", "แก้วคำ", "0811111008"],
  ["ประเสริฐ", "บุญมี", "0811111009"], ["รัตนา", "พรหมรักษ์", "0811111010"],
  ["วราภรณ์", "ใจงาม", "0811111011"], ["บุญช่วย", "มีสุข", null],
];

const demoProducts = [
  ["ข้าวหอมมะลิ 5 กก.", "อาหารแห้ง", 145, 185, 24, 10],
  ["น้ำดื่ม 600 มล.", "เครื่องดื่ม", 4, 7, 8, 20],
  ["ไข่ไก่ เบอร์ 2", "ของสด", 3.2, 4, 66, 30],
  ["น้ำมันพืช 1 ลิตร", "อาหารแห้ง", 40, 48, 5, 8],
  ["น้ำปลา 700 มล.", "เครื่องปรุง", 23, 29, 18, 8],
  ["บะหมี่กึ่งสำเร็จรูป", "อาหารแห้ง", 5, 7, 42, 20],
  ["นมถั่วเหลือง 300 มล.", "เครื่องดื่ม", 9, 12, 6, 12],
  ["สบู่ก้อนสมุนไพร", "ของใช้", 18, 25, 14, 6],
  ["ผงซักฟอก 800 กรัม", "ของใช้", 44, 52, 9, 10],
  ["ปลากระป๋อง 155 กรัม", "อาหารแห้ง", 17, 22, 31, 12],
  ["กาแฟปรุงสำเร็จ 20 ซอง", "เครื่องดื่ม", 58, 69, 16, 8],
  ["น้ำตาลทราย 1 กก.", "อาหารแห้ง", 23, 28, 0, 10],
];

async function seedRegistry(actorId) {
  for (let index = 0; index < demoHouseholds.length; index++) {
    const [houseNumber, moo, householdType] = demoHouseholds[index];
    const householdId = seedId(1, index + 1);
    const residentId = seedId(2, index + 1);
    const isVacant = index === 11;
    const isDeceased = index === 11;
    await prisma.household.upsert({
      where: { id: householdId },
      create: { id: householdId, houseNumber, moo, subdistrict: "บ้านใหม่", district: "เมือง", province: "ขอนแก่น", postalCode: "40000", householdType, occupancyStatus: isVacant ? "VACANT" : "OCCUPIED", note: "ข้อมูลสาธิตจากระบบ seed" },
      update: { houseNumber, moo, householdType, occupancyStatus: isVacant ? "VACANT" : "OCCUPIED", note: "ข้อมูลสาธิตจากระบบ seed" },
    });
    const [firstName, lastName, phone] = demoResidents[index];
    await prisma.resident.upsert({
      where: { id: residentId },
      create: { id: residentId, firstName, lastName, phone, birthDate: asDate(`${1970 + index}-0${index % 9 + 1}-15`), residencyStatus: isDeceased ? "DECEASED" : index === 9 ? "MOVED_IN" : "RESIDENT", deceasedAt: isDeceased ? asDate("2026-10-10") : null, deathReason: isDeceased ? "ข้อมูลสาธิต: แจ้งโดยครอบครัว" : null },
      update: { firstName, lastName, phone, residencyStatus: isDeceased ? "DECEASED" : index === 9 ? "MOVED_IN" : "RESIDENT", deceasedAt: isDeceased ? asDate("2026-10-10") : null, deathReason: isDeceased ? "ข้อมูลสาธิต: แจ้งโดยครอบครัว" : null },
    });
    if (!isDeceased) {
      const isHead = index < 10;
      await prisma.householdMembership.upsert({
        where: { id: seedId(3, index + 1) },
        create: { id: seedId(3, index + 1), householdId, residentId, relationship: isHead ? "หัวหน้าครัวเรือน" : "ผู้อาศัย", isHead, moveInAt: asDate("2024-01-01") },
        update: { householdId, residentId, relationship: isHead ? "หัวหน้าครัวเรือน" : "ผู้อาศัย", isHead, moveInAt: asDate("2024-01-01"), moveOutAt: null, moveReason: null },
      });
      if (isHead) await prisma.householdHeadHistory.upsert({
        where: { id: seedId(4, index + 1) },
        create: { id: seedId(4, index + 1), householdId, residentId, startedAt: asDate("2024-01-01"), reason: "ข้อมูลเจ้าบ้านสาธิตจาก seed", changedBy: actorId },
        update: { householdId, residentId, startedAt: asDate("2024-01-01"), endedAt: null, reason: "ข้อมูลเจ้าบ้านสาธิตจาก seed", changedBy: actorId },
      });
    }
  }
}

async function seedWater(actorId) {
  for (let index = 0; index < 11; index++) {
    const householdId = seedId(1, index + 1);
    const connectionId = seedId(5, index + 1);
    const meterId = seedId(6, index + 1);
    const readingId = seedId(7, index + 1);
    const invoiceId = seedId(8, index + 1);
    const usage = [18, 33, 21, 66, 12, 15, 27, 10, 68, 13, 18][index];
    const needsReview = index === 1 || index === 3 || index === 8;
    const invoiceStatus = needsReview ? "NEEDS_REVIEW" : index === 2 || index === 10 ? "PARTIALLY_PAID" : index === 4 ? "OVERDUE" : index < 3 ? "PAID" : "OPEN";
    const totalAmount = usage * 9 + 20;
    const paidAmount = invoiceStatus === "PAID" ? totalAmount : invoiceStatus === "PARTIALLY_PAID" ? 100 : 0;
    await prisma.waterConnection.upsert({ where: { id: connectionId }, create: { id: connectionId, accountNumber: `DEMO-WC-${String(index + 1).padStart(3, "0")}`, householdId, accountName: `${demoResidents[index][0]} ${demoResidents[index][1]}`, startedAt: asDate("2024-01-01") }, update: { householdId, accountName: `${demoResidents[index][0]} ${demoResidents[index][1]}`, status: "ACTIVE" } });
    await prisma.waterMeter.upsert({ where: { id: meterId }, create: { id: meterId, connectionId, serialNumber: `DEMO-METER-${String(index + 1).padStart(3, "0")}`, sizeMm: 15, installedAt: asDate("2024-01-01"), startReading: 0 }, update: { connectionId, sizeMm: 15, removedAt: null } });
    await prisma.meterReading.upsert({ where: { id: readingId }, create: { id: readingId, meterId, readingDate: asDate("2026-10-29"), readingValue: 1000 + index * 100 + usage, usage, status: needsReview ? "NEEDS_REVIEW" : "RECORDED", note: needsReview ? "ข้อมูลสาธิต: ปริมาณใช้น้ำผิดปกติ" : "ข้อมูลสาธิต", recordedBy: actorId }, update: { readingValue: 1000 + index * 100 + usage, usage, status: needsReview ? "NEEDS_REVIEW" : "RECORDED", note: needsReview ? "ข้อมูลสาธิต: ปริมาณใช้น้ำผิดปกติ" : "ข้อมูลสาธิต" } });
    await prisma.waterInvoice.upsert({ where: { id: invoiceId }, create: { id: invoiceId, invoiceNumber: `DEMO-WT-69${String(index + 1).padStart(4, "0")}`, connectionId, meterReadingId: readingId, periodStart: asDate("2026-10-01"), periodEnd: asDate("2026-10-31"), dueDate: asDate("2026-11-04"), usage, serviceFee: 20, totalAmount, paidAmount, status: invoiceStatus, tariffSnapshot: { demo: true, rate: 9 }, lines: { create: [{ description: "ค่าน้ำประปา (ข้อมูลสาธิต)", quantity: usage, unitRate: 9, amount: usage * 9 }, { description: "ค่าบริการ", quantity: 1, unitRate: 20, amount: 20 }] } }, update: { usage, totalAmount, paidAmount, status: invoiceStatus, tariffSnapshot: { demo: true, rate: 9 } } });
    if (paidAmount > 0) await prisma.waterPayment.upsert({ where: { receiptNumber: `DEMO-RC-${String(index + 1).padStart(4, "0")}` }, create: { id: seedId(9, index + 1), invoiceId, receiptNumber: `DEMO-RC-${String(index + 1).padStart(4, "0")}`, amount: paidAmount, method: index % 2 ? "TRANSFER" : "CASH", reference: "ข้อมูลสาธิต", receivedBy: actorId, receivedAt: new Date("2026-10-30T03:00:00.000Z") }, update: { invoiceId, amount: paidAmount, receivedBy: actorId } });
  }
}

async function seedFunds(actorId) {
  const fundId = seedId(10, 1);
  const accountId = seedId(11, 1);
  await prisma.fund.upsert({ where: { id: fundId }, create: { id: fundId, code: "DEMO-FUND", name: "กองทุนหมู่บ้าน (ข้อมูลสาธิต)", description: "ชุดข้อมูลสำหรับทดสอบระบบ" }, update: { name: "กองทุนหมู่บ้าน (ข้อมูลสาธิต)", isActive: true } });
  await prisma.fundAccount.upsert({ where: { id: accountId }, create: { id: accountId, fundId, name: "บัญชีดำเนินงานสาธิต", accountType: "CASH", openingBalance: 100000 }, update: { fundId, openingBalance: 100000, isActive: true } });
  const productIds = [seedId(13, 1), seedId(13, 2), seedId(13, 3)];
  const productNames = ["สินเชื่อฉุกเฉิน", "สินเชื่อพัฒนาคุณภาพชีวิต", "สินเชื่ออาชีพ"];
  for (let index = 0; index < productIds.length; index++) await prisma.loanProduct.upsert({ where: { id: productIds[index] }, create: { id: productIds[index], fundId, name: productNames[index], minPrincipal: 5000, maxPrincipal: index === 2 ? 100000 : 50000, annualRatePercent: index === 0 ? 6 : 5, interestMethod: index === 1 ? "DECLINING_BALANCE" : "FLAT", maxTermMonths: index === 0 ? 12 : 36, dueDay: 5, gracePeriodDays: 5, lateFeePercent: 1, minGuarantors: 1, maxGuarantors: 2 }, update: { name: productNames[index], isActive: true } });
  for (let index = 0; index < 10; index++) {
    const memberId = seedId(12, index + 1);
    await prisma.fundMember.upsert({ where: { id: memberId }, create: { id: memberId, fundId, residentId: seedId(2, index + 1), memberNo: `DEMO-MB-${String(index + 1).padStart(3, "0")}`, joinedAt: asDate("2024-01-01") }, update: { status: "ACTIVE" } });
    const transactionType = index % 3 === 1 ? "EXPENSE" : index % 3 === 2 ? "LOAN_REPAYMENT" : "CONTRIBUTION";
    await prisma.fundTransaction.upsert({ where: { transactionNo: `DEMO-FT-69${String(index + 1).padStart(4, "0")}` }, create: { id: seedId(14, index + 1), transactionNo: `DEMO-FT-69${String(index + 1).padStart(4, "0")}`, fundId, accountId, memberId, type: transactionType, amount: 500 + index * 250, description: `${transactionType === "EXPENSE" ? "ค่าใช้จ่ายดำเนินงาน" : "รายการสมาชิก"} (ข้อมูลสาธิต)`, status: index % 4 === 0 ? "PENDING" : "APPROVED", createdBy: actorId, approvedBy: index % 4 === 0 ? null : actorId, approvedAt: index % 4 === 0 ? null : new Date("2026-10-29T03:00:00.000Z"), createdAt: new Date(`2026-10-${String(20 + index).padStart(2, "0")}T03:00:00.000Z`) }, update: { amount: 500 + index * 250, status: index % 4 === 0 ? "PENDING" : "APPROVED" } });
    const loanStatus = ["ACTIVE", "PENDING_APPROVAL", "PAID", "ACTIVE", "OVERDUE"][index % 5];
    const loanId = seedId(15, index + 1);
    const principal = 10000 + index * 5000;
    await prisma.loan.upsert({ where: { id: loanId }, create: { id: loanId, contractNo: `DEMO-LN-69${String(index + 1).padStart(4, "0")}`, productId: productIds[index % 3], borrowerId: memberId, principal, annualRate: index % 3 === 0 ? 6 : 5, interestMethod: index % 3 === 1 ? "DECLINING_BALANCE" : "FLAT", termMonths: 12 + index, status: loanStatus, appliedAt: new Date(`2026-09-${String(10 + index).padStart(2, "0")}T03:00:00.000Z`), approvedBy: loanStatus === "PENDING_APPROVAL" ? null : actorId, approvedAt: loanStatus === "PENDING_APPROVAL" ? null : new Date("2026-09-25T03:00:00.000Z"), issuedAt: ["ACTIVE", "OVERDUE", "PAID"].includes(loanStatus) ? new Date("2026-10-01T03:00:00.000Z") : null, closedAt: loanStatus === "PAID" ? new Date("2026-10-25T03:00:00.000Z") : null }, update: { principal, status: loanStatus } });
    await prisma.loanInstallment.upsert({ where: { loanId_installmentNo: { loanId, installmentNo: 1 } }, create: { id: seedId(16, index + 1), loanId, installmentNo: 1, dueDate: asDate("2026-11-05"), principalDue: principal / 12, interestDue: principal * 0.005, paidAmount: loanStatus === "PAID" ? principal / 12 + principal * 0.005 : 0, status: loanStatus === "PAID" ? "PAID" : loanStatus === "OVERDUE" ? "OVERDUE" : "OPEN" }, update: { status: loanStatus === "PAID" ? "PAID" : loanStatus === "OVERDUE" ? "OVERDUE" : "OPEN" } });
  }
}

async function seedStore(actorId) {
  const categoryIds = new Map();
  for (const categoryName of [...new Set(demoProducts.map((item) => item[1]))]) {
    const category = await prisma.productCategory.upsert({ where: { name: categoryName }, create: { name: categoryName }, update: {} });
    categoryIds.set(categoryName, category.id);
  }
  for (let index = 0; index < demoProducts.length; index++) {
    const [name, categoryName, costPrice, salePrice, stock, reorderAt] = demoProducts[index];
    const productId = seedId(17, index + 1);
    await prisma.product.upsert({ where: { id: productId }, create: { id: productId, barcode: `8859900${String(index + 1).padStart(6, "0")}`, sku: `DEMO-PR-${String(index + 1).padStart(3, "0")}`, name, categoryId: categoryIds.get(categoryName), costPrice, salePrice, stock, reorderAt, status: "ACTIVE" }, update: { name, categoryId: categoryIds.get(categoryName), costPrice, salePrice, stock, reorderAt, status: "ACTIVE" } });
    await prisma.inventoryMovement.upsert({ where: { id: seedId(18, index + 1) }, create: { id: seedId(18, index + 1), productId, quantity: stock, movementType: "OPENING_BALANCE", reference: `DEMO-PR-${String(index + 1).padStart(3, "0")}`, reason: "ยอดตั้งต้นข้อมูลสาธิต", createdBy: actorId }, update: { quantity: stock, reason: "ยอดตั้งต้นข้อมูลสาธิต" } });
  }
  for (let index = 0; index < 10; index++) {
    const productIndex = index % demoProducts.length;
    const quantity = index % 3 + 1;
    const unitPrice = demoProducts[productIndex][3];
    const saleId = seedId(19, index + 1);
    await prisma.sale.upsert({ where: { id: saleId }, create: { id: saleId, receiptNumber: `DEMO-SR-69${String(index + 1).padStart(4, "0")}`, totalAmount: unitPrice * quantity, paidAmount: unitPrice * quantity, paymentMethod: index % 3 === 0 ? "TRANSFER" : "CASH", status: index === 9 ? "VOIDED" : "COMPLETED", soldBy: actorId, soldAt: new Date(`2026-10-${String(20 + index).padStart(2, "0")}T04:00:00.000Z`), voidReason: index === 9 ? "ข้อมูลสาธิต: ยกเลิกรายการ" : null }, update: { totalAmount: unitPrice * quantity, paidAmount: unitPrice * quantity, status: index === 9 ? "VOIDED" : "COMPLETED" } });
    await prisma.saleItem.upsert({ where: { id: seedId(20, index + 1) }, create: { id: seedId(20, index + 1), saleId, productId: seedId(17, productIndex + 1), productName: demoProducts[productIndex][0], quantity, unitPrice, lineTotal: unitPrice * quantity }, update: { quantity, unitPrice, lineTotal: unitPrice * quantity } });
  }
}

try {
  await prisma.role.createMany({ data: roles.map(([id, name]) => ({ id, name, isSystem: true })), skipDuplicates: true });
  await prisma.permission.createMany({ data: permissions.map((key) => ({ key })), skipDuplicates: true });
  await prisma.rolePermission.createMany({ data: Object.entries(grants).flatMap(([roleId, rolePermissions]) => [...rolePermissions].map((permissionKey) => ({ roleId, permissionKey }))), skipDuplicates: true });
  await prisma.villageSettings.upsert({ where: { id: 1 }, create: { id: 1, name: "หมู่บ้านสมาร์ทวิลล์" }, update: {} });
  const actor = await prisma.profile.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!actor) throw new Error("ไม่พบบัญชีผู้ใช้งาน active สำหรับอ้างอิงผู้บันทึกข้อมูลสาธิต");
  await seedRegistry(actor.id);
  await seedWater(actor.id);
  await seedFunds(actor.id);
  await seedStore(actor.id);
  console.log("Seeded roles, permissions, village settings, and idempotent demo data across registry, water, funds, loans, and store modules.");
} finally {
  await prisma.$disconnect();
}
