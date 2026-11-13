from bisect import bisect_left
from typing import List


class Solution:
    def __init__(self) -> None:
        self._intervals: List[List[int]] = []

    def addNum(self, value: int) -> None:
        intervals = self._intervals
        idx = bisect_left(intervals, [value, value])

        left_touch = idx > 0 and intervals[idx - 1][1] + 1 >= value
        right_touch = idx < len(intervals) and intervals[idx][0] - 1 <= value

        if left_touch and right_touch:
            intervals[idx - 1][1] = intervals[idx][1]
            intervals.pop(idx)
        elif left_touch:
            intervals[idx - 1][1] = max(intervals[idx - 1][1], value)
        elif right_touch:
            intervals[idx][0] = min(intervals[idx][0], value)
        else:
            intervals.insert(idx, [value, value])

    def getIntervals(self) -> List[List[int]]:
        return [interval[:] for interval in self._intervals]
