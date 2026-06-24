export type ServicePlanSummary = {
  id: number;
  code: string;
  name: string;
  monthlyPrice: string | number;
  downloadMbps: number;
  uploadMbps: number;
  isActive: boolean;
};

export type ServicePlanListResponse = {
  items: ServicePlanSummary[];
  meta: {
    total: number;
    page: number;
    limit: number;
  };
};
