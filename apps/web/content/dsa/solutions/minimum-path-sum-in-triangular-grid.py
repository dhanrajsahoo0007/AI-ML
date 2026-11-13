from typing import List


def minimum_total(triangle: List[List[int]]) -> int:
    cur = triangle[-1][:]
    for i in range(len(triangle) - 2, -1, -1):
        nxt = []
        for j in range(len(triangle[i])):
            nxt.append(triangle[i][j] + min(cur[j], cur[j + 1]))
        cur = nxt
    return cur[0]
