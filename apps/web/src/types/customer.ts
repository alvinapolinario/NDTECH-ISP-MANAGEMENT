export type CustomerSummary = {
  id: number;
  accountNumber: string;
  customerType?: string;
  firstName?: string | null;
  lastName?: string | null;
  businessName?: string | null;
  mobileNumber: string;
  email?: string | null;
  birthDate?: string | null;
  status: string;
  referredByCustomerId?: number | null;
  referredByCustomer?: CustomerSummary | null;
  referredCustomers?: CustomerSummary[];
  documents?: CustomerDocument[];
  createdAt?: string;
};

export type CustomerDisplayNameInput = Pick<
  CustomerSummary,
  "accountNumber" | "firstName" | "lastName" | "businessName"
>;

export type CustomerDocument = {
  id: number;
  customerId: number;
  documentType: string;
  filePath: string;
  uploadedByUserId: number;
  createdAt: string;
  customer?: CustomerSummary;
  uploadedBy?: { id: number; name: string };
};

export type CustomerListResponse = {
  items: CustomerSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
