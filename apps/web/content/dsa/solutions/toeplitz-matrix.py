from typing import List


def is_toeplitz_matrix(matrix: List[List[int]]) -> bool:
    m = len(matrix)
    n = len(matrix[0])
    # Start from (1,1): compare each cell to the element diagonally up-left.
    for i in range(1, m):
        for j in range(1, n):
            if matrix[i][j] != matrix[i - 1][j - 1]:
                return False  # broken diagonal
    return True
