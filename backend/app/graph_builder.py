import os


def build_dependency_graph(files_data):

    graph = []

    for file_data in files_data:

        source_file = os.path.basename(file_data["file"])

        for dependency in file_data["dependencies"]:

            edge = {
                "source": source_file,
                "target": dependency
            }

            graph.append(edge)

    return graph
