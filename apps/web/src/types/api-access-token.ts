export type ApiAccessTokenStatus = "active" | "revoked" | "expired";

export type ApiAccessTokenUser = {
  id: number;
  name: string;
  email: string;
  status?: string;
};

export type ApiAccessToken = {
  id: number;
  userId: number;
  label: string | null;
  deviceId: string | null;
  status: ApiAccessTokenStatus;
  expiresAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  user: ApiAccessTokenUser;
};

export type ApiAccessTokenListResponse = {
  items: ApiAccessToken[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export type CreateApiAccessTokenResponse = {
  token: string;
  tokenType: "Bearer";
  expiresAt: string;
  user: ApiAccessTokenUser;
};

export type ApiAccessTokenListParams = {
  page?: number;
  limit?: number;
  search?: string;
  filter?: ApiAccessTokenStatus | "";
  userId?: number | "";
};
