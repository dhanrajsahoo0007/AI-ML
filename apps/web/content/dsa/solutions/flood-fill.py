from typing import List


def flood_fill(image: List[List[int]], sr: int, sc: int, newColor: int) -> List[List[int]]:
    start = image[sr][sc]
    if start == newColor:
        return image
    m, n = len(image), len(image[0])
    dirs = ((1, 0), (-1, 0), (0, 1), (0, -1))

    def dfs(r: int, c: int) -> None:
        image[r][c] = newColor
        for dr, dc in dirs:
            nr, nc = r + dr, c + dc
            if 0 <= nr < m and 0 <= nc < n and image[nr][nc] == start:
                dfs(nr, nc)

    dfs(sr, sc)
    return image
