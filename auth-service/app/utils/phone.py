"""Normalize Iranian mobile numbers to 09xxxxxxxxx (Latin digits)."""

_DIGIT_MAP = str.maketrans(
    "۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩",
    "01234567890123456789",
)


def normalize_phone(value: str) -> str:
    latin = (value or "").translate(_DIGIT_MAP)
    digits = "".join(ch for ch in latin if ch.isdigit())
    if digits.startswith("98") and len(digits) >= 12:
        digits = "0" + digits[2:12]
    elif digits.startswith("9") and len(digits) == 10:
        digits = "0" + digits
    if not (digits.startswith("09") and len(digits) == 11):
        raise ValueError("Invalid phone number")
    return digits


def normalize_otp_code(value: str) -> str:
    code = (value or "").translate(_DIGIT_MAP).strip()
    if not code.isdigit() or len(code) != 6:
        raise ValueError("Invalid OTP code")
    return code
