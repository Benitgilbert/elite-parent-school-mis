"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MePage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        let headers: Record<string, string> = {};
        try {
          const token = localStorage.getItem("access_token");
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}
        const res = await fetch("/api/users/me", { credentials: "include", headers });
        if (!res.ok) {
          throw new Error(`Unauthorized (${res.status})`);
        }
        setData(await res.json());
      } catch (e: any) {
        setError(e.message ?? "Failed to load");
      }
    })();
  }, []);

  useEffect(() => {
    if (!data) return;
    const roles: string[] = data?.roles || [];
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
    if (roles.includes("Student")) {
      router.replace("/student");
      return;
    }
    if (roles.includes("Accountant")) {
      router.replace("/accountant");
      return;
    }
    if (roles.includes("Headmaster")) {
      router.replace("/director");
      return;
    }
    if (roles.includes("Director")) {
      router.replace("/director");
      return;
    }
    if (roles.includes("Director of Discipline")) {
      router.replace("/discipline");
      return;
    }
    if (roles.includes("Patron")) {
      router.replace("/patron");
      return;
    }
    if (roles.includes("Matron")) {
      router.replace("/matron");
      return;
    }
  }, [data, router]);

  if (error) {
    return (
      <main style={{ maxWidth: 640, margin: "64px auto", fontFamily: "system-ui, sans-serif" }}>
        <p>{error}. <Link href="/login">Go to login</Link></p>
      </main>
    );
  }

  if (!data) {
    return <main style={{ maxWidth: 640, margin: "64px auto", fontFamily: "system-ui, sans-serif" }}>Loading...</main>;
  }

  async function doLogout() {
    try { localStorage.removeItem("access_token"); } catch {}
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    router.replace("/login");
  }

  return (
    <main style={{ maxWidth: 640, margin: "64px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Me</h1>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <button onClick={doLogout}>Logout</button>
    </main>
  );
}
