import re
import socket
from typing import Any

from ldap3 import ALL, SUBTREE, Connection, Server
from ldap3.core.exceptions import LDAPException

from app.core.config import Settings
from app.services.network_scan import detect_subnet, scan_network
from app.services.reports import get_local_ip


def _parse_ous(settings: Settings) -> list[str]:
    if settings.ad_search_ous.strip():
        return [x.strip() for x in settings.ad_search_ous.split(";") if x.strip()]
    if settings.ad_base_dn.strip():
        return [settings.ad_base_dn.strip()]
    return []


def _bind_user(settings: Settings) -> str | None:
    if settings.ad_bind_user.strip():
        return settings.ad_bind_user.strip()
    if settings.ad_domain.strip():
        return f"{settings.ad_bind_user.split('@')[0] if '@' in settings.ad_bind_user else 'pm-service'}@{settings.ad_domain.strip()}"
    return None


def get_ad_connection(settings: Settings) -> Connection | None:
    if not settings.ad_enabled:
        return None
    host = settings.ad_server.strip() or settings.ad_domain.strip()
    if not host:
        return None

    server = Server(host, get_info=ALL, connect_timeout=5)
    user = settings.ad_bind_user.strip() or None
    password = settings.ad_bind_password or None

    try:
        conn = Connection(server, user=user, password=password, auto_bind=True, receive_timeout=10)
        return conn if conn.bound else None
    except LDAPException:
        return None


def _ou_label(dn: str) -> str:
    parts = []
    for chunk in dn.split(","):
        chunk = chunk.strip()
        if chunk.upper().startswith("OU="):
            parts.append(chunk[3:])
    return " / ".join(reversed(parts)) if parts else dn


def list_ad_ous(settings: Settings) -> dict[str, Any]:
    if not settings.ad_enabled:
        return {"connected": False, "message": "Active Directory غیرفعال است", "ous": []}

    conn = get_ad_connection(settings)
    if not conn:
        return {"connected": False, "message": "اتصال به AD برقرار نشد — تنظیمات .env را بررسی کنید", "ous": []}

    base = settings.ad_base_dn.strip() or conn.server.info.other.get("defaultNamingContext", [""])[0]
    configured = _parse_ous(settings)
    ous: list[dict] = []

    try:
        if configured:
            for dn in configured:
                conn.search(dn, "(objectClass=organizationalUnit)", SUBTREE, attributes=["distinguishedName", "name", "description"])
                if conn.entries:
                    for entry in conn.entries:
                        ous.append({
                            "dn": str(entry.distinguishedName),
                            "name": str(entry.name),
                            "label": _ou_label(str(entry.distinguishedName)),
                            "description": str(entry.description) if entry.description else None,
                            "configured": True,
                        })
                else:
                    ous.append({"dn": dn, "name": _ou_label(dn), "label": _ou_label(dn), "configured": True})
        else:
            conn.search(base, "(objectClass=organizationalUnit)", SUBTREE, attributes=["distinguishedName", "name", "description"])
            for entry in conn.entries[:100]:
                ous.append({
                    "dn": str(entry.distinguishedName),
                    "name": str(entry.name),
                    "label": _ou_label(str(entry.distinguishedName)),
                    "description": str(entry.description) if entry.description else None,
                    "configured": False,
                })
    finally:
        conn.unbind()

    return {
        "connected": True,
        "message": "اتصال برقرار",
        "base_dn": base,
        "ous": ous,
    }


