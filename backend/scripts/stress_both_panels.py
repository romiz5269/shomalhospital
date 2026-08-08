"""
Stress both panels (staff + admin) against the live API.

Usage (from repo root, stack already running):
  backend\\.venv\\Scripts\\python backend\\scripts\\stress_both_panels.py
  backend\\.venv\\Scripts\\python backend\\scripts\\stress_both_panels.py --users 50 --rounds 20 --workers 40
"""

from __future__ import annotations

import argparse
import json
import statistics
import threading
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Any


DEFAULT_BASE = "http://127.0.0.1:4000"
PASSWORD = "Stress9pass"
CATEGORIES = ["IT", "MEDICAL_EQUIPMENT", "FACILITIES", "HR", "PHARMACY", "OTHER"]
URGENCIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


@dataclass
class Stats:
    lock: threading.Lock = field(default_factory=threading.Lock)
    ok: int = 0
    fail: int = 0
    statuses: dict[int, int] = field(default_factory=dict)
    latencies_ms: list[float] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)

    def record(self, status: int, ms: float, err: str | None = None) -> None:
        with self.lock:
            self.statuses[status] = self.statuses.get(status, 0) + 1
            self.latencies_ms.append(ms)
            # 409 = already registered (idempotent setup), not a real failure
            if err is None and (200 <= status < 400 or status == 409):
                self.ok += 1
            else:
                self.fail += 1
                if err:
                    self.errors.append(err[:180])


def http_json(
    method: str,
    url: str,
    body: dict | None = None,
    token: str | None = None,
    timeout: float = 30.0,
) -> tuple[int, Any, float]:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    started = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            raw = resp.read()
            ms = (time.perf_counter() - started) * 1000
            payload = json.loads(raw.decode("utf-8")) if raw else None
            return resp.status, payload, ms
    except urllib.error.HTTPError as e:
        ms = (time.perf_counter() - started) * 1000
        raw = e.read()
        try:
            payload = json.loads(raw.decode("utf-8")) if raw else {"error": e.reason}
        except Exception:
            payload = {"error": raw.decode("utf-8", errors="replace")[:200]}
        return e.code, payload, ms
    except Exception as e:  # noqa: BLE001
        ms = (time.perf_counter() - started) * 1000
        return 0, {"error": str(e)}, ms


def ensure_user(base: str, kind: str, idx: int, stats: Stats) -> tuple[str, str]:
    """Register or login; return (email, token)."""
    email = f"{kind}.stress.{idx}@gmail.com"
    if kind == "staff":
        reg_path = "/api/staff-auth/register"
        login_path = "/api/staff-auth/login"
        body = {
            "name": f"Staff Stress {idx}",
            "email": email,
            "password": PASSWORD,
            "department": "IT",
            "phone": f"0912{idx:07d}"[:11],
        }
        token_key = "token"
    else:
        reg_path = "/api/auth/register"
        login_path = "/api/auth/login"
        body = {"name": f"Admin Stress {idx}", "email": email, "password": PASSWORD}
        token_key = "token"

    status, payload, ms = http_json("POST", base + reg_path, body)
    stats.record(status, ms, None if status in (200, 201, 409) else str(payload))
    if status in (200, 201) and isinstance(payload, dict) and payload.get(token_key):
        return email, str(payload[token_key])

    status, payload, ms = http_json(
        "POST",
        base + login_path,
        {"email": email, "password": PASSWORD},
    )
    stats.record(status, ms, None if status == 200 else str(payload))
    if status != 200 or not isinstance(payload, dict) or not payload.get(token_key):
        raise RuntimeError(f"{kind} auth failed for {email}: {status} {payload}")
    return email, str(payload[token_key])


def staff_flow(base: str, idx: int, rounds: int, stats: Stats) -> None:
    _, token = ensure_user(base, "staff", idx, stats)
    for r in range(rounds):
        # me
        status, _, ms = http_json("GET", base + "/api/staff-auth/me", token=token)
        stats.record(status, ms, None if status == 200 else "staff me")

        # create ticket
        cat = CATEGORIES[r % len(CATEGORIES)]
        urg = URGENCIES[r % len(URGENCIES)]
        status, ticket, ms = http_json(
            "POST",
            base + "/api/staff/tickets/",
            {
                "subject": f"Stress ticket staff-{idx}-r{r}",
                "description": f"Load test description for staff {idx} round {r}. " * 2,
                "urgency": urg,
                "category": cat,
            },
            token=token,
        )
        stats.record(status, ms, None if status in (200, 201) else f"staff create {ticket}")
        ticket_id = ticket.get("id") if isinstance(ticket, dict) else None
        ticket_number = ticket.get("ticketNumber") if isinstance(ticket, dict) else None

        # list
        status, _, ms = http_json("GET", base + "/api/staff/tickets/", token=token)
        stats.record(status, ms, None if status == 200 else "staff list")

        # detail + track
        if ticket_id:
            status, _, ms = http_json(
                "GET", base + f"/api/staff/tickets/{ticket_id}", token=token
            )
            stats.record(status, ms, None if status == 200 else "staff detail")
        if ticket_number:
            status, _, ms = http_json(
                "GET",
                base + f"/api/staff/tickets/track/{ticket_number}",
                token=token,
            )
            stats.record(status, ms, None if status == 200 else "staff track")


