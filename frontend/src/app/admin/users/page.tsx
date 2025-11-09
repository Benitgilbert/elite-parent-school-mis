"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
  Select,
  MenuItem,
  Snackbar,
  Alert,
  Switch,
  TablePagination,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";

type Role = { id: number; name: string };

type User = { id: number; email: string; full_name?: string | null; is_active?: boolean | null; roles: string[] };

function useApiBase() {
  // Use Next.js rewrite proxy; keep empty base so we call same-origin /api/*
  return useMemo(() => "", []);
}

export default function AdminUsersPage() {
  const base = useApiBase();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [mounted, setMounted] = useState(false);

  // Add User Dialog
  const [open, setOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: "", full_name: "", password: "", role_names: [] as string[] });

  // Edit User Dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editUser, setEditUser] = useState<{ full_name: string; password: string; role_name: string; is_active: boolean }>({ full_name: "", password: "", role_name: "", is_active: true });

  const authHeaders = useMemo(() => {
    try {
      const t = localStorage.getItem("access_token");
      return t ? { Authorization: `Bearer ${t}` } : {};
    } catch {
      return {} as Record<string, string>;
    }
  }, []);

  const load = async () => {
    setError(null);
    const [r1, r2] = await Promise.all([
      fetch(base + "/api/admin/roles", { credentials: "include", headers: authHeaders }),
      fetch(base + "/api/admin/users", { credentials: "include", headers: authHeaders }),
    ]);
    if (!r1.ok || !r2.ok) {
      throw new Error("Unauthorized or server error");
    }
    setRoles(await r1.json());
    setUsers(await r2.json());
  };

  useEffect(() => {
    setMounted(true);
    load().catch(e => setError(String(e)));
  }, []);

  // Delete confirm
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const openConfirm = (id: number) => { setConfirmId(id); setConfirmOpen(true); };
  const del = async (id: number) => {
    await fetch(base + `/api/admin/users/${id}`, { method: "DELETE", credentials: "include", headers: authHeaders });
    await load();
  };

  if (!mounted) return null;

  return (
    <main>
      <Box sx={{ maxWidth: 1200, mx: "auto", my: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 2, flexWrap: "wrap" }}>
          <Typography variant="h5" sx={{ mr: "auto" }}>Users</Typography>
          <TextField size="small" placeholder="Search by email or name" value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} />
          <Button variant="contained" onClick={() => setOpen(true)}>Add User</Button>
        </Box>

        {error && (
          <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
        )}

        <TableContainer component={Paper} sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Active</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users
                .filter((u) => {
                  const q = query.trim().toLowerCase();
                  if (!q) return true;
                  return (
                    (u.email ?? "").toLowerCase().includes(q) ||
                    (u.full_name ?? "").toLowerCase().includes(q)
                  );
                })
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell>{u.id}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>{u.full_name ?? ""}</TableCell>
                  <TableCell>{String(u.is_active ?? true)}</TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                      {u.roles.map((r) => (
                        <Chip key={r} size="small" label={r} />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => {
                      setEditId(u.id);
                      setEditUser({
                        full_name: u.full_name ?? "",
                        password: "",
                        role_name: u.roles[0] ?? "",
                        is_active: u.is_active ?? true,
                      });
                      setOpenEdit(true);
                    }}>Edit</Button>
                    <Button color="error" size="small" onClick={() => openConfirm(u.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={users.filter((u) => {
            const q = query.trim().toLowerCase();
            if (!q) return true;
            return (
              (u.email ?? "").toLowerCase().includes(q) ||
              (u.full_name ?? "").toLowerCase().includes(q)
            );
          }).length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          sx={{ mt: 1 }}
        />
      </Box>

      {/* Add User Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Create New User</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, my: 1 }}>
            <TextField required label="Full name" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })} fullWidth error={!newUser.full_name.trim()} helperText={!newUser.full_name.trim() ? "Required" : " "} />
            <TextField required label="Email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} fullWidth error={!!newUser.email && !/.+@.+\..+/.test(newUser.email)} helperText={!newUser.email.trim() ? "Required" : (!/.+@.+\..+/.test(newUser.email) ? "Enter a valid email" : " ")} />
            <TextField required label="Password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} fullWidth error={!!newUser.password && newUser.password.length < 6} helperText={!newUser.password ? "Required" : (newUser.password.length < 6 ? "Minimum 6 characters" : " ")} />
            <FormControl required fullWidth>
              <FormLabel sx={{ mb: 0.5 }}>Role</FormLabel>
              <Select
                value={newUser.role_names[0] ?? ""}
                onChange={(e) => setNewUser({ ...newUser, role_names: [String(e.target.value)] })}
                displayEmpty
              >
                <MenuItem value="" disabled>Select role</MenuItem>
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" disabled={
            !newUser.full_name.trim() ||
            !newUser.email.trim() ||
            !newUser.password || newUser.password.length < 6 ||
            !newUser.role_names[0]
          } onClick={async () => {
            setError(null);
            // Basic front-end validation
            const emailOk = /.+@.+\..+/.test(newUser.email);
            if (!emailOk) { setError("Enter a valid email"); return; }
            const res = await fetch(base + "/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...authHeaders },
              credentials: "include",
              body: JSON.stringify(newUser),
            });
            if (!res.ok) {
              const body = await res.json().catch(() => ({} as any));
              setError(body?.detail ?? `Error ${res.status}`);
              return;
            }
            setOpen(false);
            setNewUser({ email: "", full_name: "", password: "", role_names: [] });
            setSuccess("User created");
            await load();
          }}>Create</Button>
        </DialogActions>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} fullWidth maxWidth="sm">
        <DialogTitle>Edit User</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, my: 1 }}>
            <TextField required label="Full name" value={editUser.full_name} onChange={(e) => setEditUser({ ...editUser, full_name: e.target.value })} fullWidth />
            <TextField label="New password" type="password" value={editUser.password} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} fullWidth helperText={editUser.password ? (editUser.password.length < 6 ? "Minimum 6 characters" : " ") : "Optional"} error={!!editUser.password && editUser.password.length < 6} />
            <FormControl fullWidth>
              <FormLabel sx={{ mb: 0.5 }}>Role</FormLabel>
              <Select
                value={editUser.role_name}
                onChange={(e) => setEditUser({ ...editUser, role_name: String(e.target.value) })}
                displayEmpty
              >
                {roles.map((r) => (
                  <MenuItem key={r.id} value={r.name}>{r.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControlLabel control={<Switch checked={editUser.is_active} onChange={(e) => setEditUser({ ...editUser, is_active: e.target.checked })} />} label="Active" />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" disabled={!editUser.full_name.trim() || (!!editUser.password && editUser.password.length < 6) || !editUser.role_name}
            onClick={async () => {
              if (editId == null) return;
              setError(null);
              const payload: any = {
                full_name: editUser.full_name,
                is_active: editUser.is_active,
                role_names: [editUser.role_name],
              };
              if (editUser.password) payload.password = editUser.password;
              const res = await fetch(base + `/api/admin/users/${editId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeaders },
                credentials: "include",
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                const body = await res.json().catch(() => ({} as any));
                setError(body?.detail ?? `Error ${res.status}`);
                return;
              }
              setOpenEdit(false);
              setSuccess("User updated");
              await load();
            }}>Save</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbars */}
      <Snackbar open={!!error} autoHideDuration={4000} onClose={() => setError(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="error" variant="filled" onClose={() => setError(null)}>{error}</Alert>
      </Snackbar>
      <Snackbar open={!!success} autoHideDuration={2500} onClose={() => setSuccess(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" variant="filled" onClose={() => setSuccess(null)}>{success}</Alert>
      </Snackbar>

      {/* Delete Confirmation */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete user?</DialogTitle>
        <DialogContent>
          <Typography>Are you sure you want to delete this user? This action cannot be undone.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={async () => {
            if (confirmId != null) {
              await del(confirmId);
              setSuccess("User deleted");
            }
            setConfirmOpen(false);
          }}>Delete</Button>
        </DialogActions>
      </Dialog>
    </main>
  );
}
