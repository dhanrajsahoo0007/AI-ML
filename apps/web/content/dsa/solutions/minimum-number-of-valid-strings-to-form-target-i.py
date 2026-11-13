from functools import cache
from typing import List, Optional


class TrieNode:
    __slots__ = ("children",)

    def __init__(self) -> None:
        self.children: List[Optional[TrieNode]] = [None] * 26


def min_valid_strings(words: List[str], target: str) -> int:
    root = TrieNode()
    for w in words:
        node = root
        for ch in w:
            idx = ord(ch) - ord("a")
            if node.children[idx] is None:
                node.children[idx] = TrieNode()
            node = node.children[idx]

    n = len(target)
    inf = 10**9

    @cache
    def dfs(i: int) -> int:
        if i >= n:
            return 0
        node = root
        best = inf
        for j in range(i, n):
            idx = ord(target[j]) - ord("a")
            nxt = node.children[idx]
            if nxt is None:
                break
            node = nxt
            best = min(best, 1 + dfs(j + 1))
        return best

    ans = dfs(0)
    return ans if ans < inf else -1
