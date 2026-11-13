from typing import List


def find_diagonal_order(mat: List[List[int]]) -> List[int]:
    if not mat or not mat[0]:
        return []
    m = len(mat)
    n = len(mat[0])
    res: List[int] = []
    row = col = 0
    going_up = True
    while len(res) < m * n:
        res.append(mat[row][col])
        if going_up:
            if col == n - 1:
                row += 1
                going_up = False
            elif row == 0:
                col += 1
                going_up = False
            else:
                row -= 1
                col += 1
        else:
            if row == m - 1:
                col += 1
                going_up = True
            elif col == 0:
                row += 1
                going_up = True
            else:
                row += 1
                col -= 1
    return res
