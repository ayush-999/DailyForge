import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      displayName: string | null;
      avatarUrl: string | null;
    } & DefaultSession["user"];
  }
}
