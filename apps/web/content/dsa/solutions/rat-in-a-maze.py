from typing import List, Tuple


def find_paths(maze: List[List[int]]) -> List[List[Tuple[int, int]]]:
    n = len(maze)
    paths: List[List[Tuple[int, int]]] = []
    moves = ((0, 1), (1, 0))

    def is_open(x: int, y: int) -> bool:
        return 0 <= x < n and 0 <= y < n and maze[x][y] == 1

    def backtrack(x: int, y: int, visited: List[List[bool]], path: List[Tuple[int, int]]) -> None:
        if x == n - 1 and y == n - 1:
            paths.append(path[:])
            return
        for dx, dy in moves:
            nx, ny = x + dx, y + dy
            if is_open(nx, ny) and not visited[nx][ny]:
                visited[nx][ny] = True
                path.append((nx, ny))
                backtrack(nx, ny, visited, path)
                path.pop()
                visited[nx][ny] = False

    if maze[0][0] == 0:
        return []
    visited = [[False] * n for _ in range(n)]
    visited[0][0] = True
    backtrack(0, 0, visited, [(0, 0)])
    return paths
