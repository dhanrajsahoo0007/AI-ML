from typing import List


def can_attend_meetings(intervals: List[List[int]]) -> bool:
    intervals.sort(key=lambda x: x[0])
    for i in range(1, len(intervals)):
        # Strict `<` allows back-to-back meetings sharing an endpoint.
        if intervals[i][0] < intervals[i - 1][1]:
            return False
    return True
