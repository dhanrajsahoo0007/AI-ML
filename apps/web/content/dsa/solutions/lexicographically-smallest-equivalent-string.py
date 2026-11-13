from typing import List


def smallest_equivalent_string(s1: str, s2: str, base: str) -> str:
    parent: List[int] = list(range(26))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra == rb:
            return
        if ra < rb:
            parent[rb] = ra
        else:
            parent[ra] = rb

    for c1, c2 in zip(s1, s2):
        union(ord(c1) - ord("a"), ord(c2) - ord("a"))

    return "".join(chr(ord("a") + find(ord(c) - ord("a"))) for c in base)
