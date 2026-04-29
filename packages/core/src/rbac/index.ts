import { AbilityBuilder, createMongoAbility, type MongoAbility } from "@casl/ability";
import { db } from "@dailyforge/db";

/**
 * Builds a CASL ability for a user by loading their roles + permissions.
 * Isomorphic: runs on both server (tRPC context) and client (UI gating).
 */
export async function getUserAbility(userId: string): Promise<MongoAbility> {
  const userRoles = await db.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  });

  const { can, build } = new AbilityBuilder<MongoAbility>(createMongoAbility);

  for (const { role } of userRoles) {
    for (const { permission } of role.rolePermissions) {
      can(permission.action, permission.resource);
    }
  }

  return build();
}
