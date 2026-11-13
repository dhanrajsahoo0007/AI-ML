from typing import List


def nums_same_consec_diff(n: int, k: int) -> List[int]:
    result: List[int] = []

    def dfs(value: int, length: int) -> None:
        if length == n:
            result.append(value)
            return
        last = value % 10
        if last + k <= 9:
            dfs(value * 10 + last + k, length + 1)
        if last - k >= 0 and k != 0:
            dfs(value * 10 + last - k, length + 1)

    if n == 1:
        return list(range(10))
    for d in range(1, 10):
        dfs(d, 1)
    return result
