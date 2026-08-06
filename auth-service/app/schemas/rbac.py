from pydantic import BaseModel, Field


class PermissionCreate(BaseModel):
    code: str = Field(min_length=3, max_length=120, pattern=r"^[a-z0-9_:\-]+$")
    description: str | None = None


class RoleCreate(BaseModel):
    name: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9_\-]+$")
    description: str | None = None
    permission_codes: list[str] = Field(default_factory=list)


class GroupCreate(BaseModel):
    name: str = Field(min_length=2, max_length=64, pattern=r"^[a-z0-9_\-]+$")
    description: str | None = None
    role_names: list[str] = Field(default_factory=list)


class AssignRolesRequest(BaseModel):
    role_names: list[str] = Field(min_length=1)


class AssignGroupsRequest(BaseModel):
    group_names: list[str] = Field(min_length=1)


class AssignPermissionsRequest(BaseModel):
    permission_codes: list[str] = Field(min_length=1)


class PermissionOut(BaseModel):
    id: str
    code: str
    description: str | None


class RoleOut(BaseModel):
    id: str
    name: str
    description: str | None
    permissions: list[str] = Field(default_factory=list)


class GroupOut(BaseModel):
    id: str
    name: str
    description: str | None
    roles: list[str] = Field(default_factory=list)
