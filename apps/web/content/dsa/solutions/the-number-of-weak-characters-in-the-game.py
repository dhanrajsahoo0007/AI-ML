from typing import List


def number_of_weak_characters(properties: List[List[int]]) -> int:
    properties.sort(key=lambda x: (-x[0], x[1]))
    ans = 0
    max_def = 0
    for _, d in properties:
        if d < max_def:
            ans += 1
        max_def = max(max_def, d)
    return ans
