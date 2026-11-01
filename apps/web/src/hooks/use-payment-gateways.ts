import { apiRequest } from "@/lib/api";

export type PaymentGatewayProviderId =
  | "paymongo"
  | "stripe"
  | "gcash"
  | "maya";

export type PaymentGatewayProviderInfo = {
  id: PaymentGatewayProviderId;
  label: string;
  description: string;
  configured: boolean;
  supported: boolean;
};

export type PaymentGatewayTransaction = {
  id: number;
  provider: PaymentGatewayProviderId;
  externalId: string;
  invoiceId: number;
  customerId: number;
  amount: string;
  currency: string;
  status: "pending" | "paid" | "failed" | "expired" | "cancelled";
  checkoutUrl: string | null;
  paymentId: number | null;
  channel: string | null;
  paidAt: string | null;
  createdAt: string;
  invoice: {
    id: number;
    invoiceNumber: string;
    total: string;
    balance: string;
    status: string;
  };
};

export async function fetchPaymentGatewayProviders() {
  return apiRequest<PaymentGatewayProviderInfo[]>("/payment-gateways/providers");
}

export async function createPaymentGatewayCheckout(payload: {
  invoiceId: number;
  provider?: PaymentGatewayProviderId;
  amount?: number;
}) {
  return apiRequest<PaymentGatewayTransaction>("/payment-gateways/checkout", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchPaymentGatewayWebhookUrl(provider: PaymentGatewayProviderId) {
  return apiRequest<{ provider: string; url: string }>(
    `/payment-gateways/webhook-url/${provider}`,
  );
}
