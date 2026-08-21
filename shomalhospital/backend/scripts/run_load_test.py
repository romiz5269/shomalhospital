"""One-shot hospital API load test. Creates only LOADTEST- rows, then deletes them."""
from __future__ import annotations

import json
import statistics
import time
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timedelta, timezone

from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models import (
    ActivityLog,
    Asset,
    AssetUpgrade,
    Department,
    InventoryItem,
    MaintenancePlan,
    PasswordResetRequest,
    PMVisit,
    PMVisitTask,
    PushSubscription,
    Reminder,
    User,
    WorkCase,
)

BASE = "http://127.0.0.1:8001/api"
MARK = "LOADTEST-"
USER = "loadtest_runner"
PASS = "LoadTest#4821"
EMAIL = "loadtest@north-hospital.local"


def req(method: str, path: str, token: str | None = None, data=None, form: dict | None = None):
    url = BASE + path
    headers = {}
    body = None
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if form is not None:
        body = urllib.parse.urlencode(form).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    elif data is not None:
        body = json.dumps(data).encode()
        headers["Content-Type"] = "application/json"
    started = time.perf_counter()
    try:
        r = urllib.request.Request(url, data=body, headers=headers, method=method)
        with urllib.request.urlopen(r, timeout=15) as resp:
            raw = resp.read()
            ms = (time.perf_counter() - started) * 1000
            parsed = json.loads(raw.decode()) if raw else None
            return resp.status, ms, parsed
    except urllib.error.HTTPError as e:
        ms = (time.perf_counter() - started) * 1000
        return e.code, ms, e.read().decode(errors="replace")
    except Exception as e:
        ms = (time.perf_counter() - started) * 1000
        return 0, ms, str(e)


def pct(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    i = min(len(s) - 1, max(0, int(round((p / 100) * (len(s) - 1)))))
    return s[i]


def ensure_runner() -> None:
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.username == USER).first()
        if u:
            db.delete(u)
            db.commit()
        db.add(
            User(
                username=USER,
                email=EMAIL,
                full_name="LOADTEST runner",
                hashed_password=get_password_hash(PASS),
                role="admin",
                is_active=True,
            )
        )
        db.commit()
    finally:
        db.close()


def cleanup() -> dict[str, int]:
    db = SessionLocal()
    deleted = {}
    try:
        assets = db.query(Asset).filter(Asset.name.like(f"{MARK}%")).all()
        asset_ids = [a.id for a in assets]
        depts = db.query(Department).filter(Department.name.like(f"{MARK}%")).all()
        dept_ids = [d.id for d in depts]
        visit_q = (PMVisit.notes.like(f"{MARK}%")) | (PMVisit.recipient_name.like(f"{MARK}%"))
        if asset_ids:
            visit_q = visit_q | (PMVisit.asset_id.in_(asset_ids))
        visits = db.query(PMVisit).filter(visit_q).all()
        visit_ids = [v.id for v in visits]
        if visit_ids:
            db.query(PMVisitTask).filter(PMVisitTask.visit_id.in_(visit_ids)).delete(synchronize_session=False)
            db.query(PMVisit).filter(PMVisit.id.in_(visit_ids)).delete(synchronize_session=False)
        deleted["visits"] = len(visit_ids)
        inv = db.query(InventoryItem).filter(InventoryItem.name.like(f"{MARK}%")).delete(synchronize_session=False)
        deleted["inventory"] = inv
        if asset_ids:
            db.query(Reminder).filter(Reminder.asset_id.in_(asset_ids)).delete(synchronize_session=False)
            db.query(InventoryItem).filter(InventoryItem.asset_id.in_(asset_ids)).delete(synchronize_session=False)
            db.query(WorkCase).filter(WorkCase.asset_id.in_(asset_ids)).delete(synchronize_session=False)
            db.query(MaintenancePlan).filter(MaintenancePlan.asset_id.in_(asset_ids)).delete(synchronize_session=False)
            db.query(AssetUpgrade).filter(AssetUpgrade.asset_id.in_(asset_ids)).delete(synchronize_session=False)
        rem = db.query(Reminder).filter(Reminder.title.like(f"{MARK}%")).delete(synchronize_session=False)
        deleted["reminders"] = rem
        if asset_ids:
            db.query(Asset).filter(Asset.id.in_(asset_ids)).delete(synchronize_session=False)
        deleted["assets"] = len(asset_ids)
        if dept_ids:
            db.query(Department).filter(Department.id.in_(dept_ids)).delete(synchronize_session=False)
        deleted["departments"] = len(dept_ids)
        runner = db.query(User).filter(User.username == USER).first()
        if runner:
            db.query(PasswordResetRequest).filter(PasswordResetRequest.user_id == runner.id).delete(synchronize_session=False)
            db.query(PushSubscription).filter(PushSubscription.user_id == runner.id).delete(synchronize_session=False)
            db.query(ActivityLog).filter(ActivityLog.user_id == runner.id).delete(synchronize_session=False)
            db.delete(runner)
        db.query(ActivityLog).filter(ActivityLog.details.like(f"%{MARK}%")).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()
    return deleted


def snapshot() -> dict[str, int]:
    db = SessionLocal()
    try:
        return {
            "users": db.query(User).count(),
            "assets": db.query(Asset).count(),
            "visits": db.query(PMVisit).count(),
            "inventory": db.query(InventoryItem).count(),
            "departments": db.query(Department).count(),
        }
    finally:
        db.close()


