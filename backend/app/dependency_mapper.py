import ast


def extract_dependencies(file_path):

    dependencies = []

    try:

        with open(file_path, "r", encoding="utf-8") as file:
            code = file.read()

        tree = ast.parse(code)

        for node in ast.walk(tree):

            # import os
            if isinstance(node, ast.Import):

                for alias in node.names:
                    dependencies.append(alias.name)

            # from auth import login
            elif isinstance(node, ast.ImportFrom):

                if node.module:
                    dependencies.append(node.module)

    except Exception as e:

        return {
            "error": str(e)
        }

    return dependencies
