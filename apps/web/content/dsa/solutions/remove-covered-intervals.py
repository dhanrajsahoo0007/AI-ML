from typing import List


def remove_covered_intervals(intervals: List[List[int]]) -> int:
    intervals.sort(key=lambda i: (i[0], -i[1]))
    survivors: List[List[int]] = [intervals[0]]

    for left, right in intervals[1:]:
        prev_left, prev_right = survivors[-1]
        if prev_left <= left and prev_right >= right:
            continue
        survivors.append([left, right])

    return len(survivors)
