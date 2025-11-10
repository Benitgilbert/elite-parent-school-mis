from __future__ import annotations

def test_auth_cookie_and_me(client):
    # login using cookie endpoint
    res = client.post("/auth/login", json={"email": "admin@example.com", "password": "secret123"})
    assert res.status_code == 200
    # cookie should be set and /users/me should work without explicit header
    res2 = client.get("/users/me")
    assert res2.status_code == 200
    me = res2.json()
    assert me["email"] == "admin@example.com"
    assert "IT Support" in me.get("roles", [])


def test_admin_user_crud(client):
    # authenticate first
    res = client.post("/auth/login", json={"email": "admin@example.com", "password": "secret123"})
    assert res.status_code == 200
    
    # create
    payload = {
        "email": "teacher1@example.com",
        "full_name": "Teacher One",
        "password": "p@ssw0rd",
        "role_names": ["Teacher"],
    }
    res = client.post("/admin/users", json=payload)
    assert res.status_code == 201, res.text
    u = res.json()
    uid = u["id"]

    # list and ensure present
    res = client.get("/admin/users")
    assert any(x["email"] == payload["email"] for x in res.json())

    # update
    res = client.patch(f"/admin/users/{uid}", json={"full_name": "Teacher Uno", "is_active": False, "role_names": ["Headmaster"]})
    assert res.status_code == 200
    u2 = res.json()
    assert u2["full_name"] == "Teacher Uno"
    assert u2["is_active"] is False
    assert "Headmaster" in u2["roles"] and "Teacher" not in u2["roles"]

    # delete
    res = client.delete(f"/admin/users/{uid}")
    assert res.status_code in (200, 204)

    # confirm gone
    res = client.get("/admin/users")
    assert not any(x["id"] == uid for x in res.json())
