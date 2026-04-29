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
      async authorize(credentials) {
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
          },
        });

        if (!user || user.deletedAt) return null;
        if (!user.emailVerified) throw new Error("Please verify your email before signing in.");

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.fullName,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.displayName = (user as { displayName?: string | null }).displayName ?? null;
        token.avatarUrl = (user as { avatarUrl?: string | null }).avatarUrl ?? null;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      (session.user as { displayName?: string | null }).displayName =
        token.displayName as string | null;
      (session.user as { avatarUrl?: string | null }).avatarUrl =
        token.avatarUrl as string | null;
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
