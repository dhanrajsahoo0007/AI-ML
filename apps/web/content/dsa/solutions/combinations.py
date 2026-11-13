from typing import List


def combine(n: int, k: int) -> List[List[int]]:
    result: List[List[int]] = []

    def backtrack(start: int, path: List[int]) -> None:
        if len(path) == k:
            result.append(path[:])
            return
        for i in range(start, n + 1):
            path.append(i)
            backtrack(i + 1, path)
            path.pop()

    backtrack(1, [])
    return result


# --- Glue (same as the starter) ---

def combine_tests(a0, a1):  # the entry the tests call
    result = combine(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
