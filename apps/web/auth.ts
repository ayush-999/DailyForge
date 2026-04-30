import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@dailyforge/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            fullName: true,
            displayName: true,
            avatarUrl: true,
            passwordHash: true,
            emailVerified: true,
            deletedAt: true,
            status: true,
          },
        });

        // Admin-deleted accounts can never log back in
        if (!user || user.deletedAt) return null;
        if (!user.emailVerified) throw new Error("Please verify your email before signing in.");

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        // User self-deleted their account — restore it on login
        let status = user.status as string;
        if (status === "DELETED") {
          await db.user.update({ where: { id: user.id }, data: { status: "ACTIVE" } });
          status = "ACTIVE";
        }

        // Create a session row for activity tracking (IP + device)
        const req = request as Request;
        const ip =
          req?.headers?.get("x-forwarded-for")?.split(",")[0].trim() ??
          req?.headers?.get("x-real-ip") ??
          null;
        const userAgent = req?.headers?.get("user-agent") ?? null;

        try {
          await db.session.create({
            data: {
              userId: user.id,
              refreshTokenHash: crypto.randomUUID(),
              userAgent,
              ipAddress: ip,
              lastActiveAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        } catch {
          // Non-critical — don't block login if session tracking fails
        }

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          status,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.status = (user as { status?: string }).status ?? "ACTIVE";
        token.displayName = (user as { displayName?: string | null }).displayName ?? null;
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl ?? null;
        token.statusChecked = Date.now();
        return token;
      }

      // Re-validate status: immediately if admin invalidated this user, otherwise every 5 min
      const now = Date.now();
      const lastChecked = (token.statusChecked as number | undefined) ?? 0;
      const gi = globalThis as { __statusInvalidated?: Set<string> };
      const userId = token.id as string;
      const adminInvalidated = gi.__statusInvalidated?.has(userId) ?? false;
      if (adminInvalidated) gi.__statusInvalidated!.delete(userId);

      if (adminInvalidated || now - lastChecked > 5 * 60 * 1000) {
        const dbUser = await db.user.findUnique({
          where: { id: userId },
          select: { status: true, deletedAt: true },
        });

        if (!dbUser || dbUser.deletedAt) {
          token.error = "AccountInactive";
        } else {
          token.error = undefined;
          token.status = dbUser.status;
          token.statusChecked = now;
        }
      }

      return token;
    },

    session({ session, token }) {
      if ((token as { error?: string }).error) {
        (session as unknown as { error: string }).error = (token as { error: string }).error;
      }
      session.user.id = token.id as string;
      (session.user as { displayName?: string | null }).displayName =
        token.displayName as string | null;
      (session.user as { avatarUrl?: string | null }).avatarUrl =
        token.avatarUrl as string | null;
      (session.user as { status?: string }).status = (token.status as string) ?? "ACTIVE";
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt",
  },
});
