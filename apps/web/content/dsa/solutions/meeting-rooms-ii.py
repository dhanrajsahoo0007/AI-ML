import heapq
from typing import List


def min_meeting_rooms(intervals: List[List[int]]) -> int:
    if not intervals:
        return 0

    intervals.sort(key=lambda x: x[0])
    heap: List[int] = []
    max_rooms = 0

    for start, end in intervals:
        while heap and heap[0] <= start:
            heapq.heappop(heap)
        heapq.heappush(heap, end)
        max_rooms = max(max_rooms, len(heap))

    return max_rooms


class MeetingRoomsTwoPointer:
    """Second implementation from the user's original file — kept for pedagogy."""

    def minMeetingRooms(self, intervals: List[List[int]]) -> int:
        if not intervals:
            return 0

        starts = sorted(i[0] for i in intervals)
        ends = sorted(i[1] for i in intervals)
        active = 0
        peak = 0
        s = e = 0
        while s < len(intervals):
            if starts[s] < ends[e]:
                active += 1
                peak = max(peak, active)
                s += 1
            else:
                active -= 1
                e += 1
        return peak
