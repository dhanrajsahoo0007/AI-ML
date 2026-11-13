from typing import List


def find_median_sorted_arrays(nums1: List[int], nums2: List[int]) -> float:
    if len(nums1) > len(nums2):
        nums1, nums2 = nums2, nums1
    m, n = len(nums1), len(nums2)
    total = m + n
    half = (total + 1) // 2
    lo, hi = 0, m
    while lo <= hi:
        px = (lo + hi) // 2
        py = half - px
        max_left_x = float("-inf") if px == 0 else nums1[px - 1]
        min_right_x = float("inf") if px == m else nums1[px]
        max_left_y = float("-inf") if py == 0 else nums2[py - 1]
        min_right_y = float("inf") if py == n else nums2[py]
        if max_left_x <= min_right_y and max_left_y <= min_right_x:
            if total % 2:
                return float(max(max_left_x, max_left_y))
            return (max(max_left_x, max_left_y) + min(min_right_x, min_right_y)) / 2.0
        if max_left_x > min_right_y:
            hi = px - 1
        else:
            lo = px + 1
    raise ValueError("arrays must be sorted")


# --- Glue (same as the starter) ---

def _rounded(x):
    if isinstance(x, float):
        return round(x, 5)
    if isinstance(x, list):
        return [_rounded(v) for v in x]
    return x


def find_median_sorted_arrays_tests(a0, a1):  # the entry the tests call
    result = find_median_sorted_arrays(a0, a1)
    result = _rounded(result)
    return result
