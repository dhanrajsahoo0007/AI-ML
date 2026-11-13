from typing import List


def partition_labels(s: str) -> List[int]:
    last = {c: i for i, c in enumerate(s)}
    ans: List[int] = []
    start = end = 0
    for i, c in enumerate(s):
        end = max(end, last[c])
        if i == end:
            ans.append(end - start + 1)
            start = i + 1
    return ans
