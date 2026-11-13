from typing import List


def combination_sum(candidates: List[int], target: int) -> List[List[int]]:
    candidates.sort()
    result: List[List[int]] = []

    def dfs(start: int, remaining: int, path: List[int]) -> None:
        if remaining == 0:
            result.append(path[:])
            return
        if remaining < 0:
            return
        for i in range(start, len(candidates)):
            val = candidates[i]
            if val > remaining:
                break
            path.append(val)
            dfs(i, remaining - val, path)
            path.pop()

    dfs(0, target, [])
    return result
