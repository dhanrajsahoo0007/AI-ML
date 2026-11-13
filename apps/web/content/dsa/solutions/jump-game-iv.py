from typing import List
from collections import defaultdict, deque


def min_jumps(arr: List[int]) -> int:
    n = len(arr)
    if n == 1:
        return 0
    pos = defaultdict(list)
    for i, v in enumerate(arr):
        pos[v].append(i)
    q = deque([(0, 0)])
    seen = {0}
    while q:
        i, d = q.popleft()
        if i == n - 1:
            return d
        for j in (i - 1, i + 1):
            if 0 <= j < n and j not in seen:
                seen.add(j)
                q.append((j, d + 1))
        for j in pos[arr[i]]:
            if j not in seen:
                seen.add(j)
                q.append((j, d + 1))
        pos[arr[i]].clear()
    return -1
