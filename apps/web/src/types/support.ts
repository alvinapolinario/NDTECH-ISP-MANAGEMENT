import type { CustomerSummary } from "@/types/customer";
import type { Subscription } from "@/types/subscription";

export type TicketStatus = "open" | "assigned" | "in_progress" | "resolved" | "closed" | "cancelled";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TechnicianAssignmentStatus = "assigned" | "accepted" | "in_progress" | "completed" | "cancelled";

export type TicketCategory = {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
};

export type SupportUser = {
  id: number;
  name: string;
  email: string;
  mobileNumber?: string | null;
  status: string;
};

export type TechnicianAssignment = {
  id: number;
  ticketId: number;
  technicianId: number;
  status: TechnicianAssignmentStatus;
  scheduledAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  completionNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  ticket: Pick<Ticket, "id" | "ticketNumber" | "subject" | "status" | "priority">;
  technician: SupportUser;
};

export type Ticket = {
  id: number;
  ticketNumber: string;
  customerId?: number | null;
  subscriptionId?: number | null;
  categoryId: number;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  reportedBy?: string | null;
  contactNumber?: string | null;
  location?: string | null;
  dueAt?: string | null;
  resolvedAt?: string | null;
  resolution?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  customer?: CustomerSummary | null;
  subscription?: Pick<Subscription, "id" | "status"> | null;
  category: Pick<TicketCategory, "id" | "code" | "name">;
  assignments: Array<Omit<TechnicianAssignment, "ticket">>;
};

export type ListResponse<T> = {
  items: T[];
  meta: { total: number; page: number; limit: number };
};

export type TicketPayload = {
  ticketNumber?: string | null;
  customerId?: number | null;
  subscriptionId?: number | null;
  categoryId: number;
  subject: string;
  description: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  reportedBy?: string | null;
  contactNumber?: string | null;
  location?: string | null;
  dueAt?: string | null;
  resolution?: string | null;
  notes?: string | null;
};

export type TechnicianAssignmentPayload = {
  ticketId: number;
  technicianId: number;
  status?: TechnicianAssignmentStatus;
  scheduledAt?: string | null;
  notes?: string | null;
  completionNotes?: string | null;
};
