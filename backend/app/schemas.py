from __future__ import annotations

from datetime import date
from pydantic import BaseModel, ConfigDict, field_serializer


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
    date_of_birth: date | None = None  # Accept date object from DB
    gender: str | None = None
    class_name: str | None = None
    guardian_contact: str | None = None

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('date_of_birth')
    def serialize_date_of_birth(self, value: date | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()


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
    date_of_birth: date | None = None  # Accept date object from DB
    gender: str | None = None
    class_name: str | None = None
    guardian_contact: str | None = None
    email: str | None = None
    status: str

    model_config = ConfigDict(from_attributes=True)

    @field_serializer('date_of_birth')
    def serialize_date_of_birth(self, value: date | None) -> str | None:
        if value is None:
            return None
        return value.isoformat()


class ApplicationApprove(BaseModel):
    admission_no: str
    class_name: str | None = None


class ApplicationReject(BaseModel):
    reason: str


# Communication Schemas
class CommTemplateCreate(BaseModel):
    key: str
    name: str
    description: str | None = None
    subject: str | None = None
    text_body: str | None = None
    html_body: str | None = None
    sms_template: str | None = None
    is_active: bool = True


class CommTemplateResponse(BaseModel):
    id: int
    key: str
    name: str
    description: str | None = None
    subject: str | None = None
    text_body: str | None = None
    html_body: str | None = None
    sms_template: str | None = None
    is_active: bool
    created_by: int
    created_at: str
    updated_at: str | None = None

    model_config = ConfigDict(from_attributes=True)


class MessageSend(BaseModel):
    template_key: str | None = None
    to_email: str | None = None
    to_phone: str | None = None
    subject: str | None = None
    content: str | None = None
    html_content: str | None = None
    sms_content: str | None = None
    parameters: dict | None = None
    send_email: bool = False
    send_sms: bool = False
