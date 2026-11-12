from typing import List


def max_profit(prices: List[int]) -> int:
    if len(prices) < 2:
        return 0

    buy = 0
    best = 0

    for sell in range(1, len(prices)):
        if prices[buy] < prices[sell]:
            best = max(best, prices[sell] - prices[buy])
        else:
            buy = sell

    return best
