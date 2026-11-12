from typing import List


def max_profit(prices: List[int]) -> int:
    if not prices:
        return 0
    n = len(prices)
    left = [0] * n
    mn = prices[0]
    for i in range(1, n):
        mn = min(mn, prices[i])
        left[i] = max(left[i - 1], prices[i] - mn)
    right = [0] * n
    mx = prices[-1]
    for i in range(n - 2, -1, -1):
        mx = max(mx, prices[i])
        right[i] = max(right[i + 1], mx - prices[i])
    return max(left[i] + right[i] for i in range(n))
