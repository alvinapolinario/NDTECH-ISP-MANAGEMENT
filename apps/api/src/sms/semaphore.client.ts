const SEMAPHORE_API_BASE = 'https://api.semaphore.co/api/v4';

export type SemaphoreMessageResponse = {
  message_id: number | string;
  recipient: string;
  message: string;
  sender_name?: string;
  network?: string;
  status: string;
  type?: string;
  created_at?: string;
  updated_at?: string;
};

export type SemaphoreAccountResponse = {
  account_id: number;
  account_name: string;
  credit_balance: number;
  status: string;
};

export class SemaphoreClient {
  constructor(
    private readonly apiKey: string,
    private readonly defaultSenderName?: string,
  ) {}

  async sendMessage(params: {
    number: string | string[];
    message: string;
    senderName?: string;
  }): Promise<SemaphoreMessageResponse[]> {
    const numbers = Array.isArray(params.number)
      ? params.number.join(',')
      : params.number;

    const body = new URLSearchParams({
      apikey: this.apiKey,
      number: numbers,
      message: params.message,
    });

    const senderName = params.senderName ?? this.defaultSenderName;
    if (senderName) {
      body.set('sendername', senderName);
    }

    const response = await fetch(`${SEMAPHORE_API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const payload = await this.readJson(response);
    if (!response.ok) {
      throw new Error(this.extractError(payload, response.status));
    }

    return Array.isArray(payload) ? payload : [payload];
  }

  async getAccount(): Promise<SemaphoreAccountResponse> {
    const url = new URL(`${SEMAPHORE_API_BASE}/account`);
    url.searchParams.set('apikey', this.apiKey);

    const response = await fetch(url);
    const payload = await this.readJson(response);

    if (!response.ok) {
      throw new Error(this.extractError(payload, response.status));
    }

    return payload as SemaphoreAccountResponse;
  }

  private async readJson(response: Response) {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  private extractError(payload: unknown, status: number) {
    if (payload && typeof payload === 'object') {
      const record = payload as Record<string, unknown>;
      const message = record.message ?? record.error ?? record.apikey;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }
    }

    return `Semaphore API request failed (${status})`;
  }
}
