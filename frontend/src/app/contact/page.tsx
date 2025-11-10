"use client";

import * as React from "react";
import { Container, Typography, Paper, Stack, TextField, Button, Alert } from "@mui/material";

export default function ContactPage() {
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [sent, setSent] = React.useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // No backend mail endpoint wired; fall back to mailto
    const subject = encodeURIComponent(`Inquiry from ${name || "Website"}`);
    const body = encodeURIComponent(`${message}\n\nFrom: ${name} <${email}>`);
    window.location.href = `mailto:school@example.com?subject=${subject}&body=${body}`;
    setSent(true);
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Contact Us</Typography>
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography paragraph>
          Have questions about admissions, academics, or accounts? Send us a message and we’ll get back to you.
        </Typography>
        {sent && <Alert severity="success" sx={{ mb: 2 }}>Opening your email app... You can also reach us at school@example.com</Alert>}
        <form onSubmit={submit}>
          <Stack spacing={2}>
            <TextField label="Your Name" value={name} onChange={(e) => setName(e.target.value)} required />
            <TextField label="Your Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField label="Message" value={message} onChange={(e) => setMessage(e.target.value)} multiline minRows={4} required />
            <Button type="submit" variant="contained">Send</Button>
          </Stack>
        </form>
      </Paper>
    </Container>
  );
}
