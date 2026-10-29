# SmartVill — ระบบบริหารจัดการหมู่บ้าน

เว็บแอปภาษาไทยแบบ responsive สำหรับทะเบียนครัวเรือน/ประชากร ประปาหมู่บ้าน การเงิน กองทุน สินเชื่อ และร้านค้าชุมชน

## เทคโนโลยี

- Next.js App Router, React, TypeScript, Node.js LTS และ npm
- Supabase Auth/PostgreSQL; Prisma 7 เป็นแหล่ง schema, migration และ seed
- Supabase SSR client สำหรับงานของเจ้าหน้าที่ โดย PostgreSQL RLS ตรวจสิทธิ์ที่ฐานข้อมูล
- Tailwind CSS 4, shadcn/ui, Lucide, SweetAlert2, React Hook Form, Zod, TanStack Table และ Recharts
- ExcelJS สำหรับ Excel; Noto Sans Thai Variable สำหรับหน้าจอ

## เริ่มพัฒนา

```powershell
npm install
npm run dev
```

เมื่อยังไม่กำหนด Supabase ในโหมด development แอปจะแสดงข้อมูลสาธิตที่แก้ไขได้ในหน่วยความจำ ข้อมูลสาธิตไม่ถูกบันทึกและห้ามนำไปใช้แทนทะเบียนจริง

## เชื่อม Supabase

1. สร้าง Supabase project ใน region ที่ผู้รับผิดชอบข้อมูลอนุมัติ แล้วตั้งค่า Auth URL configuration ให้ตรงกับโดเมนแอป
2. คัดลอก `.env.example` เป็น `.env.local` และใส่ `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, `DIRECT_URL` และ `APP_ORIGIN` ค่า secret ต้องอยู่ฝั่งเซิร์ฟเวอร์เท่านั้น
3. ตั้งค่า `NATIONAL_ID_ENCRYPTION_KEY` เป็นค่าสุ่ม 32 ไบต์ (hex 64 ตัวหรือ Base64) ผ่าน secret manager และสำรองกุญแจแยกจากฐานข้อมูล
4. ปิด public signup ใน Supabase Auth และตั้ง SMTP/redirect สำหรับยืนยันอีเมลและกู้บัญชี
5. สร้าง schema, RLS และฟังก์ชันด้วย `npm run db:migrate` แล้วกำหนด role/permission ตั้งต้นด้วย `npm run db:seed`
6. สร้างผู้ดูแลคนแรกครั้งเดียว: ใช้ `admin.bat -Username admin -Email "admin@example.org" -DisplayName "ผู้ดูแลระบบ"` บน Windows ซึ่งจะถามรหัสผ่านแบบซ่อนตัวอักษรและใช้ bootstrap token แบบครั้งเดียว ผู้ใช้ต้องยืนยันอีเมลก่อนเข้าใช้
7. เปิดแอปและตั้งค่าข้อมูลหมู่บ้าน อัตราค่าน้ำ ผู้ใช้ และสิทธิ์ ก่อนนำข้อมูลจริงเข้า

`DIRECT_URL` ใช้เชื่อมต่อ Prisma migration/seed โดยตรง ส่วนแอป CRUD ใช้ Supabase session และ publishable key; แอปจะไม่ใช้ Prisma role ที่ bypass RLS ทำ CRUD ให้ผู้ใช้ `SUPABASE_SECRET_KEY` ใช้เฉพาะการทำงานฝั่งเซิร์ฟเวอร์ที่จำเป็น เช่น เชิญผู้ใช้และจำกัดอัตราเข้าสู่ระบบ

## คำสั่งหลัก

```powershell
npm run typecheck
npm run lint
npm test
npm run db:validate
npm run db:generate
npm run db:migrate
npm run db:seed
npm run build
```

`db:migrate` ใช้กับฐานข้อมูลที่ตั้ง `DIRECT_URL` แล้วเท่านั้น Migration แรกสร้าง schema ทั้งระบบ ส่วน migration ถัดไปสร้าง RLS, grants, audit triggers และฟังก์ชันธุรกรรม การเปลี่ยน schema ใหม่ให้แก้ `prisma/schema.prisma` แล้วสร้าง migration ใหม่ด้วย `prisma migrate dev` ในฐานข้อมูลพัฒนา ห้ามแก้ migration ที่นำขึ้น production แล้ว

## ขอบเขตและข้อกำหนดก่อนเปิดใช้

- ระบบเริ่มจากข้อมูลว่าง ไม่มีพอร์ทัลลูกบ้าน ไม่มีการชำระเงินออนไลน์ และไม่มีโหมด offline
- ตัวอย่างหน้าจอและข้อมูลสาธิตมีไว้ตรวจ UX เท่านั้น บาง workflow ที่ยังไม่มี credential/บริการจริงจะยังทำงานเฉพาะในโหมดสาธิต
- ตรวจ RLS และ policy ด้วยบัญชีแต่ละบทบาทใน Supabase staging ก่อน production; migration สร้างสิทธิ์ระดับฐานข้อมูล แต่ไม่ได้แทนการตั้งค่า Auth, SMTP, secret manager หรือ backup
- ตั้ง daily backup ที่อยู่นอกระบบหลักและซ้อม restore ตามรอบก่อนเปิดใช้จริง
- ทำบัญชีข้อมูล/วัตถุประสงค์ privacy notice ระยะเก็บ ช่องทางคำขอใช้สิทธิ และขั้นตอนแจ้งเหตุ พร้อมตรวจเงื่อนไขผู้ให้บริการ/การส่งข้อมูลข้ามประเทศโดยผู้รับผิดชอบข้อมูลก่อนนำข้อมูลส่วนบุคคลจริงเข้าใช้งาน
