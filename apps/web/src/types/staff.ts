export type StaffUser = {
  id: number;
  name: string;
  email: string;
  mobileNumber?: string | null;
  status: string;
};

export type StaffUserSummary = {
  id: number;
  name: string;
  email: string;
  mobileNumber?: string | null;
};

export const STAFF_ROLE_NAMES = {
  COLLECTOR: "Collector",
  INSTALLER: "Installer",
  FINANCE: "Finance",
  CONTRACTOR: "Contractor",
} as const;
