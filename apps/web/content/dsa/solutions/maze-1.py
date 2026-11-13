from typing import List
from collections import deque


def has_path(maze: List[List[int]], start: List[int], destination: List[int]) -> bool:
    # self.visited = [[False for  in range(len(maze[0]))] for  in range(len(maze))]
    directions = [(1, 0), (-1, 0), (0, 1), (0, -1)]
    end_x, end_y = destination[0], destination[1]
    rows = len(maze)
    cols = len(maze[0])
    visited = [[False for _ in range(cols)] for _ in range(rows)]

    queue: deque[tuple[int, int]] = deque([(start[0], start[1])])
    visited[start[0]][start[1]] = True

    while queue:
        curr_x, curr_y = queue.popleft()

        if curr_x == end_x and curr_y == end_y:
            return True

        for dx, dy in directions:
            x_, y_ = curr_x + dx, curr_y + dy

            # Continue moving in the same direction until hitting a wall
            while 0 <= x_ < len(maze) and 0 <= y_ < len(maze[0]) and maze[x_][y_] == 0:
                x_ += dx
                y_ += dy

            # Move back one step as we've hit a wall
            x_ -= dx
            y_ -= dy

            if not visited[x_][y_]:
                queue.append((x_, y_))
                visited[x_][y_] = True

    return False
