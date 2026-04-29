import { db } from "../src/index.js";
import bcrypt from "bcryptjs";

const PERMISSIONS = [
  { resource: "all", action: "manage", scope: "*" },
  { resource: "User", action: "read", scope: "*" },
  { resource: "User", action: "update", scope: "*" },
  { resource: "User", action: "delete", scope: "*" },
  { resource: "User", action: "manage", scope: "*" },
  { resource: "App", action: "read", scope: "*" },
  { resource: "App", action: "publish", scope: "*" },
  { resource: "App", action: "manage", scope: "*" },
  { resource: "Role", action: "read", scope: "*" },
  { resource: "Role", action: "manage", scope: "*" },
  { resource: "AuditLog", action: "read", scope: "*" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ["all:manage"],
  admin: [
    "User:read",
    "User:update",
    "User:manage",
    "App:read",
    "App:manage",
    "Role:read",
    "AuditLog:read",
  ],
  user: [],
};

async function main() {
  console.log("▶ Seeding permissions...");
  const permMap: Record<string, string> = {};

  for (const p of PERMISSIONS) {
    const perm = await db.permission.upsert({
      where: { resource_action_scope: p },
      update: {},
      create: p,
    });
    permMap[`${p.resource}:${p.action}`] = perm.id;
  }

  console.log("▶ Seeding roles...");
  const roles: Record<string, { id: string }> = {};

  const roleDefs = [
    {
      name: "super_admin",
      displayName: "Super Admin",
      description: "Full unrestricted platform access",
    },
    {
      name: "admin",
      displayName: "Admin",
      description: "User and app management",
    },
    {
      name: "user",
      displayName: "User",
      description: "Default role — access to own data and installed apps",
    },
  ];

  for (const def of roleDefs) {
    const role = await db.role.upsert({
      where: { name: def.name },
      update: {},
      create: { ...def, isSystem: true },
    });
    roles[def.name] = role;
  }

  console.log("▶ Assigning permissions to roles...");
  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = roles[roleName];
    for (const key of keys) {
      const permId = permMap[key];
      if (!permId) {
        console.warn(`  ⚠ Unknown permission key: ${key}`);
        continue;
      }
      await db.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: role.id, permissionId: permId },
        },
        update: {},
        create: { roleId: role.id, permissionId: permId },
      });
    }
  }

  const saEmail = process.env.SUPER_ADMIN_EMAIL ?? "admin@dailyforge.app";
  const saPassword = process.env.SUPER_ADMIN_PASSWORD ?? "Admin@1234!";

  console.log(`▶ Seeding super_admin user (${saEmail})...`);
  let saUser = await db.user.findUnique({ where: { email: saEmail } });
  if (!saUser) {
    saUser = await db.user.create({
      data: {
        email: saEmail,
        fullName: "Super Admin",
        passwordHash: await bcrypt.hash(saPassword, 12),
        emailVerified: true,
      },
    });
    console.log(`  ✔ Created: ${saEmail} / ${saPassword}`);
  } else {
    console.log(`  – Already exists: ${saEmail}`);
  }
  await db.userRole.upsert({
    where: {
      userId_roleId: { userId: saUser.id, roleId: roles.super_admin.id },
    },
    update: {},
    create: { userId: saUser.id, roleId: roles.super_admin.id },
  });

  const demoEmail = "demo@dailyforge.app";
  const demoPassword = "Demo@1234!";

  console.log(`▶ Seeding demo user (${demoEmail})...`);
  let demoUser = await db.user.findUnique({ where: { email: demoEmail } });
  if (!demoUser) {
    demoUser = await db.user.create({
      data: {
        email: demoEmail,
        fullName: "Demo User",
        displayName: "Demo",
        passwordHash: await bcrypt.hash(demoPassword, 12),
        emailVerified: true,
      },
    });
    console.log(`  ✔ Created: ${demoEmail} / ${demoPassword}`);
  } else {
    console.log(`  – Already exists: ${demoEmail}`);
  }
  await db.userRole.upsert({
    where: {
      userId_roleId: { userId: demoUser.id, roleId: roles.user.id },
    },
    update: {},
    create: { userId: demoUser.id, roleId: roles.user.id },
  });

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
