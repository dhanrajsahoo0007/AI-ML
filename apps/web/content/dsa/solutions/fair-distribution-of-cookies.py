from typing import List


def distribute_cookies(cookies: List[int], k: int) -> int:
    totals = [0] * k
    best = [10**18]

    def dfs(idx: int) -> None:
        if idx == len(cookies):
            best[0] = min(best[0], max(totals))
            return
        if totals.count(0) > len(cookies) - idx:
            return
        for i in range(k):
            totals[i] += cookies[idx]
            dfs(idx + 1)
            totals[i] -= cookies[idx]

    dfs(0)
    return best[0]
