import type { User } from "@supabase/supabase-js";
import type { FastifyReply, FastifyRequest } from "fastify";

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface AuthProvider {
  signUp(input: { email: string; password: string; displayName: string }): Promise<{
    user: User | null;
    session: AuthSession | null;
    error: Error | null;
  }>;
  signIn(input: { email: string; password: string }): Promise<{
    user: User | null;
    session: AuthSession | null;
    error: Error | null;
  }>;
  getUser(accessToken: string): Promise<{ user: User | null; error: Error | null }>;
  refreshSession(refreshToken: string): Promise<{
    session: AuthSession | null;
    user: User | null;
    error: Error | null;
  }>;
  signOut(accessToken: string, refreshToken: string): Promise<void>;
}

export interface UserDataClient {
  from(table: string): any;
  rpc(functionName: string, args?: Record<string, unknown>): any;
  storage: any;
}

export interface AppDependencies {
  auth: AuthProvider;
  userClient(accessToken: string): UserDataClient;
}

export interface AuthenticatedActor {
  user: User;
  accessToken: string;
  client: UserDataClient;
}

export type AuthRequest = FastifyRequest & {
  actor?: AuthenticatedActor;
};

export type AuthReply = FastifyReply;
