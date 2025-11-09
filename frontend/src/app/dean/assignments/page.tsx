"use client";

import * as React from "react";
import {
  Container,
  Typography,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";

export default function DeanAssignmentsPage() {
  const [accounts, setAccounts] = React.useState<any[]>([]);
  const [classes, setClasses] = React.useState<any[]>([]);
  const [teacherId, setTeacherId] = React.useState<number | "">("");
  const [assignments, setAssignments] = React.useState<any[]>([]);
  const [className, setClassName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const authHeaders = React.useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  async function loadAccounts() {
    setError(null);
    try {
      const r = await fetch("/api/teachers/accounts", { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load teacher accounts");
      setAccounts(await r.json());
    } catch (e: any) {
      setError(e.message || "Failed to load teacher accounts");
    }
  }

  async function loadClasses() {
    setError(null);
    try {
      const r = await fetch("/api/settings/academics/classes", { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load classes");
      setClasses(await r.json());
    } catch (e: any) {
      setError(e.message || "Failed to load classes");
    }
  }

  async function loadAssignments(tid: number) {
    setError(null);
    try {
      const r = await fetch(`/api/teachers/${tid}/assignments`, { credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to load assignments");
      setAssignments(await r.json());
    } catch (e: any) {
      setError(e.message || "Failed to load assignments");
    }
  }

  React.useEffect(() => {
    loadAccounts();
    loadClasses();
  }, []);

  React.useEffect(() => {
    if (typeof teacherId === "number") loadAssignments(teacherId);
    else setAssignments([]);
  }, [teacherId]);

  async function ensureTeacherAndSelect(account: any) {
    // If account already mapped to teacher_id, use it; else create
    if (account.teacher_id) {
      setTeacherId(account.teacher_id);
      return;
    }
    try {
      setLoading(true);
      const r = await fetch("/api/teachers/from-user", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ user_id: account.user_id }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.detail || "Failed to create teacher record");
      }
      const t = await r.json();
      // refresh accounts to reflect new mapping
      await loadAccounts();
      setTeacherId(t.id);
    } catch (e: any) {
      setError(e.message || "Failed to create teacher from user");
    } finally {
      setLoading(false);
    }
  }

  async function addAssignment() {
    if (typeof teacherId !== "number") { setError("Select a teacher"); return; }
    if (!className || !subject) { setError("Class and Subject are required"); return; }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/teachers/assignments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ teacher_id: teacherId, class_name: className, subject }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body?.detail || "Failed to add assignment");
      }
      setSubject("");
      await loadAssignments(teacherId);
    } catch (e: any) {
      setError(e.message || "Failed to add assignment");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAssignment(id: number) {
    if (typeof teacherId !== "number") return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/teachers/assignments/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
      if (!r.ok) throw new Error("Failed to delete");
      await loadAssignments(teacherId);
    } catch (e: any) {
      setError(e.message || "Failed to delete assignment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Dean • Teacher Assignments</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl size="small" sx={{ minWidth: 320 }}>
            <InputLabel id="teacher">Teacher Account</InputLabel>
            <Select
              labelId="teacher"
              label="Teacher Account"
              value={teacherId as any}
              onChange={(e) => setTeacherId(e.target.value as number)}
              renderValue={(val) => {
                const acc = accounts.find(a => a.teacher_id === val);
                return acc ? `${acc.full_name || acc.email} • ${acc.email}` : (val ? `Teacher #${val}` : "");
              }}
            >
              {accounts.map((a) => (
                <MenuItem key={a.user_id} value={a.teacher_id || 0} onClick={() => ensureTeacherAndSelect(a)}>
                  {a.full_name || a.email} • {a.email}
                  {!a.teacher_id ? "  (create teacher)" : ""}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="class">Class</InputLabel>
            <Select labelId="class" label="Class" value={className} onChange={(e) => setClassName(e.target.value)}>
              {classes.map((c: any) => (
                <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField size="small" label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} sx={{ minWidth: 200 }} />
          <Button variant="contained" onClick={addAssignment} disabled={loading || typeof teacherId !== "number"}>Add Assignment</Button>
        </Stack>
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Assignments</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Class</TableCell>
              <TableCell>Subject</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {assignments.map((a: any) => (
              <TableRow key={a.id} hover>
                <TableCell>{a.class_name}</TableCell>
                <TableCell>{a.subject}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" onClick={() => deleteAssignment(a.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {assignments.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>No assignments</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
}
