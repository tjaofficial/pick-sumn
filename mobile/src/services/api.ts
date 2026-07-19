import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveTokens,
} from "@/features/auth/tokenStorage";

import type { AuthTokens } from "@/features/auth/types";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  "http://127.0.0.1:8000";

type ApiOptions = RequestInit & {
  requiresAuth?: boolean;
  retryOnUnauthorized?: boolean;
};

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(
    message: string,
    status: number,
    data: unknown,
  ) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}


// ---------------------------------------------------------------------
// TOKEN REFRESH LOCK
// ---------------------------------------------------------------------
//
// When multiple API requests receive a 401 at the same time,
// they should all wait for the SAME refresh request.
//
// Without this, refresh-token rotation can cause one request
// to refresh successfully while another request uses the old
// refresh token and clears the newly saved tokens.
//
let refreshPromise: Promise<string | null> | null = null;


async function parseResponse(
  response: Response,
): Promise<unknown> {
  if (response.status === 204) {
    return null;
  }

  const contentType =
    response.headers.get(
      "content-type",
    );

  if (
    contentType?.includes(
      "application/json",
    )
  ) {
    return response.json();
  }

  return response.text();
}


async function performTokenRefresh(): Promise<
  string | null
> {
  const refresh =
    await getRefreshToken();

  if (!refresh) {
    return null;
  }

  try {
    const response = await fetch(
      `${API_URL}/api/auth/token/refresh/`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          refresh,
        }),
      },
    );

    if (!response.ok) {
      await clearTokens();

      return null;
    }

    const data =
      (await response.json()) as {
        access: string;
        refresh?: string;
      };

    const tokens: AuthTokens = {
      access: data.access,

      // Django SimpleJWT returns a new refresh
      // token when rotation is enabled.
      refresh:
        data.refresh ??
        refresh,
    };

    await saveTokens(
      tokens,
    );

    return tokens.access;

  } catch (error) {
    /*
     * Do NOT clear tokens for network failures.
     *
     * Losing internet or Render temporarily
     * failing should not log the user out.
     */
    console.error(
      "Token refresh request failed:",
      error,
    );

    return null;
  }
}


async function refreshAccessToken(): Promise<
  string | null
> {
  /*
   * If a refresh is already happening,
   * wait for the existing one.
   */
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise =
    performTokenRefresh();

  try {
    return await refreshPromise;
  } finally {
    /*
     * Allow another refresh later after
     * the current one finishes.
     */
    refreshPromise = null;
  }
}


export async function apiRequest<T>(
  path: string,
  options: ApiOptions = {},
): Promise<T> {
  const {
    requiresAuth = true,
    retryOnUnauthorized = true,
    headers,
    ...requestOptions
  } = options;

  const requestHeaders =
    new Headers(
      headers,
    );

  const isFormData =
    requestOptions.body instanceof FormData;

  if (!isFormData) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );
  }


  if (requiresAuth) {
    const accessToken =
      await getAccessToken();

    if (accessToken) {
      requestHeaders.set(
        "Authorization",
        `Bearer ${accessToken}`,
      );
    }
  }


  let response =
    await fetch(
      `${API_URL}${path}`,
      {
        ...requestOptions,
        headers:
          requestHeaders,
      },
    );


  /*
   * Access token may have expired.
   *
   * All requests that arrive here together
   * will share one token-refresh operation.
   */
  if (
    response.status === 401 &&
    requiresAuth &&
    retryOnUnauthorized
  ) {
    const refreshedAccessToken =
      await refreshAccessToken();

    if (refreshedAccessToken) {
      requestHeaders.set(
        "Authorization",
        `Bearer ${refreshedAccessToken}`,
      );

      response =
        await fetch(
          `${API_URL}${path}`,
          {
            ...requestOptions,
            headers:
              requestHeaders,
          },
        );
    }
  }


  const data =
    await parseResponse(
      response,
    );


  if (!response.ok) {
    throw new ApiError(
      `Request failed with status ${response.status}`,
      response.status,
      data,
    );
  }


  return data as T;
}