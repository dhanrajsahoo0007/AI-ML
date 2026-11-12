from typing import List


def max_score(cardPoints: List[int], k: int) -> int:
    n = len(cardPoints)
    if k == n:
        return sum(cardPoints)

    window = n - k
    window_sum = sum(cardPoints[:window])
    min_window = window_sum
    total = sum(cardPoints)

    for i in range(window, n):
        window_sum += cardPoints[i] - cardPoints[i - window]
        min_window = min(min_window, window_sum)

    return total - min_window
