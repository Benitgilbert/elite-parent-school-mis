"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Container, Typography, Paper, Stack, Button } from "@mui/material";

// Minimal types matching the planner page
type Config = { term: string; start_time: string; period_minutes: number; days: string[]; blocks: any[] } | null;
type Slot = { id: number; term: string; day_of_week: string; period_index: number; class_name: string; subject: string; room?: string | null; teacher_id?: number | null };

export default function TimetablePrintPage() {
  const params = useSearchParams();
  const term = params.get("term") || "";
  const klass = params.get("class") || "";

  const [config, setConfig] = React.useState<Config>(null);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [loading, setLoading] = React.useState(true);

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [rcfg, rslots] = await Promise.all([
          fetch(`/api/timetable/config?term=${encodeURIComponent(term)}`, { credentials: "include", headers: authHeaders }),
          fetch(`/api/timetable/slots?term=${encodeURIComponent(term)}&class_name=${encodeURIComponent(klass)}`, { credentials: "include", headers: authHeaders }),
        ]);
        if (!cancelled) {
          setConfig(rcfg.ok ? await rcfg.json() : null);
          setSlots(rslots.ok ? await rslots.json() : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [term, klass, authHeaders]);

  const days = config?.days || ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const periods = React.useMemo(() => {
    const total = (config?.blocks || []).reduce((sum: number, b: any) => sum + (b.periods ? Number(b.periods) : 0), 0) || 10;
    return Array.from({ length: total }, (_, i) => i + 1);
  }, [config]);

  React.useEffect(() => {
    if (!loading && typeof window !== "undefined") {
      // Let the page render, then open print dialog
      setTimeout(() => window.print(), 350);
    }
  }, [loading]);

  return (
    <Container maxWidth="lg" sx={{ py: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">Timetable • {klass || "Class"} • {term || "Term"}</Typography>
        <Button variant="outlined" onClick={() => window.print()}>Print</Button>
      </Stack>
      <Paper variant="outlined" sx={{ p: 1 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: 6, border: "1px solid #ddd" }}>Period</th>
              {days.map((d) => (
                <th key={d} style={{ textAlign: "left", padding: 6, border: "1px solid #ddd" }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p}>
                <td style={{ padding: 6, border: "1px solid #ddd" }}>P{p}</td>
                {days.map((d) => {
                  const cell = slots.filter((s) => s.day_of_week === d && s.period_index === p);
                  return (
                    <td key={`${d}${p}`} style={{ padding: 6, border: "1px solid #ddd", verticalAlign: "top" }}>
                      {cell.length === 0 && <span style={{ color: "#999" }}>—</span>}
                      {cell.map((s) => (
                        <div key={s.id}>
                          <strong>{s.subject}</strong>{s.room ? ` • ${s.room}` : ""}
                        </div>
                      ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Paper>
      <style jsx global>{`
        @media print {
          body { background: white; }
          button { display: none !important; }
          header, nav, footer { display: none !important; }
        }
      `}</style>
    </Container>
  );
}
