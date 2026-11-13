from typing import Dict, Optional


class TrieNode:
    __slots__ = ("children", "end")

    def __init__(self) -> None:
        self.children: Dict[str, TrieNode] = {}
        self.end: bool = False


class WordDictionary:
    def __init__(self) -> None:
        self._root = TrieNode()

    def addWord(self, word: str) -> None:
        node = self._root
        for ch in word:
            if ch not in node.children:
                node.children[ch] = TrieNode()
            node = node.children[ch]
        node.end = True

    def search(self, word: str) -> bool:
        def dfs(i: int, node: TrieNode) -> bool:
            if i == len(word):
                return node.end
            ch = word[i]
            if ch == ".":
                return any(dfs(i + 1, child) for child in node.children.values())
            if ch not in node.children:
                return False
            return dfs(i + 1, node.children[ch])

        return dfs(0, self._root)
