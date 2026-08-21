from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AssetUpgradeCreate(BaseModel):
    title: str = Field(min_length=1, max_length=300)
    component: Optional[str] = None
    description: Optional[str] = None
    upgraded_at: Optional[datetime] = None


class AssetUpgradeOut(BaseModel):
    id: int
    asset_id: int
    title: str
    component: Optional[str] = None
    description: Optional[str] = None
    upgraded_at: datetime
    upgraded_by: str
    created_at: datetime

    class Config:
        from_attributes = True


class InfraStatusItem(BaseModel):
    key: str
    label: str
    status: str = "ok"
    detail: str = ""


class ITOverviewOut(BaseModel):
    systems_total: int = 0
    systems_healthy: int = 0
    systems_problem: int = 0
    systems_offline: int = 0
    servers_total: int = 0
    servers_healthy: int = 0
    servers_problem: int = 0
    network_total: int = 0
    network_healthy: int = 0
    open_issues: int = 0
    critical_issues: int = 0
    active_services: int = 0
    down_services: int = 0
    infrastructure: list[InfraStatusItem] = []
    recent_events: list[dict] = []


class ITInfrastructureUpdate(BaseModel):
    infrastructure: list[InfraStatusItem]
