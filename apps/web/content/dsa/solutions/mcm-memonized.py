from functools import lru_cache
from typing import List


def matrix_chain_order(p: List[int]) -> int:
    n = len(p) - 1

    @lru_cache(maxsize=None)
    def dp(i: int, j: int) -> int:
        if i == j:
            return 0
        return min(
            p[i] * p[k + 1] * p[j + 1] + dp(i, k) + dp(k + 1, j) for k in range(i, j)
        )

    return dp(0, n - 1)
