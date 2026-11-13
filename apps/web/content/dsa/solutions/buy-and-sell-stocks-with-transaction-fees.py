from typing import List


def max_profit(prices: List[int], fee: int) -> int:
    hold = -10**9
    cash = 0
    for p in prices:
        hold = max(hold, cash - p)
        cash = max(cash, hold + p - fee)
    return cash
