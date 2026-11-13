from collections import defaultdict
from typing import List


def group_anagrams(strs: List[str]) -> List[List[str]]:
    buckets: dict[tuple[int, ...], List[str]] = defaultdict(list)
    for word in strs:
        counts = [0] * 26
        for ch in word:
            counts[ord(ch) - ord("a")] += 1  # frequency signature for this word
        buckets[tuple(counts)].append(word)  # all anagrams share the same tuple key
    return list(buckets.values())


# --- Glue (same as the starter) ---

def group_anagrams_tests(a0):  # the entry the tests call
    result = group_anagrams(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
