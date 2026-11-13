from typing import List


def merge(intervals: List[List[int]]) -> List[List[int]]:
    intervals.sort(key=lambda pair: pair[0])
    output: List[List[int]] = [intervals[0][:]]

    for start, end in intervals[1:]:
        last_end = output[-1][1]
        if start <= last_end:
            # Overlap or touching endpoints ([1,4] + [4,5] → [1,5]).
            output[-1][1] = max(last_end, end)
        else:
            output.append([start, end])

    return output
