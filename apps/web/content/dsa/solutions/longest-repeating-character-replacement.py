from typing import Dict


def character_replacement(s: str, k: int) -> int:
    freq: Dict[str, int] = {}
    left = 0
    best = 0
    max_count = 0

    for right in range(len(s)):
        ch = s[right]
        freq[ch] = freq.get(ch, 0) + 1
        max_count = max(max_count, freq[ch])

        if right - left + 1 - max_count > k:
            freq[s[left]] -= 1
            left += 1

        best = max(best, right - left + 1)

    return best
