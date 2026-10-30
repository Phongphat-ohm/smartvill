import { createHouseholdFormAction, createResidentFormAction } from "@/app/actions";
import { DataWorkspace } from "@/components/data-workspace";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import type { DemoRow } from "@/lib/demo-data";
import { formatThaiDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { decodeRegistryCursor, encodeRegistryCursor, REGISTRY_PAGE_SIZE, registrySearchParam } from "@/lib/registry-query";
import { workspaces } from "@/lib/workspaces";
import { isSupabaseConfigured } from "@/lib/supabase/server";

type Params = Record<string, string | string[] | undefined>;
const labels: Record<string, string> = { OCCUPIED: "มีผู้อยู่อาศัย", VACANT: "ว่าง", ARCHIVED: "เก็บประวัติ", RESIDENT: "อาศัยอยู่", MOVED_IN: "ย้ายเข้า", MOVED_OUT: "ย้ายออก", DECEASED: "เสียชีวิต" };

export async function RegistryModulePage({ id, searchParams }: { id: "households" | "people"; searchParams?: Promise<Params> }) {
  const config = workspaces[id];
  if (!isSupabaseConfigured()) return <DataWorkspace {...config} initialRows={config.initialRows} />;
  const params = await searchParams ?? {};
  const q = registrySearchParam(params.q);
  const status = registrySearchParam(params.status, 30);
  const direction = registrySearchParam(params.dir, 4) === "prev" ? "prev" : "next";
  const cursor = decodeRegistryCursor(registrySearchParam(params.cursor, 500));
  const page = Math.max(1, Number.parseInt(registrySearchParam(params.page, 8), 10) || 1);

  try {
    const { allowed } = await currentUserWithPermission(id === "households" ? "registry.household.view" : "registry.resident.view");
    if (!allowed) return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">บัญชีนี้ไม่มีสิทธิ์ดูข้อมูลในโมดูลนี้</div>;

    if (id === "households") {
      const statusMap: Record<string, "OCCUPIED" | "VACANT" | "ARCHIVED"> = { "มีผู้อยู่อาศัย": "OCCUPIED", "ว่าง": "VACANT", "เก็บประวัติ": "ARCHIVED" };
      const search = q ? { OR: [{ houseNumber: { contains: q, mode: "insensitive" as const } }, { moo: { contains: q, mode: "insensitive" as const } }, { memberships: { some: { moveOutAt: null, resident: { OR: [{ firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }] } } } }] } : {};
      const boundary = cursor ? direction === "prev"
        ? { OR: [{ houseNumber: { lt: cursor.primary } }, { houseNumber: cursor.primary, id: { lt: cursor.id } }] }
        : { OR: [{ houseNumber: { gt: cursor.primary } }, { houseNumber: cursor.primary, id: { gt: cursor.id } }] } : {};
      const baseWhere = { AND: [search, statusMap[status] ? { occupancyStatus: statusMap[status] } : {}] };
      const where = { AND: [baseWhere, boundary] };
      const [total, found] = await Promise.all([
        prisma.household.count({ where: baseWhere }),
        prisma.household.findMany({ where, select: { id: true, houseNumber: true, moo: true, road: true, subdistrict: true, district: true, province: true, postalCode: true, householdType: true, occupancyStatus: true, memberships: { where: { moveOutAt: null }, select: { isHead: true, resident: { select: { firstName: true, lastName: true } } } }, connections: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 } }, orderBy: direction === "prev" ? [{ houseNumber: "desc" }, { id: "desc" }] : [{ houseNumber: "asc" }, { id: "asc" }], take: REGISTRY_PAGE_SIZE + 1 }),
      ]);
      const hasMore = found.length > REGISTRY_PAGE_SIZE; const slice = found.slice(0, REGISTRY_PAGE_SIZE); const rows = direction === "prev" ? slice.reverse() : slice;
      const mapped = rows.map((row) => { const head = row.memberships.find((item) => item.isHead)?.resident; return { id: row.id, detailId: row.id, houseNumber: row.houseNumber, moo: row.moo || "—", address: [row.road, row.subdistrict, row.district, row.province, row.postalCode].filter(Boolean).join(" "), type: ({ RESIDENTIAL: "ที่อยู่อาศัย", COMMERCIAL: "พาณิชยกรรม", MIXED: "ผสม" } as Record<string, string>)[row.householdType], head: head ? `${head.firstName} ${head.lastName}` : "ยังไม่มีเจ้าบ้าน", members: row.memberships.length, waterStatus: row.connections.length ? "ปกติ" : "ไม่มีจุดใช้น้ำ", status: labels[row.occupancyStatus] } as DemoRow; });
      return <DataWorkspace {...config} initialRows={mapped} onCreate={createHouseholdFormAction} serverPagination={{ page, pageSize: REGISTRY_PAGE_SIZE, total, query: q, status, previousCursor: page > 1 && rows[0] ? encodeRegistryCursor({ primary: rows[0].houseNumber, id: rows[0].id }) : undefined, nextCursor: (direction === "prev" || hasMore) && rows.at(-1) ? encodeRegistryCursor({ primary: rows.at(-1)!.houseNumber, id: rows.at(-1)!.id }) : undefined }} />;
    }

    const statusMap: Record<string, "RESIDENT" | "MOVED_IN" | "MOVED_OUT" | "DECEASED"> = { "อาศัยอยู่": "RESIDENT", "ย้ายเข้า": "MOVED_IN", "ย้ายออก": "MOVED_OUT", "เสียชีวิต": "DECEASED" };
    const search = q ? { OR: [{ firstName: { contains: q, mode: "insensitive" as const } }, { lastName: { contains: q, mode: "insensitive" as const } }, { phone: { contains: q, mode: "insensitive" as const } }, { memberships: { some: { moveOutAt: null, household: { houseNumber: { contains: q, mode: "insensitive" as const } } } } }] } : {};
    const boundary = cursor ? direction === "prev"
      ? { OR: [{ lastName: { lt: cursor.primary } }, { lastName: cursor.primary, firstName: { lt: cursor.secondary ?? "" } }, { lastName: cursor.primary, firstName: cursor.secondary ?? "", id: { lt: cursor.id } }] }
      : { OR: [{ lastName: { gt: cursor.primary } }, { lastName: cursor.primary, firstName: { gt: cursor.secondary ?? "" } }, { lastName: cursor.primary, firstName: cursor.secondary ?? "", id: { gt: cursor.id } }] } : {};
    const baseWhere = { AND: [search, statusMap[status] ? { residencyStatus: statusMap[status] } : {}] };
    const where = { AND: [baseWhere, boundary] };
    const [total, found] = await Promise.all([
      prisma.resident.count({ where: baseWhere }),
      prisma.resident.findMany({ where, select: { id: true, firstName: true, lastName: true, birthDate: true, phone: true, residencyStatus: true, memberships: { where: { moveOutAt: null }, select: { relationship: true, isHead: true, household: { select: { houseNumber: true } } }, take: 1 } }, orderBy: direction === "prev" ? [{ lastName: "desc" }, { firstName: "desc" }, { id: "desc" }] : [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }], take: REGISTRY_PAGE_SIZE + 1 }),
    ]);
    const hasMore = found.length > REGISTRY_PAGE_SIZE; const slice = found.slice(0, REGISTRY_PAGE_SIZE); const rows = direction === "prev" ? slice.reverse() : slice;
    const mapped = rows.map((row) => { const membership = row.memberships[0]; return { id: row.id, detailId: row.id, name: `${row.firstName} ${row.lastName}`, household: membership?.household.houseNumber ?? "ไม่มีครัวเรือนปัจจุบัน", relationship: membership ? (membership.isHead ? "หัวหน้าครัวเรือน" : membership.relationship) : "—", birthDate: row.birthDate ? formatThaiDate(row.birthDate.toISOString()) : "ไม่ระบุ", phone: row.phone ?? "ไม่ระบุ", status: labels[row.residencyStatus] } as DemoRow; });
    const fieldConfig = config.fields.map((field) => field.key === "householdId" ? { ...field, remoteOptionsUrl: "/api/registry/households/search" } : field);
    return <DataWorkspace {...config} fields={fieldConfig} initialRows={mapped} onCreate={createResidentFormAction} serverPagination={{ page, pageSize: REGISTRY_PAGE_SIZE, total, query: q, status, previousCursor: page > 1 && rows[0] ? encodeRegistryCursor({ primary: rows[0].lastName, secondary: rows[0].firstName, id: rows[0].id }) : undefined, nextCursor: (direction === "prev" || hasMore) && rows.at(-1) ? encodeRegistryCursor({ primary: rows.at(-1)!.lastName, secondary: rows.at(-1)!.firstName, id: rows.at(-1)!.id }) : undefined }} />;
  } catch (error) {
    const requestId = await logDataError(`module.${id}.load`, error);
    return <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">โหลดข้อมูลไม่สำเร็จ รหัสอ้างอิง {requestId}</p>;
  }
}
