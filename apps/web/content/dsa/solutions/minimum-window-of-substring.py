from collections import Counter
from typing import Dict


def min_window(s: str, t: str) -> str:
    if not s or not t:
        return ""

    need: Dict[str, int] = Counter(t)
    window: Dict[str, int] = Counter()
    required = len(need)
    formed = 0

    left = 0
    best_len = float("inf")
    best_l = best_r = 0

    for right in range(len(s)):
        ch = s[right]
        window[ch] += 1

        if ch in need and window[ch] == need[ch]:
            formed += 1

        while formed == required and left <= right:
            if right - left + 1 < best_len:
                best_len = right - left + 1
                best_l, best_r = left, right

            left_ch = s[left]
            window[left_ch] -= 1
            if left_ch in need and window[left_ch] < need[left_ch]:
                formed -= 1
            left += 1

    return "" if best_len == float("inf") else s[best_l : best_r + 1]
