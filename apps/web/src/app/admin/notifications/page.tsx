"use client";

import { CrudPage } from "@/components/admin/crud-page";

type Notification = {
  id: number;
  title: string;
  message: string;
  notificationType: string;
  channel: string;
  isRead: boolean;
  createdAt: string;
  user?: { name: string };
};

export default function NotificationsPage() {
  return (
    <CrudPage<Notification>
      title="Notifications"
      description="Create, update, mark, and delete system notifications."
      endpoint="/notifications"
      formMode="modal"
      searchPlaceholder="Search notifications"
      filterOptions={[
        { label: "System", value: "system" },
        { label: "SMS", value: "sms" },
        { label: "Email", value: "email" },
        { label: "Socket", value: "socket" },
      ]}
      fields={[
        { name: "title", label: "Title", required: true },
        {
          name: "message",
          label: "Message",
          type: "textarea",
          required: true,
        },
        {
          name: "notificationType",
          label: "Notification Type",
          required: true,
        },
        {
          name: "channel",
          label: "Channel",
          type: "select",
          options: [
            { label: "System", value: "system" },
            { label: "SMS", value: "sms" },
            { label: "Email", value: "email" },
            { label: "Socket", value: "socket" },
          ],
        },
        { name: "isRead", label: "Read", type: "checkbox" },
      ]}
      columns={[
        { key: "id", label: "ID" },
        { key: "title", label: "Title" },
        { key: "notificationType", label: "Type" },
        { key: "channel", label: "Channel" },
        {
          key: "isRead",
          label: "Status",
          render: (notification) =>
            notification.isRead ? (
              <span className="text-slate-500">Read</span>
            ) : (
              <span className="font-medium text-emerald-700">Unread</span>
            ),
        },
        {
          key: "createdAt",
          label: "Created",
          render: (notification) =>
            new Date(notification.createdAt).toLocaleString(),
        },
      ]}
    />
  );
}
