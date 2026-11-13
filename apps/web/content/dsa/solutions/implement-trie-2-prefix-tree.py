from __future__ import annotations


class TrieNode:
    def __init__(self) -> None:
        self.children: dict[str, TrieNode] = {}
        self.word_count: int = 0
        self.prefix_count: int = 0


class Trie:
    def __init__(self) -> None:
        self.root = TrieNode()

    def insert(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                node.children[char] = TrieNode()
            node = node.children[char]
            node.prefix_count += 1
        node.word_count += 1

    def count_words_equal_to(self, word: str) -> int:
        node = self.root
        for char in word:
            if char not in node.children:
                return 0
            node = node.children[char]
        return node.word_count

    def count_words_starting_with(self, prefix: str) -> int:
        node = self.root
        for char in prefix:
            if char not in node.children:
                return 0
            node = node.children[char]
        return node.prefix_count

    def erase(self, word: str) -> None:
        node = self.root
        for char in word:
            if char not in node.children:
                return
            node = node.children[char]
        if node.word_count == 0:
            return

        node.word_count -= 1
        path: list[tuple[TrieNode, str]] = []
        cur = self.root
        for char in word:
            path.append((cur, char))
            cur = cur.children[char]
            cur.prefix_count -= 1

        if node.word_count == 0 and not node.children:
            for parent, ch in reversed(path):
                child = parent.children.get(ch)
                if child is None:
                    break
                if child.prefix_count == 0 and child.word_count == 0 and not child.children:
                    del parent.children[ch]
                else:
                    break


class Solution:
    def __init__(self) -> None:
        self._trie = Trie()

    def insert(self, word: str) -> None:
        self._trie.insert(word)

    def count_words_equal_to(self, word: str) -> int:
        return self._trie.count_words_equal_to(word)

    def count_words_starting_with(self, prefix: str) -> int:
        return self._trie.count_words_starting_with(prefix)

    def erase(self, word: str) -> None:
        self._trie.erase(word)
