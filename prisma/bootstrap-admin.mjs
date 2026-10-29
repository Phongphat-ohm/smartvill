import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const args = Object.fromEntries(process.argv.slice(2).flatMap((arg, index, all) => arg.startsWith("--") ? [[arg.slice(2), all[index + 1]]] : []));
const username = String(args.username ?? "").trim().toLowerCase();
const email = String(args.email ?? "").trim().toLowerCase();
const displayName = String(args["display-name"] ?? "").trim();
const password = process.env.BOOTSTRAP_ADMIN_PASSWORD ?? "";
if (!/^[a-z0-9._-]{3,32}$/.test(username) || !email.includes("@") || !displayName || password.length < 12) {
  console.error("Usage: set BOOTSTRAP_ADMIN_PASSWORD (12+ chars), then npm run bootstrap-admin -- --username admin --email admin@example.org --display-name 'Village Admin'");
  process.exit(2);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !secret || !process.env.DIRECT_URL) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY, and DIRECT_URL first.");
const authProjectRef = new URL(url).hostname.split(".")[0];
const databaseUrl = new URL(process.env.DIRECT_URL);
const databaseProjectRef = databaseUrl.hostname.match(/^db\.([^.]+)\.supabase\.co$/i)?.[1]
  ?? decodeURIComponent(databaseUrl.username).match(/^postgres\.([^.]+)$/i)?.[1];
if (databaseProjectRef && databaseProjectRef !== authProjectRef) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and DIRECT_URL point to different Supabase projects. Use connection details from the same project, then retry.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }) });
let bootstrapTokenHash;
try {
  if (await prisma.profile.count() !== 0) throw new Error("Bootstrap is disabled because a profile already exists.");
  if (!await prisma.role.findUnique({ where: { id: "system_admin" } })) {
    throw new Error("The system_admin role is missing. Run npm run db:seed, then retry the bootstrap.");
  }
  const supabase = createClient(url, secret, { auth: { autoRefreshToken: false, persistSession: false } });
  const bootstrapToken = randomBytes(32).toString("hex");
  bootstrapTokenHash = createHash("sha256").update(bootstrapToken).digest("hex");
  await prisma.$executeRaw`INSERT INTO public.bootstrap_admin_tokens (token_hash, expires_at) VALUES (${bootstrapTokenHash}, now() + interval '10 minutes')`;
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { username, display_name: displayName, bootstrap_token: bootstrapToken },
  });
  if (error) {
    if (error.message === "Database error creating new user") {
      throw new Error("Supabase rejected the auth trigger. Apply the latest migration with npm run db:migrate, confirm both URLs in .env point to the same project, then retry.");
    }
    throw error;
  }
  if (!data.user) throw new Error("Supabase did not create the user.");
  const profile = await prisma.profile.findUnique({ where: { id: data.user.id } });
  if (!profile) throw new Error("Auth user was created but the profile trigger did not create the administrator. Check the security migration.");
  console.log(`Created the initial administrator ${profile.username}. Verify the email before signing in.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (bootstrapTokenHash) {
    try {
      await prisma.$executeRaw`DELETE FROM public.bootstrap_admin_tokens WHERE token_hash = ${bootstrapTokenHash} AND used_at IS NULL`;
    } catch {
      // Keep the original bootstrap error; expired unused tokens cannot authorize a later signup.
    }
  }
  await prisma.$disconnect();
}
