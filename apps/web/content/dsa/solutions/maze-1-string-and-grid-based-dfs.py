from typing import List


def has_path(maze: List[List[int]], start: List[int], destination: List[int]) -> bool:
    rows, cols = len(maze), len(maze[0])
    dest = (destination[0], destination[1])
    visited = [[False] * cols for _ in range(rows)]
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def dfs(x: int, y: int) -> bool:
        if visited[x][y]:
            return False
        visited[x][y] = True
        if (x, y) == dest:
            return True
        for dx, dy in dirs:
            nx, ny = x, y
            while 0 <= nx + dx < rows and 0 <= ny + dy < cols and maze[nx + dx][ny + dy] == 0:
                nx += dx
                ny += dy
            if dfs(nx, ny):
                return True
        return False

    return dfs(start[0], start[1])
