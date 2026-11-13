from typing import List


def asteroid_collision(asteroids: List[int]) -> List[int]:
    stack: List[int] = []
    for rock in asteroids:
        while stack and rock < 0 < stack[-1]:
            if stack[-1] < -rock:
                stack.pop()
                continue
            if stack[-1] == -rock:
                stack.pop()
            break
        else:
            stack.append(rock)
    return stack
