import heapq
from typing import List


def connect_ropes(ropes: List[int]) -> int:
    heapq.heapify(ropes)
    total_cost = 0

    while len(ropes) > 1:
        first = heapq.heappop(ropes)
        second = heapq.heappop(ropes)
        # Pay now; push combined rope so it can participate in later merges.
        cost = first + second
        total_cost += cost
        heapq.heappush(ropes, cost)

    return total_cost