def main() -> None:
    times: list[float] = []
    codes: dict[int, int] = {}
    errors: list[str] = []

    def record(status: int, ms: float, detail=None):
        times.append(ms)
        codes[status] = codes.get(status, 0) + 1
        if status >= 400 or status == 0:
            errors.append(f"{status} {str(detail)[:120]}")

    print("cleanup leftover...", flush=True)
    cleanup()
    before = snapshot()
    print("counts_before", before, flush=True)
    try:
        ensure_runner()
        print("login...", flush=True)
        st, ms, data = req("POST", "/auth/login", data={"username": USER, "password": PASS})
        record(st, ms, data)
        if st != 200 or not isinstance(data, dict):
            raise SystemExit(f"login failed: {st} {data}")
        token = data["access_token"]
        print("seed...", flush=True)

        st, ms, dept = req("POST", "/departments/", token, {"name": f"{MARK}واحد", "code": "LT01"})
        record(st, ms, dept)
        dept_id = dept["id"] if isinstance(dept, dict) else None

        asset_ids = []
        visit_ids = []
        now = datetime.now(timezone.utc).replace(tzinfo=None).isoformat()

        def create_asset(i: int):
            return req(
                "POST",
                "/assets/",
                token,
                {"name": f"{MARK}PC-{i}", "asset_type": "pc", "department_id": dept_id, "location": "IT"},
            )

        with ThreadPoolExecutor(max_workers=6) as pool:
            futs = [pool.submit(create_asset, i) for i in range(12)]
            for f in as_completed(futs):
                st, ms, body = f.result()
                record(st, ms, body)
                if st in (200, 201) and isinstance(body, dict):
                    asset_ids.append(body["id"])

        def create_visit(aid: int, i: int):
            return req(
                "POST",
                "/pm-visits/",
                token,
                {
                    "visit_date": now,
                    "performed_by": "LOADTEST",
                    "recipient_name": f"{MARK}گیرنده-{i}",
                    "notes": f"{MARK}بازدید تست",
                    "asset_id": aid,
                    "work_type": "pm" if i % 2 == 0 else "adhoc",
                    "tasks": [{"task_name": f"{MARK}کار", "is_done": True}],
                },
            )

        def create_inv(aid: int, i: int):
            return req(
                "POST",
                "/inventory/",
                token,
                {
                    "name": f"{MARK}قطعه-{i}",
                    "received_date": now,
                    "asset_id": aid,
                    "quantity": 1,
                    "status": "installed",
                    "purpose": "جایگزینی تست",
                },
            )

        def create_rem(i: int):
            due = (datetime.utcnow() + timedelta(days=3)).isoformat()
            return req(
                "POST",
                "/reminders/",
                token,
                {"title": f"{MARK}هشدار-{i}", "due_date": due, "reminder_type": "custom", "warning_days": 1},
            )

        with ThreadPoolExecutor(max_workers=6) as pool:
            jobs = []
            for i, aid in enumerate(asset_ids):
                jobs.append(pool.submit(create_visit, aid, i))
                jobs.append(pool.submit(create_inv, aid, i))
            for i in range(8):
                jobs.append(pool.submit(create_rem, i))
            for f in as_completed(jobs):
                st, ms, body = f.result()
                record(st, ms, body)
                if st in (200, 201) and isinstance(body, dict) and "visit_date" in body:
                    visit_ids.append(body.get("id"))

        reads = [
            "/health" if False else "/dashboard",
            "/assets/",
            "/pm-visits/",
            "/inventory/",
            "/reminders/",
            "/activity/",
            "/users/",
            "/it-overview/",
            "/departments/",
            "/search/?q=LOADTEST",
            "/auth/me",
        ]

        def hit(path: str):
            if path.startswith("/health"):
                return req("GET", path.replace("/health", "/../health") )
            return req("GET", path, token)

        # health is outside /api prefix
        def hit2(path: str):
            if path == "__health__":
                started = time.perf_counter()
                try:
                    with urllib.request.urlopen("http://127.0.0.1:8001/api/health", timeout=8) as resp:
                        ms = (time.perf_counter() - started) * 1000
                        return resp.status, ms, None
                except urllib.error.HTTPError as e:
                    return e.code, (time.perf_counter() - started) * 1000, e.read().decode(errors="replace")
                except Exception as e:
                    return 0, (time.perf_counter() - started) * 1000, str(e)
            return req("GET", path, token)

        paths = reads + ["__health__"]
        print("traffic...", flush=True)
        with ThreadPoolExecutor(max_workers=8) as pool:
            jobs = [pool.submit(hit2, paths[i % len(paths)]) for i in range(160)]
            for f in as_completed(jobs):
                st, ms, body = f.result()
                record(st, ms, body)

    finally:
        deleted = cleanup()

    after = snapshot()
    ok = sum(v for k, v in codes.items() if 200 <= k < 400)
    bad = sum(v for k, v in codes.items() if k >= 400 or k == 0)
    print("LOADTEST_RESULT")
    print(json.dumps({
        "total_requests": len(times),
        "ok": ok,
        "errors": bad,
        "status_codes": codes,
        "ms_min": round(min(times), 1) if times else None,
        "ms_p50": round(pct(times, 50), 1) if times else None,
        "ms_p95": round(pct(times, 95), 1) if times else None,
        "ms_p99": round(pct(times, 99), 1) if times else None,
        "ms_max": round(max(times), 1) if times else None,
        "error_samples": errors[:8],
        "counts_before": before,
        "counts_after": after,
        "deleted_test_rows": deleted,
        "data_restored": before == after,
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
