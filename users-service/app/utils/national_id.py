def normalize_national_id(value: str) -> str:
    digits = "".join(ch for ch in value if ch.isdigit())
    if len(digits) != 10:
        raise ValueError("کد ملی باید ۱۰ رقم باشد")
    if not is_valid_national_id(digits):
        raise ValueError("کد ملی نامعتبر است")
    return digits


def is_valid_national_id(code: str) -> bool:
    if len(code) != 10 or not code.isdigit():
        return False
    if len(set(code)) == 1:
        return False
    check = int(code[9])
    s = sum(int(code[i]) * (10 - i) for i in range(9)) % 11
    return (s < 2 and check == s) or (s >= 2 and check == 11 - s)
