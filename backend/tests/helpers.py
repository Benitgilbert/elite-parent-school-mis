from __future__ import annotations

def login(client, email="admin@example.com", password="secret123"):
    res = client.post("/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200
