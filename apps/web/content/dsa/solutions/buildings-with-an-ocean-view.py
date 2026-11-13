from typing import List


def find_buildings(heights: List[int]) -> List[int]:
    answer: List[int] = []
    running_max = 0
    for i in range(len(heights) - 1, -1, -1):
        h = heights[i]
        if h > running_max:
            answer.append(i)
            running_max = h
    return answer[::-1]
