from typing import List


def maximal_rectangle(matrix: List[List[str]]) -> int:
    if not matrix:
        return 0
    m, n = len(matrix), len(matrix[0])
    heights = [0] * n
    best = 0
    for i in range(m):
        for j in range(n):
            heights[j] = heights[j] + 1 if matrix[i][j] == '1' else 0
        stack: List[int] = []
        for k in range(n + 1):
            h = heights[k] if k < n else 0
            while stack and h < heights[stack[-1]]:
                idx = stack.pop()
                width = k if not stack else k - stack[-1] - 1
                best = max(best, heights[idx] * width)
            stack.append(k)
    return best
