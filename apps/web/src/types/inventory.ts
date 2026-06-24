export type InventoryItemType = "material" | "equipment" | "consumable" | "tool";
export type InventoryMovementType = "stock_in" | "stock_out" | "transfer" | "return";
export type InventoryAdjustmentType = "increase" | "decrease" | "set";

export type InventoryCategory = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type Warehouse = {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
};

export type InventoryStock = {
  id: number;
  itemId: number;
  warehouseId: number;
  quantity: string | number;
  warehouse: Warehouse;
};

export type InventoryItem = {
  id: number;
  categoryId: number;
  code: string;
  name: string;
  description?: string | null;
  itemType: InventoryItemType;
  unit: string;
  unitCost: string | number;
  reorderLevel: string | number;
  isActive: boolean;
  category: InventoryCategory;
  stocks: InventoryStock[];
};

export type InventoryMovement = {
  id: number;
  itemId: number;
  warehouseId: number;
  toWarehouseId?: number | null;
  movementType: InventoryMovementType;
  quantity: string | number;
  unitCost?: string | number | null;
  referenceType?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
  createdAt: string;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unit">;
  warehouse: Warehouse;
  toWarehouse?: Warehouse | null;
};

export type InventoryAdjustment = {
  id: number;
  itemId: number;
  warehouseId: number;
  adjustmentType: InventoryAdjustmentType;
  quantity: string | number;
  previousQuantity: string | number;
  newQuantity: string | number;
  reason: string;
  notes?: string | null;
  createdAt: string;
  item: Pick<InventoryItem, "id" | "code" | "name" | "unit">;
  warehouse: Warehouse;
};

export type ListResponse<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number };
};
