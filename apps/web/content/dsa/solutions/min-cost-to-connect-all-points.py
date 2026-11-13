from typing import List


# --- Original teaching notes (why Prim here) ---
# Complete graph has Theta(n^2) edges; building + sorting for Kruskal is heavy.
# Prim only needs the cheapest edge from the frontier to OUTSIDE — computable on the fly
# by scanning all unvisited points when a new vertex joins the tree.
#
#   points:  A *--------* B
#              \        /
#               \      /
#                 * C
#
# Manhattan |Ax-Bx|+|Ay-By| is the edge weight between any two "cities".
# --- end notes ---


def min_cost_connect_points(points: List[List[int]]) -> int:
    n = len(points)
    if n <= 1:
        return 0

    visited = [False] * n
    dist = [10**18] * n
    dist[0] = 0
    total = 0

    for _ in range(n):
        u = -1
        best = 10**18
        for i in range(n):
            if not visited[i] and dist[i] < best:
                best = dist[i]
                u = i

        visited[u] = True
        total += dist[u]

        ux, uy = points[u]
        for v in range(n):
            if not visited[v]:
                vx, vy = points[v]
                d = abs(ux - vx) + abs(uy - vy)
                if d < dist[v]:
                    dist[v] = d

    return total
