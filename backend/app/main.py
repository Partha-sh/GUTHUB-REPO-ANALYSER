import os
import socket
import sys
from pathlib import Path

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - optional during local bootstrap
    load_dotenv = None

APP_DIR = Path(__file__).resolve().parent
BACKEND_DIR = APP_DIR.parent
REPO_ROOT = BACKEND_DIR.parent

for path in (str(REPO_ROOT), str(BACKEND_DIR)):
    if path not in sys.path:
        sys.path.insert(0, path)

if load_dotenv is not None:
    load_dotenv(APP_DIR / ".env")

try:
    from backend.app.repo_cloner import clone_repo
    from backend.app.file_scanner import scan_python_files
    from backend.app.parser import parse_python_file
    from backend.app.dependency_mapper import extract_dependencies
except ModuleNotFoundError:
    from repo_cloner import clone_repo
    from file_scanner import scan_python_files
    from parser import parse_python_file
    from dependency_mapper import extract_dependencies
    from graph_builder import build_dependency_graph

app = FastAPI()


class RepoRequest(BaseModel):
    repo_url: str


def _pick_available_port(host: str, preferred_port: int, max_attempts: int = 20) -> int:
    for port in range(preferred_port, preferred_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            try:
                sock.bind((host, port))
            except OSError:
                continue
        return port
    raise RuntimeError(
        f"Could not find a free port between {preferred_port} and {preferred_port + max_attempts - 1}."
    )


@app.get("/")
def home():
    return {"message": "API Running"}


@app.post("/analyze")
def analyze_repo(data: RepoRequest):

    try:
        repo_path = clone_repo(data.repo_url)

        python_files = scan_python_files(repo_path)

        if not python_files:
            return {
                "status": "success",
                "repo_path": repo_path,
                "total_python_files": 0,
                "first_file": None,
                "parsed_data": None,
            }

        all_files_data = []

        for file in python_files:

            parsed_data = parse_python_file(file)
            dependencies = extract_dependencies(file)

            file_data = {
                "file": file,
                "functions": parsed_data["functions"],
                "async_functions": parsed_data["async_functions"],
                "classes": parsed_data["classes"],
                "imports": parsed_data["imports"],
                "routes": parsed_data["routes"],
                "dependencies": dependencies
            }

            all_files_data.append(file_data)
        
        dependency_graph = build_dependency_graph(all_files_data)

        return {
            "status": "success",
            "repo_path": repo_path,
            "total_python_files": len(python_files),
            "files": all_files_data
        }

    except Exception as exc:

        raise HTTPException(
            status_code=400,
            detail=f"Could not analyze repository: {exc}"
        ) from exc


if __name__ == "__main__":
    host = os.getenv("HOST", "127.0.0.1")
    preferred_port = int(os.getenv("PORT", "8000"))
    port = _pick_available_port(host, preferred_port)
    if port != preferred_port:
        print(f"Port {preferred_port} is already in use on {host}. Starting on port {port} instead.")
    uvicorn.run(app, host=host, port=port)
