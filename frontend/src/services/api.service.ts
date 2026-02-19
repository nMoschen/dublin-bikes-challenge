export interface ApiSuccessResponse<T> {
  data: T;
  ok: true;
}

export interface ApiErrorResponse {
  ok: false;
  message: string;
}

export type ApiResponse<TResponse> =
  | ApiSuccessResponse<TResponse>
  | ApiErrorResponse;

export async function fetchApi<TResponse>({
  endpoint,
  options,
}: {
  endpoint: string;
  options?: RequestInit;
}): Promise<ApiResponse<TResponse>> {
  const defaultErrorMessage = "Something went wrong";

  try {
    const response = await fetch(`http://localhost:3000/${endpoint}`, options);

    if (!response.ok) {
      const error = await response.json();
      return { ok: false, message: error.error ?? defaultErrorMessage };
    }

    const data = await response.json();
    return { ok: true, data };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_error: unknown) {
    return {
      ok: false,
      message: defaultErrorMessage,
    };
  }
}
