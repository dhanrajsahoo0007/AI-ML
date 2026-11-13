from typing import List


def insert(intervals: List[List[int]], newInterval: List[int]) -> List[List[int]]:
    res: List[List[int]] = []
    for i in range(len(intervals)):
        if newInterval[1] < intervals[i][0]:
            res.append(newInterval)
            return res + intervals[i:]
        if newInterval[0] > intervals[i][1]:
            res.append(intervals[i])
        else:
            # Still growing the mutable `newInterval` bubble until gaps appear.
            newInterval = [
                min(newInterval[0], intervals[i][0]),
                max(newInterval[1], intervals[i][1]),
            ]
    res.append(newInterval)
    return res
