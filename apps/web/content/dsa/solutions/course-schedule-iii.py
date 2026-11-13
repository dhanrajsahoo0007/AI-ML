import heapq
from typing import List


def schedule_course(courses: List[List[int]]) -> int:
    courses.sort(key=lambda x: x[1])

    duration_heap = []
    current_time = 0

    for duration, last_day in courses:
        if current_time + duration <= last_day:
            current_time += duration
            heapq.heappush(duration_heap, -duration)
        elif duration_heap and -duration_heap[0] > duration:
            # Swap out a longer earlier course for this shorter one to free timeline slack.
            longest = -heapq.heappop(duration_heap)
            current_time = current_time - longest + duration
            heapq.heappush(duration_heap, -duration)

    return len(duration_heap)
