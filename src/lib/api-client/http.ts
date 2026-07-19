export type ApiSuccess<T> = {
    success: true;
    message?: string;
    data: T;
    meta?: { page: number; limit: number; total: number };
};

export type ApiError = {
    success: false;
    message: string;
    errors?: Record<string, string[]>;
};

export class ApiRequestError extends Error {
  status: number;
  fieldErrors?: Record<string, string[]>;

  constructor(message: string, status: number, fieldErrors?: Record<string, string[]>) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const json = (await response.json().catch(() => null)) as| ApiSuccess<T>| ApiError| null;

  if (!response.ok || !json || json.success === false) {
    const message = json?.message ?? "Có lỗi xảy ra, vui lòng thử lại";
    const errors = json && "errors" in json ? json.errors : undefined;
    throw new ApiRequestError(message, response.status, errors);
  }

  return json.data;
}

export async function apiFetchPaginated<T>(
  path: string,
  init?: RequestInit,
): Promise<{ data: T; meta: { page: number; limit: number; total: number } }> {
  const response = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const json = (await response.json().catch(() => null)) as| ApiSuccess<T>| ApiError| null;

  if (!response.ok || !json || json.success === false) {
    const message = json?.message ?? "Có lỗi xảy ra, vui lòng thử lại";
    const errors = json && "errors" in json ? json.errors : undefined;
    throw new ApiRequestError(message, response.status, errors);
  }

  return { data: json.data, meta: json.meta ?? { page: 1, limit: 20, total: 0 } };
}