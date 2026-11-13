from typing import List
from collections import deque


def all_paths_source_target(graph: List[List[int]]) -> List[List[int]]:
    n = len(graph)
    target = n - 1
    result: List[List[int]] = []
    temp = [0]  # Initial path with just the source node

    que: deque[List[int]] = deque([temp])  # Initialize queue with the starting path [0]

    while que:
        currPath = que.popleft()
        lastNode = currPath[-1]

        if lastNode == target:
            result.append(currPath)
        else:
            for v in graph[lastNode]:
                path = currPath.copy()  # Create a copy of the current path
                path.append(v)  # Append the new node
                que.append(path)

    return result


# --- Glue (same as the starter) ---

def all_paths_source_target_tests(a0):  # the entry the tests call
    result = all_paths_source_target(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
