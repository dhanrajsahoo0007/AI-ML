from typing import Dict, List, Tuple


def knapsack(W: int, wt: List[int], val: List[int], n: int) -> int:
    memo: Dict[Tuple[int, int], int] = {}

    def dfs(i: int, cap: int) -> int:
        if i == 0 or cap == 0:
            return 0
        key = (i, cap)
        if key in memo:
            return memo[key]
        if wt[i - 1] > cap:
            memo[key] = dfs(i - 1, cap)
        else:
            memo[key] = max(
                val[i - 1] + dfs(i - 1, cap - wt[i - 1]),
                dfs(i - 1, cap),
            )
        return memo[key]

    return dfs(n, W)
