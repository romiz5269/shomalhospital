import secrets
import time


def new_id() -> str:
    return f"c{int(time.time() * 1000):x}{secrets.token_hex(8)}"
