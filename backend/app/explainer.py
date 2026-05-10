def generate_file_explanation(file_data):

    explanations = []

    # Functions
    if file_data["functions"]:
        explanations.append(
            f"Contains {len(file_data['functions'])} function(s)."
        )

    # Async functions
    if file_data["async_functions"]:
        explanations.append(
            f"Uses async functionality."
        )

    # Classes
    if file_data["classes"]:
        explanations.append(
            f"Defines {len(file_data['classes'])} class(es)."
        )

    # Routes
    if file_data["routes"]:
        explanations.append(
            f"Handles API routes."
        )

    # Dependencies
    if "jwt" in file_data["dependencies"]:
        explanations.append(
            "Uses JWT authentication."
        )

    if "fastapi" in file_data["dependencies"]:
        explanations.append(
            "Built using FastAPI."
        )

    return " ".join(explanations)