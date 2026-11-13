from typing import List


def unique_paths_with_obstacles(obstacleGrid: List[List[int]]) -> int:
    if obstacleGrid[0][0] == 1 or obstacleGrid[-1][-1] == 1:
        return 0
    n = len(obstacleGrid[0])
    dp = [0] * n
    dp[0] = 1
    for i in range(len(obstacleGrid)):
        for j in range(n):
            if obstacleGrid[i][j] == 1:
                dp[j] = 0
            elif j > 0:
                dp[j] += dp[j - 1]
    return dp[-1]
