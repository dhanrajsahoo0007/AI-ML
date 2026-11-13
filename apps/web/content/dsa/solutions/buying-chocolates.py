from typing import List


def buy_choco(prices: List[int], money: int) -> int:
    smallest = second_smallest = float("inf")
    for price in prices:
        if price < smallest:
            # Old smallest becomes second smallest.
            second_smallest = smallest
            smallest = price
        elif price < second_smallest:
            second_smallest = price
    total_cost = smallest + second_smallest
    if second_smallest is float("inf") or total_cost > money:
        return money
    return money - total_cost
