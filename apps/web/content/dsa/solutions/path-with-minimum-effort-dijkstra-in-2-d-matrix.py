from typing import List
import heapq


def minimum_effort_path(heights: List[List[int]]) -> int:
    m, n = len(heights), len(heights[0])
        
    # Interesting representation of directions
    dirs = [
                [-1, 0],
        [0, -1],        [0, 1],
                [1, 0]
    ]
        
    def isSafe(x: int, y: int) -> bool:
        return 0 <= x < m and 0 <= y < n
        
    result = [[float('inf')] * n for _ in range(m)]
    pq = [(0, 0, 0)]  # (diff, x, y)
    result[0][0] = 0
        
    while pq:
        diff, x, y = heapq.heappop(pq)
            
        # Early return when reaching the destination
        if x == m - 1 and y == n - 1:
            return diff
            
        for dx, dy in dirs:
            x_, y_ = x + dx, y + dy
            if isSafe(x_, y_):
                newDiff = max(diff, abs(heights[x][y] - heights[x_][y_]))
                if result[x_][y_] > newDiff:
                    result[x_][y_] = newDiff
                    heapq.heappush(pq, (newDiff, x_, y_))
        
    return result[m-1][n-1]

# Example usage
