from typing import List


def erase_overlap_intervals(intervals: List[List[int]]) -> int:
    intervals.sort()
    removals = 0
    prev_end = intervals[0][1]

    for start, end in intervals[1:]:
        if start >= prev_end:
            prev_end = end
        else:
            removals += 1
            # Prefer the interval that frees the timeline sooner.
            prev_end = min(end, prev_end)

    return removals
