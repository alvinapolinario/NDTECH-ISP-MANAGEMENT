import type { InventoryItem } from "@/types/inventory";
import type { StaffUserSummary } from "@/types/staff";

export type Supplier = {
  id: number;
  code: string;
  name: string;
};

export type PurchaseRequestStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "rejected"
  | "cancelled";

export type PurchaseRequestPriority = "low" | "normal" | "high" | "urgent";

export type PurchaseRequestItem = {
  id: number;
  itemId: number;
  description?: string | null;
  quantity: string | number;
  estimatedUnitCost?: string | number | null;
  notes?: string | null;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unit">;
};

export type PurchaseRequest = {
  id: number;
  requestNumber: string;
  supplierId?: number | null;
  status: PurchaseRequestStatus;
  priority: PurchaseRequestPriority;
  requestedBy?: string | null;
  neededDate?: string | null;
  purpose?: string | null;
  notes?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  rejectedReason?: string | null;
  financeReviewerUserId?: number | null;
  createdAt: string;
  updatedAt: string;
  supplier?: Supplier | null;
  financeReviewer?: StaffUserSummary | null;
  items: PurchaseRequestItem[];
};

export type PurchaseRequestListResponse = {
  items: PurchaseRequest[];
  meta: { total: number; page: number; limit: number };
};

export type PurchaseRequestPayload = {
  requestNumber?: string | null;
  supplierId?: number | null;
  status?: PurchaseRequestStatus;
  priority?: PurchaseRequestPriority;
  requestedBy?: string | null;
  neededDate?: string | null;
  purpose?: string | null;
  notes?: string | null;
  financeReviewerUserId?: number | null;
  items: Array<{
    itemId: number;
    description?: string | null;
    quantity: number;
    estimatedUnitCost?: number | null;
    notes?: string | null;
  }>;
};

export type PurchaseOrderStatus =
  | "draft"
  | "issued"
  | "partially_received"
  | "received"
  | "cancelled";

export type GoodsReceiptStatus = "received" | "cancelled";

export type PurchaseOrderItem = {
  id: number;
  itemId: number;
  description?: string | null;
  quantity: string | number;
  unitCost: string | number;
  receivedQuantity: string | number;
  notes?: string | null;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unit">;
};

export type PurchaseOrder = {
  id: number;
  poNumber: string;
  supplierId: number;
  purchaseRequestId?: number | null;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDate?: string | null;
  paymentTerms?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
  issuedBy?: string | null;
  issuedAt?: string | null;
  cancelledReason?: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: Supplier;
  purchaseRequest?: Pick<PurchaseRequest, "id" | "requestNumber"> | null;
  items: PurchaseOrderItem[];
};

export type PurchaseOrderPayload = {
  poNumber?: string | null;
  supplierId: number;
  purchaseRequestId?: number | null;
  status?: PurchaseOrderStatus;
  orderDate?: string | null;
  expectedDate?: string | null;
  paymentTerms?: string | null;
  deliveryAddress?: string | null;
  notes?: string | null;
  items: Array<{
    itemId: number;
    description?: string | null;
    quantity: number;
    unitCost: number;
    notes?: string | null;
  }>;
};

export type GoodsReceiptItem = {
  id: number;
  purchaseOrderItemId: number;
  itemId: number;
  quantityReceived: string | number;
  unitCost: string | number;
  notes?: string | null;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unit">;
  purchaseOrderItem: Pick<PurchaseOrderItem, "id" | "quantity" | "receivedQuantity" | "unitCost">;
};

export type GoodsReceipt = {
  id: number;
  receiptNumber: string;
  purchaseOrderId: number;
  supplierId: number;
  warehouseId: number;
  status: GoodsReceiptStatus;
  receivedDate: string;
  receivedBy?: string | null;
  deliveryReceiptNo?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  purchaseOrder: Pick<PurchaseOrder, "id" | "poNumber" | "status">;
  supplier: Supplier;
  warehouse: { id: number; code: string; name: string };
  items: GoodsReceiptItem[];
};

export type PurchaseOrderListResponse = {
  items: PurchaseOrder[];
  meta: { total: number; page: number; limit: number };
};

export type GoodsReceiptListResponse = {
  items: GoodsReceipt[];
  meta: { total: number; page: number; limit: number };
};

export type GoodsReceiptPayload = {
  receiptNumber?: string | null;
  purchaseOrderId: number;
  warehouseId: number;
  receivedDate?: string | null;
  receivedBy?: string | null;
  deliveryReceiptNo?: string | null;
  notes?: string | null;
  items: Array<{
    purchaseOrderItemId: number;
    quantityReceived: number;
    unitCost?: number | null;
    notes?: string | null;
  }>;
};
