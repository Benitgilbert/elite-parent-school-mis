"use client";

import * as React from "react";
import Link from "next/link";
import { AppBar, Toolbar, Typography, CssBaseline, Drawer, IconButton, Divider, List, ListItem, ListItemButton, ListItemText, Box, Button } from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";

const drawerWidth = 240;

export default function DeanLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const handleDrawerToggle = () => setMobileOpen((p) => !p);

  const drawer = (
    <div>
      <Toolbar>
        <Typography variant="h6">Director of Studies</Typography>
      </Toolbar>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean">
            <ListItemText primary="Overview" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/academic-performance">
            <ListItemText primary="Academic Performance" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/class-reports">
            <ListItemText primary="Class Reports" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/discipline">
            <ListItemText primary="Discipline (Read-only)" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/timetable">
            <ListItemText primary="Timetable" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/report-cards">
            <ListItemText primary="Report Cards" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/settings">
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/assignments">
            <ListItemText primary="Teacher Assignments" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/grade-tracking">
            <ListItemText primary="Grade Entry Tracking" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton component={Link} href="/dean/teachers-performance">
            <ListItemText primary="Teachers Performance" />
          </ListItemButton>
        </ListItem>
      </List>
    </div>
  );

  return (
    <Box sx={{ display: "flex", bgcolor: (t) => t.palette.background.default, color: (t) => t.palette.text.primary, minHeight: "100vh" }}>
      <CssBaseline />
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: "none" } }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>Elite Parent School • Dean</Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
            <Link href="/me" style={{ color: "inherit", textDecoration: "none" }}>My Account</Link>
            <Button color="inherit" component={Link as any} href="/logout" size="small">Logout</Button>
          </Box>
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
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` }, bgcolor: (t) => t.palette.background.default, color: (t) => t.palette.text.primary }}>
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}
