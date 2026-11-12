from collections import Counter


def count_anagram_occurrences(text: str, pattern: str) -> int:
    k = len(pattern)
    n = len(text)
    if k == 0 or n < k:
        return 0

    need = Counter(pattern)
    window = Counter(text[:k])
    ans = 1 if window == need else 0

    for j in range(k, n):
        left = text[j - k]
        window[left] -= 1
        if window[left] == 0:
            del window[left]

        window[text[j]] += 1

        if window == need:
            ans += 1

    return ans
