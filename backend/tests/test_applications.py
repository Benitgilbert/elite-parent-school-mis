from __future__ import annotations

from .helpers import login

def test_public_application_and_secretary_flow(client):
    # submit application (public)
    payload = {
        "first_name": "Jane",
        "last_name": "Doe",
        "date_of_birth": "2011-02-10",
        "gender": "F",
        "class_name": "P4",
        "guardian_contact": "+256700000010",
        "email": "parent@example.com",
    }
    res = client.post("/public/applications/", json=payload)
    assert res.status_code == 201, res.text
    app = res.json()

    # secretary (admin fixture has all roles) lists pending
    login(client)
    res = client.get("/secretary/applications/?status=pending")
    assert any(a["id"] == app["id"] for a in res.json())

    # approve -> creates student
    res = client.post(f"/secretary/applications/{app['id']}/approve", json={"admission_no": "ADM100", "class_name": "P4"})
    assert res.status_code == 200
    student = res.json()
    assert student["admission_no"] == "ADM100"

    # application no longer pending
    res = client.get("/secretary/applications/?status=pending")
    assert not any(a["id"] == app["id"] for a in res.json())
