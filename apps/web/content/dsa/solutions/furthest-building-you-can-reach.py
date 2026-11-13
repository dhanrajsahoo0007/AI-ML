import heapq
from typing import List


def furthest_building(heights: List[int], bricks: int, ladders: int) -> int:
    climb_heap = []

    for i in range(len(heights) - 1):
        climb = heights[i + 1] - heights[i]
        if climb <= 0:
            continue

        heapq.heappush(climb_heap, climb)

        if len(climb_heap) > ladders:
            smallest_climb = heapq.heappop(climb_heap)
            if bricks < smallest_climb:
                return i
            bricks -= smallest_climb

    return len(heights) - 1
