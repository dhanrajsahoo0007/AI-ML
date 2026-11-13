from typing import List


def merge_alternately(word1: str, word2: str) -> str:
    i = j = 0
    res: List[str] = []
    while i < len(word1) and j < len(word2):
        res.append(word1[i])
        res.append(word2[j])
        i += 1
        j += 1
    res.extend(word1[i:])
    res.extend(word2[j:])
    return "".join(res)
