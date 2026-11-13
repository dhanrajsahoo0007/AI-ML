from typing import List


def generate(numRows: int) -> List[List[int]]:
    triangle: List[List[int]] = [[1]]  # first row is always [1]
    for i in range(1, numRows):
        row = [1]  # left boundary
        for j in range(1, i):
            # Pascal rule: sum of the two parents from the prior row
            row.append(triangle[i - 1][j - 1] + triangle[i - 1][j])
        row.append(1)  # right boundary
        triangle.append(row)
    return triangle
