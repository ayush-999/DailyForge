const { AbilityBuilder, createMongoAbility } = require("@casl/ability");
const prisma = require("../lib/prisma");

/**
 * Build a CASL ability object for a given user by loading their roles +
 * permissions from the DB.  super_admin gets a "manage all" wildcard grant.
 */
async function getUserAbility(userId) {
  const userRoles = await prisma.userRole.findMany({
    where: { userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const { can, build } = new AbilityBuilder(createMongoAbility);

  for (const { role } of userRoles) {
    for (const { permission } of role.rolePermissions) {
      // The wildcard permission stored as resource="all" / action="manage"
      // maps to CASL's special "manage" + "all" tokens.
      can(permission.action, permission.resource);
    }
  }

  return build();
}

module.exports = { getUserAbility };
