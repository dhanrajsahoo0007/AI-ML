import bisect
from typing import List


def median_sliding_window(nums: List[int], k: int) -> List[float]:
    window = sorted(nums[:k])
    out: List[float] = []

    def median(values: List[int]) -> float:
        mid = k // 2
        if k % 2:
            return float(values[mid])
        return (values[mid - 1] + values[mid]) / 2.0

    out.append(median(window))

    for i in range(k, len(nums)):
        left_val = nums[i - k]
        window.pop(bisect.bisect_left(window, left_val))
        bisect.insort(window, nums[i])
        out.append(median(window))

    return out


# --- Glue (same as the starter) ---

def _rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, list):
        return [_rounded(v) for v in x]
    return x


def median_sliding_window_tests(a0, a1):  # the entry the tests call
    result = median_sliding_window(a0, a1)
    result = _rounded(result)
    return result
