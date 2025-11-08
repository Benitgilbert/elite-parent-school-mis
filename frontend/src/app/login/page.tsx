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
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8000" + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.detail ?? `Login failed (${res.status})`);
      }
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
