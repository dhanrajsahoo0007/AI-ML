from typing import List


def sum_subarray_mins(arr: List[int]) -> int:
    mod = 10**9 + 7
    n = len(arr)
    prev_smaller = [-1] * n
    stack: List[int] = []
    for i in range(n):
        while stack and arr[stack[-1]] > arr[i]:
            stack.pop()
        prev_smaller[i] = stack[-1] if stack else -1
        stack.append(i)

    next_smaller = [n] * n
    stack.clear()
    for i in range(n - 1, -1, -1):
        while stack and arr[stack[-1]] >= arr[i]:
            stack.pop()
        next_smaller[i] = stack[-1] if stack else n
        stack.append(i)

    total = 0
    for i in range(n):
        left = i - prev_smaller[i]
        right = next_smaller[i] - i
        total = (total + arr[i] * left * right) % mod
    return total
