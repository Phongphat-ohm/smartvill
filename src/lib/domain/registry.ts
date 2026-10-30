export type CurrentHouseholdMember = {
  isHead: boolean;
  moveOutAt: unknown;
  resident: { firstName: string; lastName: string };
};

export function currentHouseholdHeadLabel(memberships: readonly CurrentHouseholdMember[]) {
  const head = memberships.find((membership) => membership.isHead && membership.moveOutAt === null);
  if (!head) return "ไม่มีข้อมูลเจ้าบ้าน";
  return `${head.resident.firstName} ${head.resident.lastName}`.trim() || "—";
}
