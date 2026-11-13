from typing import List
from collections import defaultdict, deque


def min_mutation(start: str, end: str, bank: List[str]) -> int:
    bank_set = set(bank)
    if end not in bank_set:
        return -1
    chars = "ACGT"
    q = deque([(start, 0)])
    seen = {start}
    while q:
        gene, steps = q.popleft()
        if gene == end:
            return steps
        g = list(gene)
        for i in range(8):
            orig = g[i]
            for ch in chars:
                if ch == orig:
                    continue
                g[i] = ch
                nxt = "".join(g)
                if nxt in bank_set and nxt not in seen:
                    seen.add(nxt)
                    q.append((nxt, steps + 1))
            g[i] = orig
    return -1
