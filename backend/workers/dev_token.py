import sys

from supabase import create_client

from app.config import get_settings


def main(email: str, password: str) -> None:
    settings = get_settings()
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    session = client.auth.sign_in_with_password({"email": email, "password": password}).session
    print(session.access_token)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("Usage: python -m workers.dev_token <email> <password>")
    main(sys.argv[1], sys.argv[2])