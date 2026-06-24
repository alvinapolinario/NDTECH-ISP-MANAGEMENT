import type { CustomerSummary } from "@/types/customer";
import type { InventoryItem, Warehouse } from "@/types/inventory";
import type { StaffUserSummary } from "@/types/staff";

export type ProjectStatus = "planning" | "active" | "on_hold" | "completed" | "cancelled";
export type ProjectType =
  | "expansion"
  | "backbone"
  | "customer_install"
  | "maintenance"
  | "other"
  | "cctv"
  | "solar"
  | "outsourced";

export const OUTSOURCED_PROJECT_TYPES: ProjectType[] = [
  "cctv",
  "solar",
  "outsourced",
];
export type ProjectEstimateStatus = "draft" | "approved" | "rejected" | "expired";
export type ProjectBomStatus = "draft" | "approved" | "issued" | "cancelled";
export type ProjectCostingStatus = "draft" | "final";

export type Project = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  projectType: ProjectType;
  status: ProjectStatus;
  customerId?: number | null;
  location?: string | null;
  startDate?: string | null;
  targetDate?: string | null;
  completedAt?: string | null;
  budget: string | number;
  managerName?: string | null;
  contractorUserId?: number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerSummary | null;
  contractor?: StaffUserSummary | null;
  _count?: { estimates: number; boms: number; materialUsages: number };
};

export type ProjectSummary = Pick<Project, "id" | "code" | "name" | "status" | "budget">;

export type ProjectEstimateItem = {
  id: number;
  itemId?: number | null;
  description: string;
  quantity: string | number;
  unit: string;
  unitCost: string | number;
  notes?: string | null;
  item?: Pick<InventoryItem, "id" | "code" | "name" | "unit"> | null;
};

export type ProjectEstimate = {
  id: number;
  projectId: number;
  estimateNumber: string;
  status: ProjectEstimateStatus;
  validUntil?: string | null;
  laborCost: string | number;
  overheadCost: string | number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  project: ProjectSummary;
  items: ProjectEstimateItem[];
};

export type ProjectBomItem = {
  id: number;
  itemId: number;
  quantity: string | number;
  estimatedUnitCost: string | number;
  notes?: string | null;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unit">;
};

export type ProjectBom = {
  id: number;
  projectId: number;
  bomNumber: string;
  status: ProjectBomStatus;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  project: ProjectSummary;
  items: ProjectBomItem[];
};

export type ProjectMaterialUsageItem = {
  id: number;
  itemId: number;
  quantity: string | number;
  unitCost: string | number;
  notes?: string | null;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unit">;
};

export type ProjectMaterialUsage = {
  id: number;
  projectId: number;
  warehouseId: number;
  usageNumber: string;
  usedDate: string;
  usedBy?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  project: ProjectSummary;
  warehouse: Warehouse;
  items: ProjectMaterialUsageItem[];
};

export type ProjectCosting = {
  id: number;
  projectId: number;
  status: ProjectCostingStatus;
  laborCost: string | number;
  overheadCost: string | number;
  otherCost: string | number;
  materialCost: number;
  totalCost: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  project: ProjectSummary;
};

export type ListResponse<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number };
};
