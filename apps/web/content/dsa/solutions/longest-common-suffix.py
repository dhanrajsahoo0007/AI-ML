from __future__ import annotations

from typing import List


class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.longest_word_length: int = 0


class SuffixTrie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in reversed(word):
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            if len(word) > node.longest_word_length:
                node.longest_word_length = len(word)

    def longest_common_suffix_length(self, query: str) -> int:
        node = self.root
        for char in reversed(query):
            if char not in node.children:
                break
            node = node.children[char]
        return node.longest_word_length


def longest_common_suffix_queries(
    strings: List[str], queries: List[str]
) -> List[int]:
    trie = SuffixTrie()
    for s in strings:
        trie.insert(s)
    return [trie.longest_common_suffix_length(q) for q in queries]
