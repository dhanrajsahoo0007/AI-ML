from typing import List


def closest_meeting_node(edges: List[int], node1: int, node2: int) -> int:

    def distances(start: int) -> dict[int, int]:
        dist: dict[int, int] = {}
        cur, step = start, 0
        while cur != -1 and cur not in dist:
            dist[cur] = step
            step += 1
            cur = edges[cur]
        return dist

    d1 = distances(node1)
    d2 = distances(node2)
    best = -1
    best_score = 10**9
    for i in range(len(edges)):
        if i in d1 and i in d2:
            score = max(d1[i], d2[i])
            if score < best_score or (score == best_score and i < best):
                best_score = score
                best = i
    return best
