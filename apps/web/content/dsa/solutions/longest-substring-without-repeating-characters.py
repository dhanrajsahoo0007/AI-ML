from typing import List


def length_of_longest_substring(s: str) -> int:
    last: List[int] = [-1] * 256
    left = 0
    best = 0

    for right, ch in enumerate(s):
        code = ord(ch)
        if last[code] >= left:
            left = last[code] + 1
        last[code] = right
        best = max(best, right - left + 1)

    return best