def list_ad_computers(settings: Settings, ou_dn: str | None = None) -> dict[str, Any]:
    if not settings.ad_enabled:
        return {"connected": False, "computers": [], "message": "AD غیرفعال"}

    conn = get_ad_connection(settings)
    if not conn:
        return {"connected": False, "computers": [], "message": "اتصال AD ناموفق"}

    targets = [ou_dn] if ou_dn else _parse_ous(settings)
    if not targets:
        base = settings.ad_base_dn.strip()
        targets = [base] if base else []

    computers: list[dict] = []
    try:
        for base_dn in targets:
            if not base_dn:
                continue
            conn.search(
                base_dn,
                "(&(objectCategory=computer)(objectClass=computer))",
                SUBTREE,
                attributes=["cn", "dNSHostName", "operatingSystem", "operatingSystemVersion", "distinguishedName", "lastLogonTimestamp"],
            )
            for entry in conn.entries:
                hostname = str(entry.dNSHostName) if entry.dNSHostName else str(entry.cn)
                ip = None
                if hostname:
                    try:
                        ip = socket.gethostbyname(hostname.split(".")[0] if "." not in hostname and settings.ad_domain else hostname)
                    except Exception:
                        if settings.ad_domain and "." not in hostname:
                            try:
                                ip = socket.gethostbyname(f"{hostname}.{settings.ad_domain}")
                            except Exception:
                                pass
                computers.append({
                    "name": str(entry.cn),
                    "hostname": hostname,
                    "ip_address": ip,
                    "os_name": str(entry.operatingSystem) if entry.operatingSystem else None,
                    "os_version": str(entry.operatingSystemVersion) if entry.operatingSystemVersion else None,
                    "ou": _ou_label(str(entry.distinguishedName)),
                    "dn": str(entry.distinguishedName),
                })
    finally:
        conn.unbind()

    return {"connected": True, "computers": computers, "count": len(computers)}


def discover_network_and_ad(settings: Settings, ou_dn: str | None = None) -> dict[str, Any]:
    local_ip = get_local_ip()
    subnet = settings.network_scan_subnet or detect_subnet(local_ip)
    network = scan_network(subnet)

    ad_result = list_ad_computers(settings, ou_dn) if settings.ad_enabled else {"connected": False, "computers": [], "message": "AD غیرفعال"}

    network_ips = {h["ip"]: h for h in network["online_hosts"]}
    ad_by_ip = {c["ip_address"]: c for c in ad_result.get("computers", []) if c.get("ip_address")}
    ad_by_host = {c["hostname"].lower().split(".")[0]: c for c in ad_result.get("computers", []) if c.get("hostname")}

    merged: list[dict] = []
    seen_ips: set[str] = set()

    for ip, host in network_ips.items():
        ad_match = ad_by_ip.get(ip)
        if not ad_match and host.get("hostname"):
            ad_match = ad_by_host.get(host["hostname"].lower().split(".")[0])
        merged.append({
            "ip": ip,
            "hostname": host.get("hostname") or (ad_match.get("hostname") if ad_match else None),
            "open_ports": host.get("open_ports", []),
            "source": "network+ad" if ad_match else "network",
            "ad_name": ad_match.get("name") if ad_match else None,
            "ou": ad_match.get("ou") if ad_match else None,
            "os_name": ad_match.get("os_name") if ad_match else None,
        })
        seen_ips.add(ip)

    for comp in ad_result.get("computers", []):
        ip = comp.get("ip_address")
        if ip and ip not in seen_ips:
            merged.append({
                "ip": ip,
                "hostname": comp.get("hostname"),
                "open_ports": [],
                "source": "ad",
                "ad_name": comp.get("name"),
                "ou": comp.get("ou"),
                "os_name": comp.get("os_name"),
            })
            seen_ips.add(ip)
        elif not ip:
            merged.append({
                "ip": None,
                "hostname": comp.get("hostname"),
                "open_ports": [],
                "source": "ad",
                "ad_name": comp.get("name"),
                "ou": comp.get("ou"),
                "os_name": comp.get("os_name"),
            })

    merged.sort(key=lambda x: (x["ip"] or "zzz", x.get("hostname") or ""))

    return {
        "subnet": network["subnet"],
        "local_ip": local_ip,
        "scanned_hosts": network["scanned_hosts"],
        "online_count": network["online_count"],
        "duration_ms": network["duration_ms"],
        "ad_connected": ad_result.get("connected", False),
        "ad_message": ad_result.get("message"),
        "ad_computer_count": ad_result.get("count", len(ad_result.get("computers", []))),
        "devices": merged,
    }
