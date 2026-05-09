import ast


def parse_python_file(file_path):

    data = {
        "functions": [],
        "async_functions": [],
        "classes": [],
        "imports": [],
        "routes": [],
        "decorators": [],
        "docstrings": []
    }

    try:

        with open(file_path, "r", encoding="utf-8") as file:
            code = file.read()

        tree = ast.parse(code)

        for node in ast.walk(tree):

            # Normal Functions
            if isinstance(node, ast.FunctionDef):

                data["functions"].append(node.name)

                # Decorators
                for decorator in node.decorator_list:

                    if isinstance(decorator, ast.Call):

                        if hasattr(decorator.func, "attr"):

                            route_method = decorator.func.attr

                            # FastAPI route detection
                            if route_method in ["get", "post", "put", "delete"]:

                                route_path = ""

                                if decorator.args:

                                    if isinstance(decorator.args[0], ast.Constant):
                                        route_path = decorator.args[0].value

                                data["routes"].append({
                                    "method": route_method,
                                    "path": route_path,
                                    "function": node.name
                                })

                            data["decorators"].append(route_method)

            # Async Functions
            elif isinstance(node, ast.AsyncFunctionDef):

                data["async_functions"].append(node.name)

            # Classes
            elif isinstance(node, ast.ClassDef):

                class_info = {
                    "name": node.name,
                    "inherits": []
                }

                # Inheritance detection
                for base in node.bases:
                    if isinstance(base, ast.Name):
                        class_info["inherits"].append(base.id)

                data["classes"].append(class_info)

            # Imports
            elif isinstance(node, ast.Import):

                for alias in node.names:
                    data["imports"].append(alias.name)

            # Docstrings
            elif isinstance(node, (ast.FunctionDef, ast.ClassDef, ast.Module)):

                docstring = ast.get_docstring(node)

                if docstring:
                    data["docstrings"].append(docstring)

    except Exception as e:

        data["error"] = str(e)

    return data
