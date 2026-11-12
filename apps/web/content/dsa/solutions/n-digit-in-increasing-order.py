from typing import List


def increasing_numbers(n: int) -> List[int]:
    result: List[int] = []

    def backtrack(path: List[int]) -> None:
        if len(path) == n:
            value = 0
            for d in path:
                value = value * 10 + d
            result.append(value)
            return
        start = (path[-1] + 1) if path else 1
        for d in range(start, 10):
            path.append(d)
            backtrack(path)
            path.pop()

    if n == 1:
        return list(range(10))
    backtrack([])
    return result
