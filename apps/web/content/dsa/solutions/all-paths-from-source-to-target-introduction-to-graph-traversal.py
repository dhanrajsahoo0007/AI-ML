from typing import List


def all_paths_source_target(graph: List[List[int]]) -> List[List[int]]:
    target = len(graph) - 1
    result: List[List[int]] = []
    path: List[int] = [0]

    def dfs(u: int) -> None:
        if u == target:
            result.append(path.copy())
            return
        for v in graph[u]:
            path.append(v)
            dfs(v)
            path.pop()

    dfs(0)
    return result


# --- Glue (same as the starter) ---

def all_paths_source_target_tests(a0):  # the entry the tests call
    result = all_paths_source_target(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
