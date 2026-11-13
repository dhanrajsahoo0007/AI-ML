import heapq
from typing import List


def max_performance(n: int, speed: List[int], efficiency: List[int], k: int) -> int:
    engineers = sorted(zip(efficiency, speed), reverse=True)
    speed_heap = []
    speed_sum = 0
    max_perf = 0

    for eff, spd in engineers:
        if len(speed_heap) == k:
            speed_sum -= heapq.heappop(speed_heap)
        heapq.heappush(speed_heap, spd)
        speed_sum += spd
        max_perf = max(max_perf, eff * speed_sum)

    return max_perf % (10**9 + 7)
