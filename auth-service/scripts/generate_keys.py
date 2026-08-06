"""Generate RS256 keypair for auth-service + gateway JWT_PUBLIC_KEY."""

from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    keys = root / "keys"
    keys.mkdir(exist_ok=True)

    private_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    private_pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    public_pem = private_key.public_key().public_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PublicFormat.SubjectPublicKeyInfo,
    )

    (keys / "private.pem").write_bytes(private_pem)
    (keys / "public.pem").write_bytes(public_pem)

    escaped = public_pem.decode().replace("\n", "\\n")
    print("Keys written to ./keys/")
    print()
    print("Gateway .env JWT_PUBLIC_KEY=")
    print(escaped)


if __name__ == "__main__":
    main()
