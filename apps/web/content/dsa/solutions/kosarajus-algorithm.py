from typing import List
from collections import defaultdict


# --- Original teaching notes (Kosaraju trace on Example 1) ---
# Edges: 1->0, 0->2, 2->1 form SCC {0,1,2}. 0->3, 3->4 chain gives SCCs {3},{4}.
#
# Pass 1 (finish times on G): e.g. start 0 -> ... stack bottom ... top reflects finishes.
# Pass 2 on G^T: processing "sink SCCs" of the condensation graph first isolates them.
#
#   1 ---> 0 ---> 3 ---> 4
#   ^      /
#    \    v
#      2
#
# Transpose flips arrows; the second pass peels SCCs cleanly.
# --- end trace ---


def kosaraju_sccs(V: int, edges: List[List[int]]) -> List[List[int]]:
    g: defaultdict[int, List[int]] = defaultdict(list)
    gt: defaultdict[int, List[int]] = defaultdict(list)
    for u, v in edges:
        g[u].append(v)
        gt[v].append(u)

    visited = [False] * V
    order: List[int] = []

    def dfs1(u: int) -> None:
        visited[u] = True
        for v in g[u]:
            if not visited[v]:
                dfs1(v)
        order.append(u)

    for i in range(V):
        if not visited[i]:
            dfs1(i)

    visited2 = [False] * V
    comps: List[List[int]] = []

    def dfs2(u: int, acc: List[int]) -> None:
        visited2[u] = True
        acc.append(u)
        for v in gt[u]:
            if not visited2[v]:
                dfs2(v, acc)

    for u in reversed(order):
        if not visited2[u]:
            comp: List[int] = []
            dfs2(u, comp)
            comps.append(sorted(comp))

    # Deterministic ordering: larger SCCs first (by size desc), then by smallest vertex
    comps.sort(key=lambda c: (-len(c), c[0]))
    return comps
