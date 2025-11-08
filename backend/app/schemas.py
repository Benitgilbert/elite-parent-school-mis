from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginIn(BaseModel):
    email: str
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    is_active: bool | None = None
    roles: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class RoleOut(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    email: str
    full_name: str | None = None
    password: str
    role_names: list[str] = []


class UserUpdate(BaseModel):
    full_name: str | None = None
    is_active: bool | None = None
    password: str | None = None
    role_names: list[str] | None = None


class StudentBase(BaseModel):
    admission_no: str
    first_name: str
    last_name: str
    date_of_birth: str | None = None  # ISO date string
    gender: str | None = None
    class_name: str | None = None
    guardian_contact: str | None = None


class StudentCreate(StudentBase):
    pass


class StudentUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    date_of_birth: str | None = None
    gender: str | None = None
    class_name: str | None = None
    guardian_contact: str | None = None


class StudentOut(BaseModel):
    id: int
    admission_no: str
    first_name: str
    last_name: str
    date_of_birth: str | None = None
    gender: str | None = None
    class_name: str | None = None
    guardian_contact: str | None = None

    model_config = ConfigDict(from_attributes=True)


class ApplicationCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: str | None = None
    gender: str | None = None
    class_name: str | None = None
    guardian_contact: str | None = None
    email: str | None = None


class ApplicationOut(BaseModel):
    id: int
    reference: str
    first_name: str
    last_name: str
    date_of_birth: str | None = None
    gender: str | None = None
    class_name: str | None = None
    guardian_contact: str | None = None
    email: str | None = None
    status: str

    model_config = ConfigDict(from_attributes=True)


class ApplicationApprove(BaseModel):
    admission_no: str
    class_name: str | None = None


class ApplicationReject(BaseModel):
    reason: str
