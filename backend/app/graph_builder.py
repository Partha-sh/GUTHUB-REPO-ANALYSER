import os


def build_dependency_graph(files_data):

    nodes = []
    edges = []

    added_nodes = set()

    for file_data in files_data:

        source_file = os.path.basename(file_data["file"])

        # Add source node
        if source_file not in added_nodes:

            nodes.append({
                "id": source_file
            })

            added_nodes.add(source_file)

        # Create edges
        for dependency in file_data["dependencies"]:

            edges.append({
                "source": source_file,
                "target": dependency
            })

            # Add dependency node
            if dependency not in added_nodes:

                nodes.append({
                    "id": dependency
                })

                added_nodes.add(dependency)

    return {
        "nodes": nodes,
        "edges": edges
    }