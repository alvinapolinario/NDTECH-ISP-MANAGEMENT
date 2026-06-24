"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();

  useEffect(() => {
    params.then((resolved) => {
      router.replace(`/isp/subscriptions?edit=${resolved.id}`);
    });
  }, [params, router]);

  return (
    <p className="text-sm text-slate-600">Opening subscription editor...</p>
  );
}
