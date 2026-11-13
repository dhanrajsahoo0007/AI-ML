from typing import List


def nearest_greater_to_left(arr: List[int]) -> List[int]:
    n = len(arr)
    result = [-1] * n
    stack: List[int] = []
    for i in range(n):
        while stack and stack[-1] <= arr[i]:
            stack.pop()
        if stack:
            result[i] = stack[-1]
        stack.append(arr[i])
    return result
