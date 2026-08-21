import socket
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    import psutil
except ImportError:
    psutil = None


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def detect_subnet(ip: str) -> str:
    parts = ip.split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.{parts[2]}.0/24"
    return "192.168.1.0/24"


def _ping_host(ip: str, timeout: float = 0.3) -> bool:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(timeout)
        s.connect((ip, 445))
        s.close()
        return True
    except Exception:
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(timeout)
            s.connect((ip, 135))
            s.close()
            return True
        except Exception:
            return False


def _hostname(ip: str) -> str | None:
    try:
        return socket.gethostbyaddr(ip)[0]
    except Exception:
        return None


def scan_network(subnet: str, max_hosts: int = 64) -> dict:
    import time

    start = time.time()
    base = subnet.split("/")[0]
    prefix = ".".join(base.split(".")[:3])
    online: list[dict] = []

    def check(last_octet: int):
        ip = f"{prefix}.{last_octet}"
        if _ping_host(ip):
            return {"ip": ip, "hostname": _hostname(ip), "open_ports": [445]}
        return None

    with ThreadPoolExecutor(max_workers=32) as pool:
        futures = [pool.submit(check, i) for i in range(1, min(max_hosts + 1, 255))]
        for f in as_completed(futures):
            r = f.result()
            if r:
                online.append(r)

    duration_ms = int((time.time() - start) * 1000)
    return {
        "subnet": subnet,
        "scanned_hosts": min(max_hosts, 254),
        "online_count": len(online),
        "online_hosts": online,
        "duration_ms": duration_ms,
    }


def scan_network_interfaces() -> list[dict]:
    results: list[dict] = []
    seen: set[str] = set()

    if psutil:
        for name, addrs in psutil.net_if_addrs().items():
            for addr in addrs:
                if addr.family != socket.AF_INET:
                    continue
                ip = addr.address
                if ip.startswith("127.") or ip in seen:
                    continue
                seen.add(ip)
                results.append({
                    "interface": name,
                    "ip": ip,
                    "is_hospital_range": ip.startswith("10.1."),
                })
        return sorted(results, key=lambda x: (not x["is_hospital_range"], x["ip"]))

    # fallback without psutil
    hostname = socket.gethostname()
    for info in socket.getaddrinfo(hostname, None, socket.AF_INET):
        ip = info[4][0]
        if ip.startswith("127.") or ip in seen:
            continue
        seen.add(ip)
        results.append({
            "interface": "default",
            "ip": ip,
            "is_hospital_range": ip.startswith("10.1."),
        })
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        if ip not in seen:
            results.append({
                "interface": "default",
                "ip": ip,
                "is_hospital_range": ip.startswith("10.1."),
            })
    except Exception:
        pass
    return sorted(results, key=lambda x: (not x["is_hospital_range"], x["ip"]))
