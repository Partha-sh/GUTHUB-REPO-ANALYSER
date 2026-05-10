import os

IGNORE_FOLDERS = {
    "venv",
    "__pycache__",
    ".git",
    "node_modules"
}

def scan_python_files(repo_path):

    python_files = []

    for root, dirs, files in os.walk(repo_path):   # os.walk help in recursively travelling in any folders

        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]

        for file in files:

            if file.endswith(".py"):

                full_path = os.path.join(root, file)

                python_files.append(full_path)

    return python_files
