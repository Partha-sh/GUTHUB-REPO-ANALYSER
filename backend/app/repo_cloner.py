import uuid
from pathlib import Path

from git import Repo

TEMP_DIR = Path(__file__).resolve().parent / "temp"


def clone_repo(repo_url: str) -> str:
    TEMP_DIR.mkdir(parents=True, exist_ok=True)

    local_path = TEMP_DIR / str(uuid.uuid4())
    Repo.clone_from(repo_url, local_path)

    return str(local_path)
