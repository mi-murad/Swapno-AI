import type { FastifyReply, FastifyRequest } from "fastify";
import type { AppConfig } from "../../config.js";
import type { AppDependencies, AuthenticatedActor } from "./types.js";

const ACCESS_COOKIE = "swapno_access";
const REFRESH_COOKIE = "swapno_refresh";

export function writeSessionCookies(reply: FastifyReply, config: AppConfig, session: {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}): void {
  const shared = {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "strict" as const,
    path: "/",
  };
  reply.setCookie(ACCESS_COOKIE, session.access_token, {
    ...shared,
    maxAge: Math.max(60, session.expires_in),
  });
  reply.setCookie(REFRESH_COOKIE, session.refresh_token, {
    ...shared,
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function clearSessionCookies(reply: FastifyReply, config: AppConfig): void {
  const shared = {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: "strict" as const,
    path: "/",
  };
  reply.clearCookie(ACCESS_COOKIE, shared);
  reply.clearCookie(REFRESH_COOKIE, shared);
}

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  dependencies: AppDependencies,
  config: AppConfig,
): Promise<AuthenticatedActor | null> {
  const accessToken = request.cookies[ACCESS_COOKIE];
  const refreshToken = request.cookies[REFRESH_COOKIE];
  if (!accessToken && !refreshToken) return null;

  if (accessToken) {
    const verified = await dependencies.auth.getUser(accessToken);
    if (!verified.error && verified.user) {
      return { user: verified.user, accessToken, client: dependencies.userClient(accessToken) };
    }
  }

  if (refreshToken) {
    const refreshed = await dependencies.auth.refreshSession(refreshToken);
    if (!refreshed.error && refreshed.session && refreshed.user) {
      const verified = await dependencies.auth.getUser(refreshed.session.access_token);
      if (!verified.error && verified.user) {
        writeSessionCookies(reply, config, refreshed.session);
        return {
          user: verified.user,
          accessToken: refreshed.session.access_token,
          client: dependencies.userClient(refreshed.session.access_token),
        };
      }
    }
  }

  clearSessionCookies(reply, config);
  return null;
}

export { ACCESS_COOKIE, REFRESH_COOKIE };
