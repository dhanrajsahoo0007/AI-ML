from typing import List
from collections import defaultdict
import string


def find_ladders(beginWord: str, endWord: str, wordList: List[str]) -> List[List[str]]:
    if endWord not in wordList:
        return []

    word_set = set(wordList)
    parents: defaultdict[str, set[str]] = defaultdict(set)
    layer = {beginWord}

    while layer:
        if endWord in layer:
            break
        word_set -= layer
        next_layer: defaultdict[str, set[str]] = defaultdict(set)
        for word in layer:
            for i in range(len(word)):
                for c in string.ascii_lowercase:
                    nw = word[:i] + c + word[i + 1 :]
                    if nw in word_set:
                        next_layer[nw].add(word)
        if not next_layer:
            return []
        layer = set(next_layer.keys())
        for w in next_layer:
            parents[w] |= next_layer[w]

    res: List[List[str]] = []

    def dfs(word: str, path: List[str]) -> None:
        if word == beginWord:
            res.append(path[::-1])
            return
        for p in parents[word]:
            dfs(p, path + [p])

    dfs(endWord, [endWord])
    return res
