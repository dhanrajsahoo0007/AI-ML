from typing import List
from collections import defaultdict, deque


def jumping_numbers(x: int) -> List[int]:
    if x < 0:
        return []
    seen = set()
    q = deque()
    for d in range(min(10, x + 1)):
        q.append(d)
    while q:
        num = q.popleft()
        if num in seen:
            continue
        seen.add(num)
        if num > x:
            continue
        if num == 0:
            continue
        last = num % 10
        for delta in (-1, 1):
            nd = last + delta
            if 0 <= nd <= 9:
                nxt = num * 10 + nd
                if nxt <= x and nxt not in seen:
                    q.append(nxt)
    return sorted(seen)
