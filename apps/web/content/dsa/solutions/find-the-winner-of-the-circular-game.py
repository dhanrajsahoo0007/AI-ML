from typing import List


def find_the_winner(n: int, k: int) -> int:
    friends: List[int] = list(range(1, n + 1))
    index = 0
    while len(friends) > 1:
        index = (index + k - 1) % len(friends)
        friends.pop(index)
    return friends[0]
