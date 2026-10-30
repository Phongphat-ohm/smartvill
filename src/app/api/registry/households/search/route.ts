import { NextResponse } from "next/server";
import { currentUserWithPermission, logDataError } from "@/lib/data-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { allowed } = await currentUserWithPermission("registry.household.view");
    if (!allowed) return NextResponse.json({ options: [] }, { status: 403 });
    const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
    const rows = await prisma.household.findMany({
      where: { occupancyStatus: { not: "ARCHIVED" }, ...(q ? { OR: [{ houseNumber: { contains: q, mode: "insensitive" } }, { moo: { contains: q, mode: "insensitive" } }] } : {}) },
      select: { id: true, houseNumber: true, moo: true }, orderBy: [{ houseNumber: "asc" }, { id: "asc" }], take: 20,
    });
    return NextResponse.json({ options: rows.map((row) => ({ value: row.id, label: `บ้านเลขที่ ${row.houseNumber} · หมู่ ${row.moo}` })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    const requestId = await logDataError("registry.household.search", error);
    return NextResponse.json({ options: [], requestId }, { status: 500 });
  }
}
