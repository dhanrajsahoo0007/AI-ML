from typing import Dict, List


def longest_str_chain(words: List[str]) -> int:
    words.sort(key=len)
    best: Dict[str, int] = {}
    ans = 0
    for w in words:
        cur = 1
        for i in range(len(w)):
            pred = w[:i] + w[i + 1 :]
            cur = max(cur, best.get(pred, 0) + 1)
        best[w] = cur
        ans = max(ans, cur)
    return ans
