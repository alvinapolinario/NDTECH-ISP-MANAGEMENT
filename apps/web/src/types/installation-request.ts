import type { CustomerSummary } from "@/types/customer";
import type { ServicePlanSummary } from "@/types/service-plan";
import type { StaffUserSummary } from "@/types/staff";

export type InstallationRequestStatus =
  | "pending"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled";

export type InstallationRequestPriority = "low" | "normal" | "high" | "urgent";

export type InstallationRequest = {
  id: number;
  customerId: number;
  servicePlanId?: number | null;
  status: InstallationRequestStatus;
  priority: InstallationRequestPriority;
  requestedDate: string;
  scheduledDate?: string | null;
  completedAt?: string | null;
  assignedInstallerName?: string | null;
  assignedInstallerUserId?: number | null;
  contactNumber?: string | null;
  installationAddress: string;
  mapLocation?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer: CustomerSummary;
  servicePlan?: ServicePlanSummary | null;
  assignedInstaller?: StaffUserSummary | null;
};

export type InstallationRequestListResponse = {
  items: InstallationRequest[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};

export type InstallationRequestListParams = {
  search?: string;
  status?: InstallationRequestStatus | "";
  priority?: InstallationRequestPriority | "";
  page?: number;
  limit?: number;
};

export type InstallationRequestPayload = {
  customerId: number;
  servicePlanId?: number | null;
  status?: InstallationRequestStatus;
  priority?: InstallationRequestPriority;
  requestedDate?: string;
  scheduledDate?: string | null;
  completedAt?: string | null;
  assignedInstallerName?: string | null;
  assignedInstallerUserId?: number | null;
  contactNumber?: string | null;
  installationAddress: string;
  mapLocation?: string | null;
  notes?: string | null;
};
