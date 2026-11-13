from typing import List


def min_falling_path_sum(matrix: List[List[int]]) -> int:
    n = len(matrix)
    prev = matrix[0][:]
    for i in range(1, n):
        cur = [0] * n
        for j in range(n):
            best = prev[j]
            if j:
                best = min(best, prev[j - 1])
            if j + 1 < n:
                best = min(best, prev[j + 1])
            cur[j] = matrix[i][j] + best
        prev = cur
    return min(prev)
