from collections import defaultdict
from typing import Dict


def longest_substring_at_most_k_distinct(s: str, k: int) -> int:
    if k == 0:
        return 0

    freq: Dict[str, int] = defaultdict(int)
    left = 0
    best = 0

    for right, ch in enumerate(s):
        freq[ch] += 1

        while len(freq) > k:
            left_ch = s[left]
            freq[left_ch] -= 1
            if freq[left_ch] == 0:
                del freq[left_ch]
            left += 1

        best = max(best, right - left + 1)

    return best
