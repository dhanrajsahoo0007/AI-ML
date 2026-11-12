from collections import defaultdict
from typing import Dict, List


def total_fruit(fruits: List[int]) -> int:
    freq: Dict[int, int] = defaultdict(int)
    left = 0
    best = 0

    for right, label in enumerate(fruits):
        freq[label] += 1

        while len(freq) > 2:
            freq[fruits[left]] -= 1
            if freq[fruits[left]] == 0:
                del freq[fruits[left]]
            left += 1

        best = max(best, right - left + 1)

    return best
