from typing import List, Tuple


def survived_robots_healths(positions: List[int], healths: List[int], directions: str) -> List[int]:
    robots: List[Tuple[int, int, str, int]] = sorted(
        zip(positions, healths, directions, range(len(positions))), key=lambda item: item[0]
    )
    stack: List[Tuple[int, int]] = []

    for _, health, direction, idx in robots:
        signed = health if direction == "R" else -health
        while stack and signed < 0 < stack[-1][0]:
            if abs(stack[-1][0]) < abs(signed):
                stack.pop()
                continue
            if abs(stack[-1][0]) == abs(signed):
                stack.pop()
                signed = 0
                break
            top_health, top_idx = stack.pop()
            new_health = abs(top_health) - 1
            if new_health > 0:
                stack.append((new_health if top_health > 0 else -new_health, top_idx))
            signed = 0
            break
        if signed != 0:
            stack.append((signed, idx))

    survivors = [0] * len(positions)
    for health, idx in stack:
        survivors[idx] = abs(health)
    return [h for h in survivors if h > 0]
