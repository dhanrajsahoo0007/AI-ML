from typing import List


def check_inclusion(s1: str, s2: str) -> bool:
    m, n = len(s1), len(s2)
    if m > n:
        return False

    need: List[int] = [0] * 26
    window: List[int] = [0] * 26

    def ci(ch: str) -> int:
        return ord(ch) - ord("a")

    for ch in s1:
        need[ci(ch)] += 1

    for j in range(m):
        window[ci(s2[j])] += 1

    if window == need:
        return True

    for j in range(m, n):
        window[ci(s2[j - m])] -= 1
        window[ci(s2[j])] += 1
        if window == need:
            return True

    return False
