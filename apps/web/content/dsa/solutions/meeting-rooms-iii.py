import heapq
from typing import List


def most_booked(n: int, meetings: List[List[int]]) -> int:
    meetings.sort()
    free: List[int] = list(range(n))
    heapq.heapify(free)
    busy: List[tuple[int, int]] = []
    usage = [0] * n

    for start, end in meetings:
        duration = end - start

        while busy and busy[0][0] <= start:
            _, room = heapq.heappop(busy)
            heapq.heappush(free, room)

        if free:
            room = heapq.heappop(free)
            actual_start = start
        else:
            release, room = heapq.heappop(busy)
            actual_start = release

        actual_end = actual_start + duration
        usage[room] += 1
        heapq.heappush(busy, (actual_end, room))

    best_room = 0
    for room in range(1, n):
        if usage[room] > usage[best_room]:
            best_room = room
    return best_room
