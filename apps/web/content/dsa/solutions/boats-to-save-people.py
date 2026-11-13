from typing import List


def num_rescue_boats(people: List[int], limit: int) -> int:
    people.sort()
    left, right = 0, len(people) - 1
    boats = 0
    while left <= right:
        if people[left] + people[right] <= limit:
            # Light + heavy share a boat; advance the light pointer.
            left += 1
        # Heavy always boards (either alone or paired).
        right -= 1
        boats += 1
    return boats
