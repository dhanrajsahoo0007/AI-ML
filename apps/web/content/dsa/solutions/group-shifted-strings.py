from collections import defaultdict
from typing import List


def group_strings(strings: List[str]) -> List[List[str]]:
    buckets: dict[tuple[int, ...], List[str]] = defaultdict(list)
    for s in strings:
        base = ord(s[0])
        key = tuple((ord(c) - base) % 26 for c in s)
        buckets[key].append(s)
    return list(buckets.values())
