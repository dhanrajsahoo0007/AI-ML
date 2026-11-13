from typing import List


def n_bit_prefix_valid(n: int) -> List[str]:
    result: List[str] = []

    def dfs(ones: int, zeros: int, path: str) -> None:
        if len(path) == n:
            result.append(path)
            return
        dfs(ones + 1, zeros, path + "1")
        if ones > zeros:
            dfs(ones, zeros + 1, path + "0")

    dfs(0, 0, "")
    return sorted(result)
