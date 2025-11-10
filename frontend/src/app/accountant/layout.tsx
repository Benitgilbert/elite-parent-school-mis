"use client";

import * as React from "react";
import Link from "next/link";
import {
  AppBar,
  Box,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const drawerWidth = 260;

export default function AccountantLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const handleDrawerToggle = () => setMobileOpen((p) => !p);

  async function doLogout() {
    try { localStorage.removeItem("access_token"); } catch {}
    try { await fetch("/api/auth/logout", { method: "POST", credentials: "include" }); } catch {}
    window.location.href = "/login";
  }

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6">Accountant</Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/accountant">
            <ListItemText primary="Overview" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/accountant/fees">
            <ListItemText primary="Fee Collection" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/accountant/expenses">
            <ListItemText primary="Expenses" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/accountant/payroll">
            <ListItemText primary="Payroll" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/accountant/reports">
            <ListItemText primary="Reports & Analytics" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/accountant/settings">
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>Elite Parent School • Accountant</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Link href="/me" style={{ color: "inherit", textDecoration: "none", marginRight: 12 }}>My Account</Link>
          <Button color="inherit" onClick={doLogout}>Logout</Button>
        </Toolbar>
      </AppBar>
      <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
        <Drawer variant="temporary" open={mobileOpen} onClose={handleDrawerToggle} ModalProps={{ keepMounted: true }} sx={{ display: { xs: "block", sm: "none" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth }}}>
          {drawer}
        </Drawer>
        <Drawer variant="permanent" sx={{ display: { xs: "none", sm: "block" }, "& .MuiDrawer-paper": { boxSizing: "border-box", width: drawerWidth }}} open>
          {drawer}
        </Drawer>
      </Box>
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
