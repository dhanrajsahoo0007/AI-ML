from typing import List


def combination_sum3(k: int, n: int) -> List[List[int]]:
    result: List[List[int]] = []

    def dfs(start: int, remaining: int, path: List[int]) -> None:
        if len(path) == k:
            if remaining == 0:
                result.append(path[:])
            return
        if remaining < 0 or len(path) > k:
            return
        for d in range(start, 10):
            path.append(d)
            dfs(d + 1, remaining - d, path)
            path.pop()

    dfs(1, n, [])
    return result
