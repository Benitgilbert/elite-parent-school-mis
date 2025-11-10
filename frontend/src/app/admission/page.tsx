"use client";

import * as React from "react";
import Link from "next/link";
import { Container, Typography, Paper, Stack, Button, List, ListItem, ListItemText } from "@mui/material";

export default function AdmissionPage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Admission</Typography>
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography paragraph>
          Welcome to Elite Parent School. Our admission process is simple and can be completed online.
        </Typography>
        <List dense>
          <ListItem><ListItemText primary="1. Submit an online application form" /></ListItem>
          <ListItem><ListItemText primary="2. Track the status of your application" /></ListItem>
          <ListItem><ListItemText primary="3. Receive approval and admission number via email" /></ListItem>
        </List>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
          <Button component={Link as any} href="/apply" variant="contained">Apply Now</Button>
          <Button component={Link as any} href="/apply/status" variant="outlined">Check Application Status</Button>
          <Button component={Link as any} href="/contact" variant="text">Need Help? Contact Us</Button>
        </Stack>
      </Paper>
    </Container>
  );
}
