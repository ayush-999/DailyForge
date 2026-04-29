// Core domain types shared between server and client.
// These mirror the Prisma models but are plain TypeScript — no ORM dependency.

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  displayName: string | null;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  emailVerified: boolean;
}

export interface AppMeta {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  iconUrl: string | null;
  category: string;
  isSystem: boolean;
  isPublished: boolean;
}

export interface AppInstallation {
  id: string;
  appId: string;
  app: AppMeta;
  grantedScopes: string[];
  installedAt: Date;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: Date;
  createdAt: Date;
}

// Standard API envelope used by both Express and tRPC error responses
export interface ApiError {
  error: string;
  code?: string;
}
