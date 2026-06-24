"use client";

import { FormEvent, useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { storeAuthUser } from "@/lib/auth-user";
import { apiRequest } from "@/lib/api";

type ProfileForm = {
  name: string;
  email: string;
  mobileNumber: string;
  currentPassword: string;
  password: string;
};

type ProfileResponse = {
  id: number;
  name: string;
  email: string;
  mobileNumber?: string | null;
  status: string;
  roles: Array<{ id: number; name: string }>;
};

type UserProfileModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
};

const emptyForm: ProfileForm = {
  name: "",
  email: "",
  mobileNumber: "",
  currentPassword: "",
  password: "",
};

export function UserProfileModal({
  open,
  onClose,
  onSaved,
}: UserProfileModalProps) {
  const [form, setForm] = useState<ProfileForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;

    setError("");
    setMessage("");
    setLoading(true);

    apiRequest<ProfileResponse>("/auth/me")
      .then((profile) => {
        setForm({
          name: profile.name,
          email: profile.email,
          mobileNumber: profile.mobileNumber ?? "",
          currentPassword: "",
          password: "",
        });
      })
      .catch((caught) => {
        setError(
          caught instanceof Error ? caught.message : "Unable to load profile",
        );
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    const body: Record<string, string> = {
      name: form.name.trim(),
      email: form.email.trim(),
      mobileNumber: form.mobileNumber.trim(),
    };

    if (form.password) {
      body.currentPassword = form.currentPassword;
      body.password = form.password;
    }

    try {
      const profile = await apiRequest<ProfileResponse>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      });

      storeAuthUser({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        mobileNumber: profile.mobileNumber,
        status: profile.status,
        roles: profile.roles,
      });

      setMessage("Profile updated.");
      onSaved?.();
      setTimeout(() => onClose(), 600);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save profile");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      title="My Profile"
      description="Update your account details. Leave password fields blank to keep your current password."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Name</span>
          <input
            required
            value={form.name}
            onChange={(event) =>
              setForm((current) => ({ ...current, name: event.target.value }))
            }
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) =>
              setForm((current) => ({ ...current, email: event.target.value }))
            }
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm md:col-span-2">
          <span className="font-medium">Mobile Number</span>
          <input
            value={form.mobileNumber}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                mobileNumber: event.target.value,
              }))
            }
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Current Password</span>
          <input
            type="password"
            value={form.currentPassword}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                currentPassword: event.target.value,
              }))
            }
            placeholder="Required only when changing password"
            className="rounded-md border px-3 py-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">New Password</span>
          <input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({ ...current, password: event.target.value }))
            }
            placeholder="Leave blank to keep current password"
            className="rounded-md border px-3 py-2"
          />
        </label>

        {message ? (
          <div className="md:col-span-2 rounded-md border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {message}
          </div>
        ) : null}
        {error ? (
          <div className="md:col-span-2 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex gap-3 md:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-300"
          >
            {loading ? "Saving..." : "Save Profile"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </Modal>
  );
}
