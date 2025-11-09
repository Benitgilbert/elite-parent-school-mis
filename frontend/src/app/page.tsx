"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        let headers: Record<string, string> = {};
        try {
          const t = localStorage.getItem("access_token");
          if (t) headers["Authorization"] = `Bearer ${t}`;
        } catch {}
        const res = await fetch("/api/users/me", { credentials: "include", headers });
        if (!res.ok) {
          router.replace("/login");
          return;
        }
        const me = await res.json();
        const roles: string[] = me?.roles || [];
        if (roles.includes("Dean") || roles.includes("Director of Studies")) {
          router.replace("/dean");
          return;
        }
        if (roles.includes("Registrar/Secretary") || roles.includes("Secretary")) {
          router.replace("/secretary");
          return;
        }
        if (roles.includes("Teacher")) {
          router.replace("/teacher");
          return;
        }
        router.replace("/me");
      } catch {
        router.replace("/login");
      }
    })();
  }, [router]);

  return null;
}
