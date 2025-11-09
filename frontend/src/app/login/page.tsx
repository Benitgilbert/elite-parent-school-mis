"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const payload = {
        email: data.email.trim().toLowerCase(),
        password: data.password.trim(),
      };
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `Login failed (${res.status})`);
      }
      // store token as a fallback if cookies aren't forwarded
      const body = await res.json().catch(() => ({}));
      if (body?.access_token) {
        try { localStorage.setItem("access_token", body.access_token); } catch {}
      }
      // determine landing route based on roles
      try {
        const meRes = await fetch("/api/users/me", { credentials: "include", headers: body?.access_token ? { Authorization: `Bearer ${body.access_token}` } : undefined });
        if (meRes.ok) {
          const me = await meRes.json();
          const roles: string[] = me?.roles ?? [];
          if (roles.includes("IT Support")) return router.push("/admin");
          if (roles.includes("Registrar/Secretary")) return router.push("/secretary");
        }
      } catch {}
      router.push("/me");
    } catch (e: any) {
      setError(e.message ?? "Login failed");
    }
  };

  return (
    <main style={{ maxWidth: 360, margin: "64px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1>Login</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input type="email" {...register("email")} style={{ width: "100%" }} />
          {errors.email && <p style={{ color: "crimson" }}>{errors.email.message}</p>}
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input type="password" {...register("password")} style={{ width: "100%" }} />
          {errors.password && <p style={{ color: "crimson" }}>{errors.password.message}</p>}
        </div>
        {error && <p style={{ color: "crimson" }}>{error}</p>}
        <button disabled={isSubmitting} type="submit">{isSubmitting ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}
