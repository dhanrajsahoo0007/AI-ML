from typing import List


def combination_sum2(candidates: List[int], target: int) -> List[List[int]]:
    candidates.sort()
    result: List[List[int]] = []

    def dfs(start: int, remaining: int, path: List[int]) -> None:
        if remaining == 0:
            result.append(path[:])
            return
        for i in range(start, len(candidates)):
            if i > start and candidates[i] == candidates[i - 1]:
                continue
            val = candidates[i]
            if val > remaining:
                break
            path.append(val)
            dfs(i + 1, remaining - val, path)
            path.pop()

    dfs(0, target, [])
    return result
