from __future__ import annotations

from .helpers import login

def test_students_crud(client):
    login(client)

    # Create
    payload = {
        "admission_no": "ADM001",
        "first_name": "John",
        "last_name": "Doe",
        "date_of_birth": "2010-01-05",
        "gender": "M",
        "class_name": "P5",
        "guardian_contact": "+256700000001",
    }
    res = client.post("/students/", json=payload)
    assert res.status_code == 201, res.text
    s = res.json()
    sid = s["id"]

    # List
    res = client.get("/students/?skip=0&limit=10")
    assert any(x["admission_no"] == payload["admission_no"] for x in res.json())

    # Get
    res = client.get(f"/students/{sid}")
    assert res.status_code == 200

    # Update
    res = client.patch(f"/students/{sid}", json={"class_name": "P6", "guardian_contact": "+256700000002"})
    assert res.status_code == 200
    s2 = res.json()
    assert s2["class_name"] == "P6"

    # Delete
    res = client.delete(f"/students/{sid}")
    assert res.status_code in (200, 204)

    # Ensure gone
    res = client.get("/students/?skip=0&limit=50")
    assert not any(x["id"] == sid for x in res.json())
