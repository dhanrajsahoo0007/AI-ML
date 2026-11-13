from typing import List


def stone_game_ix(stones: List[int]) -> bool:
    c = [0, 0, 0]
    for a in stones:
        c[a % 3] += 1
    if c[0] % 2 == 0:
        return min(c[1], c[2]) > 0
    return abs(c[1] - c[2]) > 2
