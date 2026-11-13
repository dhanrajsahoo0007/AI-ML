from collections import defaultdict
from typing import List


def min_interval(intervals: List[List[int]], queries: List[int]) -> List[int]:
    index_map: dict[int, List[int]] = defaultdict(list)
    for idx, value in enumerate(queries):
        index_map[value].append(idx)

    events: List[tuple[int, str, int, int]] = []
    for left, right in intervals:
        width = right - left + 1
        events.append((left, "start", width, right))
        events.append((right + 1, "end", width, right))

    for value in index_map:
        events.append((value, "query", 0, 0))

    events.sort(key=lambda item: (item[0], 0 if item[1] == "start" else 1 if item[1] == "end" else 2))

    active: dict[int, int] = {}
    answers = [-1] * len(queries)

    for pos, kind, width, right in events:
        if kind == "start":
            active[right] = width
        elif kind == "end":
            if active.get(right) == width:
                active.pop(right, None)
        else:
            if not active:
                best = -1
            else:
                best = min(active.values())
            for q_index in index_map[pos]:
                answers[q_index] = best

    return answers
