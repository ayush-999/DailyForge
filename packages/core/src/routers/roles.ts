import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, authorizedProcedure } from "../trpc/index";
import { db } from "@dailyforge/db";

const ROLE_INCLUDE = {
  rolePermissions: { include: { permission: true } },
  _count: { select: { userRoles: true } },
} as const;

export const rolesRouter = router({
  list: authorizedProcedure("read", "Role").query(async () => {
    return db.role.findMany({
      include: ROLE_INCLUDE,
      orderBy: [{ isSystem: "desc" }, { createdAt: "asc" }],
    });
  }),

  listPermissions: authorizedProcedure("read", "Role").query(async () => {
    return db.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });
  }),

  create: authorizedProcedure("manage", "Role")
    .input(
      z.object({
        name: z
          .string()
          .min(1)
          .regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores"),
        displayName: z.string().min(1),
        description: z.string().optional(),
        permissionIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input }) => {
      const { permissionIds, ...data } = input;
      const existing = await db.role.findUnique({ where: { name: data.name } });
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A role with this name already exists" });
      }
      return db.role.create({
        data: {
          ...data,
          rolePermissions: {
            create: permissionIds.map((permissionId) => ({ permissionId })),
          },
        },
        include: ROLE_INCLUDE,
      });
    }),

  update: authorizedProcedure("manage", "Role")
    .input(
      z.object({
        id: z.string(),
        displayName: z.string().min(1).optional(),
        description: z.string().optional(),
        permissionIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, permissionIds, ...data } = input;

      if (permissionIds !== undefined) {
        await db.rolePermission.deleteMany({ where: { roleId: id } });
        if (permissionIds.length > 0) {
          await db.rolePermission.createMany({
            data: permissionIds.map((permissionId) => ({ roleId: id, permissionId })),
            skipDuplicates: true,
          });
        }
      }

      return db.role.update({
        where: { id },
        data,
        include: ROLE_INCLUDE,
      });
    }),

  delete: authorizedProcedure("manage", "Role")
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input }) => {
      const role = await db.role.findUniqueOrThrow({ where: { id: input.id } });
      if (role.isSystem) {
        throw new TRPCError({ code: "FORBIDDEN", message: "System roles cannot be deleted" });
      }
      await db.role.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
