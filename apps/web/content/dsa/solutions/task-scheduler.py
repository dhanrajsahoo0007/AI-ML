import heapq
from collections import Counter, deque
from typing import List


def least_interval(tasks: List[str], n: int) -> int:
    task_freq = Counter(tasks)
    heap = [-freq for freq in task_freq.values()]
    heapq.heapify(heap)

    cooldown = deque()
    timer = 0

    while heap or cooldown:
        timer += 1
        if heap:
            freq = -heapq.heappop(heap)
            if freq > 1:
                # Task re-enters pool after n idle slots from now.
                cooldown.append((freq - 1, timer + n))

        while cooldown and cooldown[0][1] == timer:
            count, _ = cooldown.popleft()
            heapq.heappush(heap, -count)

    return timer
