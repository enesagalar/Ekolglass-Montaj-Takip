/**
 * Bootstrap the admin user directly via Supabase service role.
 * Run: node supabase/bootstrap_admin.mjs
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USERS = [
  { username: "admin",  password: "admin123",  name: "Admin",         role: "admin"    },
  { username: "mehmet", password: "1234",      name: "Mehmet Yılmaz", role: "field"    },
  { username: "ali",    password: "1234",      name: "Ali Demir",     role: "field"    },
  { username: "hasan",  password: "1234",      name: "Hasan Kaya",    role: "field"    },
  { username: "murat",  password: "1234",      name: "Murat Çelik",   role: "field"    },
  { username: "isri",   password: "isri2024",  name: "ISRI Yetkilisi",role: "customer" },
];

for (const u of USERS) {
  const email = `${u.username}@cam-montaj.internal`;

  const { data: existing } = await supabase
    .from("app_users")
    .select("id")
    .eq("username", u.username)
    .maybeSingle();

  if (existing) {
    console.log(`⏭  ${u.username} already exists, skipping.`);
    continue;
  }

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email,
    password: u.password,
    user_metadata: { name: u.name, role: u.role },
    email_confirm: true,
  });

  if (authErr || !authData.user) {
    console.error(`✗  ${u.username}: auth error —`, authErr?.message);
    continue;
  }

  const now = new Date().toISOString();
  const { error: dbErr } = await supabase.from("app_users").insert({
    auth_id: authData.user.id,
    username: u.username,
    email,
    name: u.name,
    role: u.role,
    active: true,
    created_at: now,
    updated_at: now,
  });

  if (dbErr) {
    console.error(`✗  ${u.username}: db error —`, dbErr.message);
    await supabase.auth.admin.deleteUser(authData.user.id);
  } else {
    console.log(`✓  ${u.username} (${u.role}) created.`);
  }
}

console.log("\nDone.");
