from typing import List


def count_students(students: List[int], sandwiches: List[int]) -> int:
    circle = sum(1 for s in students if s == 0)
    square = len(students) - circle
    for sandwich in sandwiches:
        if sandwich == 0 and circle > 0:
            circle -= 1
        elif sandwich == 1 and square > 0:
            square -= 1
        else:
            break
    return circle + square
