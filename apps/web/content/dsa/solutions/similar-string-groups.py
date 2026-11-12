from typing import List


def num_similar_groups(strs: List[str]) -> int:
    n = len(strs)

    def similar(a: str, b: str) -> bool:
        if len(a) != len(b):
            return False
        diff = [i for i in range(len(a)) if a[i] != b[i]]
        if not diff:
            return True
        if len(diff) != 2:
            return False
        i, j = diff
        return a[i] == b[j] and a[j] == b[i]

    parent = list(range(n))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a: int, b: int) -> None:
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[rb] = ra

    for i in range(n):
        for j in range(i + 1, n):
            if similar(strs[i], strs[j]):
                union(i, j)

    return len({find(i) for i in range(n)})
