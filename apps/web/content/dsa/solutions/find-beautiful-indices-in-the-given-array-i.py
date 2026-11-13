import bisect
from typing import List


def beautiful_indices(s: str, a: str, b: str, k: int) -> List[int]:
    hits_a = _kmp_find(s, a)
    hits_b = _kmp_find(s, b)
    answer: List[int] = []
    for i in hits_a:
        lo = i - k
        hi = i + k
        idx = bisect.bisect_left(hits_b, lo)
        if idx < len(hits_b) and hits_b[idx] <= hi:
            answer.append(i)
    return answer


def _kmp_find(text: str, pattern: str) -> List[int]:
    if not pattern:
        return []
    m = len(pattern)
    pi = [0] * m
    for i in range(1, m):
        j = pi[i - 1]
        while j and pattern[i] != pattern[j]:
            j = pi[j - 1]
        if pattern[i] == pattern[j]:
            j += 1
        pi[i] = j
    hits: List[int] = []
    j = 0
    for i, ch in enumerate(text):
        while j and ch != pattern[j]:
            j = pi[j - 1]
        if ch == pattern[j]:
            j += 1
        if j == m:
            hits.append(i - m + 1)
            j = pi[j - 1]
    return hits