def admin_flow(base: str, idx: int, rounds: int, stats: Stats, shared_tickets: list[str]) -> None:
    _, token = ensure_user(base, "admin", idx, stats)
    for r in range(rounds):
        status, _, ms = http_json("GET", base + "/api/auth/me", token=token)
        stats.record(status, ms, None if status == 200 else "admin me")

        status, _, ms = http_json("GET", base + "/api/tickets/stats", token=token)
        stats.record(status, ms, None if status == 200 else "admin stats")

        status, tickets, ms = http_json("GET", base + "/api/tickets/", token=token)
        stats.record(status, ms, None if status == 200 else "admin list")

        # also create guest ticket to keep pipeline busy
        status, guest, ms = http_json(
            "POST",
            base + "/api/tickets/",
            {
                "subject": f"Guest stress admin-{idx}-r{r}",
                "description": "Guest load-test ticket created from admin worker flow.",
                "urgency": URGENCIES[r % len(URGENCIES)],
                "category": CATEGORIES[r % len(CATEGORIES)],
                "staffName": f"Guest Staff {idx}",
                "staffDepartment": "Facilities",
                "staffPhone": "09120000000",
                "staffEmail": f"guest.stress.{idx}.{r}@gmail.com",
            },
        )
        stats.record(status, ms, None if status in (200, 201) else f"guest create {guest}")
        if isinstance(guest, dict) and guest.get("id"):
            with stats.lock:
                shared_tickets.append(str(guest["id"]))

        target_id = None
        if isinstance(tickets, list) and tickets:
            target_id = tickets[0].get("id")
        elif shared_tickets:
            target_id = shared_tickets[-1]

        if target_id:
            status, _, ms = http_json(
                "GET", base + f"/api/tickets/{target_id}", token=token
            )
            stats.record(status, ms, None if status == 200 else "admin detail")

            status, _, ms = http_json(
                "POST",
                base + f"/api/tickets/{target_id}/replies",
                {"message": f"Admin reply from stress worker {idx} round {r}"},
                token=token,
            )
            stats.record(status, ms, None if status in (200, 201) else "admin reply")

            status, _, ms = http_json(
                "PATCH",
                base + f"/api/tickets/{target_id}/status",
                {"status": "IN_PROGRESS" if r % 2 == 0 else "RESOLVED"},
                token=token,
            )
            stats.record(status, ms, None if status == 200 else "admin status")


def wait_healthy(base: str, timeout: float = 90.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        status, payload, _ = http_json("GET", base + "/api/health", timeout=3)
        if status == 200 and isinstance(payload, dict) and payload.get("db") is True:
            return
        time.sleep(1)
    raise SystemExit(f"API not healthy at {base}/api/health")


def summarize(stats: Stats, elapsed: float, label: str) -> None:
    lats = sorted(stats.latencies_ms)
    total = stats.ok + stats.fail
    rps = total / elapsed if elapsed else 0
    p50 = statistics.median(lats) if lats else 0
    p95 = lats[int(0.95 * (len(lats) - 1))] if lats else 0
    p99 = lats[int(0.99 * (len(lats) - 1))] if lats else 0
    print(f"\n=== {label} ===")
    print(f"requests: {total}  ok: {stats.ok}  fail: {stats.fail}  rps: {rps:.1f}")
    print(f"latency_ms  p50={p50:.0f}  p95={p95:.0f}  p99={p99:.0f}  max={max(lats) if lats else 0:.0f}")
    print("status_counts:", dict(sorted(stats.statuses.items())))
    if stats.errors:
        print("sample_errors:")
        for e in stats.errors[:8]:
            print(" -", e)


def main() -> None:
    parser = argparse.ArgumentParser(description="Stress staff + admin ticket panels")
    parser.add_argument("--base", default=DEFAULT_BASE)
    parser.add_argument("--users", type=int, default=30, help="staff users + same count admins")
    parser.add_argument("--rounds", type=int, default=10, help="rounds per user")
    parser.add_argument("--workers", type=int, default=40, help="thread pool size")
    args = parser.parse_args()

    print(f"waiting for API {args.base} ...")
    wait_healthy(args.base)
    print(
        f"stress start: staff={args.users} admin={args.users} "
        f"rounds={args.rounds} workers={args.workers}"
    )

    stats = Stats()
    shared_tickets: list[str] = []
    started = time.perf_counter()

    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = []
        for i in range(args.users):
            futures.append(pool.submit(staff_flow, args.base, i, args.rounds, stats))
            futures.append(
                pool.submit(admin_flow, args.base, i, args.rounds, stats, shared_tickets)
            )
        for fut in as_completed(futures):
            try:
                fut.result()
            except Exception as e:  # noqa: BLE001
                stats.record(0, 0, f"worker crash: {e}")

    elapsed = time.perf_counter() - started
    summarize(stats, elapsed, "STAFF + ADMIN LOAD")
    ok_ratio = stats.ok / max(1, stats.ok + stats.fail)
    print(f"\nsuccess_rate: {ok_ratio * 100:.1f}%  elapsed_sec: {elapsed:.1f}")
    if ok_ratio < 0.95:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
