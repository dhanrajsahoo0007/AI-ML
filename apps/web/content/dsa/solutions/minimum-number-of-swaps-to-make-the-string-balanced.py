def min_swaps(s: str) -> int:
    imbalance = 0
    peak = 0
    for ch in s:
        if ch == "]":
            imbalance += 1
            peak = max(peak, imbalance)
        else:
            imbalance -= 1
    return (peak + 1) // 2
