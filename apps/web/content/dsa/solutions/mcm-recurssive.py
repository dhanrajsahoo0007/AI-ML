from typing import List


def matrix_chain_order(p: List[int]) -> int:
    n = len(p) - 1

    def rec(i: int, j: int) -> int:
        if i == j:
            return 0
        return min(
            p[i] * p[k + 1] * p[j + 1] + rec(i, k) + rec(k + 1, j) for k in range(i, j)
        )

    return rec(0, n - 1)
