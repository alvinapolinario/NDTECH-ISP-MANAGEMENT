type ApiErrorBody = {
  message?: string | string[];
  error?: string;
  statusCode?: number;
};

function friendlyStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request was invalid. Please check your input and try again.";
    case 401:
      return "Please sign in to continue.";
    case 403:
      return "You do not have permission to perform this action.";
    case 404:
      return "The requested item could not be found.";
    case 409:
      return "This action conflicts with existing data.";
    case 422:
      return "Some fields failed validation. Please review and try again.";
    case 500:
      return "Something went wrong on the server. Please try again later.";
    default:
      return `Request failed (${status}). Please try again.`;
  }
}

function messageFromBody(body: ApiErrorBody): string | null {
  const { message } = body;

  if (Array.isArray(message)) {
    const joined = message.filter(Boolean).join(". ").trim();
    return joined || null;
  }

  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }

  if (typeof body.error === "string" && body.error.trim()) {
    return body.error.trim();
  }

  return null;
}

export function parseApiErrorText(text: string, status: number): string {
  const fallback = friendlyStatusMessage(status);
  const trimmed = text.trim();

  if (!trimmed) {
    return fallback;
  }

  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return trimmed;
  }

  try {
    const body = JSON.parse(trimmed) as ApiErrorBody;
    return messageFromBody(body) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function readApiErrorMessage(response: Response): Promise<string> {
  const text = await response.text();
  return parseApiErrorText(text, response.status);
}

export class ApiRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
  }
}
