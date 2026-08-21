import { apiRequest } from "@/services/api";

import { clearTokens, getRefreshToken, saveTokens } from "./tokenStorage";
import type {
  AuthTokens,
  LoginInput,
  RegisterInput,
  SocialLoginInput,
  SignInMethods,
  User,
} from "./types";

export async function login(
  credentials: LoginInput,
): Promise<User> {
  const tokens = await apiRequest<AuthTokens>(
    "/api/auth/login/",
    {
      method: "POST",
      requiresAuth: false,
      body: JSON.stringify(credentials),
    },
  );

  await saveTokens(tokens);

  return getCurrentUser();
}

export async function register(
  input: RegisterInput,
): Promise<User> {
  await apiRequest<User>("/api/auth/register/", {
    method: "POST",
    requiresAuth: false,
    body: JSON.stringify(input),
  });

  return login({
    email: input.email,
    password: input.password,
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiRequest<User>("/api/auth/me/");
}

export async function logout(): Promise<void> {
  const refresh = await getRefreshToken();

  try {
    if (refresh) {
      await apiRequest<void>("/api/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh }),
      });
    }
  } finally {
    await clearTokens();
  }
}

export async function socialLogin(
  input: SocialLoginInput,
): Promise<User> {
  const tokens =
    await apiRequest<AuthTokens>(
      "/api/auth/social-login/",
      {
        method: "POST",
        requiresAuth: false,
        body: JSON.stringify(
          input,
        ),
      },
    );

  await saveTokens(
    tokens,
  );

  return getCurrentUser();
}


export async function getSignInMethods(): Promise<
  SignInMethods
> {
  return apiRequest<SignInMethods>(
    "/api/auth/sign-in-methods/",
  );
}

export async function requestPasswordReset(
  email: string,
): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(
    "/api/auth/forgot-password/",
    {
      method: "POST",
      requiresAuth: false,
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
      }),
    },
  );
}

export async function confirmPasswordReset(
  input: {
    uid: string;
    token: string;
    new_password: string;
    new_password_confirm: string;
  },
): Promise<{ detail: string }> {
  return apiRequest<{ detail: string }>(
    "/api/auth/reset-password/",
    {
      method: "POST",
      requiresAuth: false,
      body: JSON.stringify(input),
    },
  );
}
