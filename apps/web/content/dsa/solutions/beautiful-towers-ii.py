from typing import List


def maximum_sum_of_heights(maxHeights: List[int]) -> int:
    n = len(maxHeights)
    left = [0] * n
    right = [0] * n
    stack: List[int] = []

    for i in range(n):
        while stack and maxHeights[stack[-1]] > maxHeights[i]:
            stack.pop()
        if not stack:
            left[i] = (i + 1) * maxHeights[i]
        else:
            j = stack[-1]
            left[i] = left[j] + (i - j) * maxHeights[i]
        stack.append(i)

    stack.clear()
    for i in range(n - 1, -1, -1):
        while stack and maxHeights[stack[-1]] > maxHeights[i]:
            stack.pop()
        if not stack:
            right[i] = (n - i) * maxHeights[i]
        else:
            j = stack[-1]
            right[i] = right[j] + (j - i) * maxHeights[i]
        stack.append(i)

    return max(left[i] + right[i] - maxHeights[i] for i in range(n))
