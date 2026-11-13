from typing import List


def min_meeting_rooms(intervals: List[List[int]]) -> int:
    starts = sorted(s for s, _ in intervals)
    ends = sorted(e for _, e in intervals)
    n = len(intervals)
    i = j = 0
    cur = 0
    best = 0
    while i < n:
        if starts[i] < ends[j]:
            cur += 1
            best = max(best, cur)
            i += 1
        else:
            cur -= 1
            j += 1
    return best
