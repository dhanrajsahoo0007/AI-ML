from typing import List
from collections import defaultdict, deque


def open_lock(deadends: List[str], target: str) -> int:
    dead = set(deadends)
    if "0000" in dead:
        return -1
    q = deque([("0000", 0)])
    seen = {"0000"}
    while q:
        s, d = q.popleft()
        if s == target:
            return d
        arr = list(s)
        for i in range(4):
            ch = arr[i]
            for delta in (-1, 1):
                nd = (int(ch) + delta) % 10
                arr[i] = str(nd)
                nxt = "".join(arr)
                arr[i] = ch
                if nxt not in seen and nxt not in dead:
                    seen.add(nxt)
                    q.append((nxt, d + 1))
    return -1
