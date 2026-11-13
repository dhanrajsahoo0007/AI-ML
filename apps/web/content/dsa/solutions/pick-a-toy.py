from collections import defaultdict
from typing import Dict, List


def max_toys(toys: List[int], k: int) -> int:
    if k == 0:
        return 0

    freq: Dict[int, int] = defaultdict(int)
    left = 0
    best = 0

    for right, toy in enumerate(toys):
        freq[toy] += 1

        while len(freq) > k:
            freq[toys[left]] -= 1
            if freq[toys[left]] == 0:
                del freq[toys[left]]
            left += 1

        best = max(best, right - left + 1)

    return best
