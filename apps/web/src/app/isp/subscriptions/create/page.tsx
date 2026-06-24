"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateSubscriptionPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/isp/subscriptions?create=1");
  }, [router]);

  return (
    <p className="text-sm text-slate-600">Opening subscription form...</p>
  );
}
