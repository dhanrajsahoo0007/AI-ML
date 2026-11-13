from typing import List


def knapsack(W: int, wt: List[int], val: List[int], n: int) -> int:
    if n == 0 or W == 0:
        return 0
    if wt[n - 1] > W:
        return knapsack(W, wt, val, n - 1)
    return max(
        val[n - 1] + knapsack(W - wt[n - 1], wt, val, n - 1),
        knapsack(W, wt, val, n - 1),
    )
