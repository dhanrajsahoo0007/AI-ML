import heapq
from typing import List


def find_maximized_capital(k: int, w: int, profits: List[int], capital: List[int]) -> int:
    projects = sorted(zip(capital, profits))
    available_profits = []
    i = 0
    n = len(profits)

    for _ in range(k):
        while i < n and projects[i][0] <= w:
            heapq.heappush(available_profits, -projects[i][1])
            i += 1

        if not available_profits:
            break

        # Profit increases capital (undo negation from max-heap encoding).
        w -= heapq.heappop(available_profits)

    return w
