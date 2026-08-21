from pathlib import Path
from urllib.request import Request, urlopen

from cryptography import x509


CERTIFICATES = {
    "AppleIncRootCertificate.cer": (
        "https://www.apple.com/appleca/"
        "AppleIncRootCertificate.cer"
    ),
    "AppleRootCA-G2.cer": (
        "https://www.apple.com/certificateauthority/"
        "AppleRootCA-G2.cer"
    ),
    "AppleRootCA-G3.cer": (
        "https://www.apple.com/certificateauthority/"
        "AppleRootCA-G3.cer"
    ),
}


def main():
    project_backend = (
        Path(__file__).resolve().parents[1]
    )

    destination = (
        project_backend
        / "accounts"
        / "apple_root_certs"
    )
    destination.mkdir(
        parents=True,
        exist_ok=True,
    )

    for filename, url in CERTIFICATES.items():
        request = Request(
            url,
            headers={
                "User-Agent":
                    "PickSumN-Apple-IAP-Setup/1.0",
            },
        )

        with urlopen(
            request,
            timeout=30,
        ) as response:
            data = response.read()

        certificate = (
            x509.load_der_x509_certificate(
                data
            )
        )

        path = destination / filename
        path.write_bytes(data)

        print(
            f"Saved {filename}: "
            f"{certificate.subject.rfc4514_string()}"
        )

    print(
        "Apple root certificates are ready."
    )


if __name__ == "__main__":
    main()
