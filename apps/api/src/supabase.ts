import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { AppConfig } from "./config.js";
import type { AppDependencies, AuthProvider, AuthSession, UserDataClient } from "./modules/auth/types.js";

function createBaseClient(config: AppConfig): SupabaseClient {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

function createAuthProvider(config: AppConfig): AuthProvider {
  const client = createBaseClient(config);

  return {
    async signUp({ email, password, displayName }) {
      const { data, error } = await client.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
      });
      return { user: data.user, session: data.session, error };
    },
    async signIn({ email, password }) {
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      return { user: data.user, session: data.session, error };
    },
    async getUser(accessToken) {
      const { data, error } = await client.auth.getUser(accessToken);
      return { user: data.user, error };
    },
    async refreshSession(refreshToken) {
      const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
      return { session: data.session, user: data.user, error };
    },
    async signOut(accessToken, refreshToken) {
      const scopedClient = createBaseClient(config);
      const { error: sessionError } = await scopedClient.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) return;
      await scopedClient.auth.signOut({ scope: "local" });
    },
  };
}

function createUserClient(config: AppConfig, accessToken: string): UserDataClient {
  return createClient(config.supabaseUrl, config.supabasePublishableKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }) as unknown as UserDataClient;
}

export function createDependencies(config: AppConfig): AppDependencies {
  return {
    auth: createAuthProvider(config),
    userClient: (accessToken) => createUserClient(config, accessToken),
  };
}

export type { User };
export type { AuthSession };
