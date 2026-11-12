from typing import List


def find_in_mountain_array(mountain: List[int], target: int) -> int:
    def peak_index() -> int:
        n = len(mountain)
        if n == 1:
            return 0
        if mountain[0] > mountain[1]:
            return 0
        if mountain[n - 1] > mountain[n - 2]:
            return n - 1
        lo, hi = 1, n - 2
        while lo <= hi:
            mid = (lo + hi) // 2
            if mountain[mid - 1] < mountain[mid] > mountain[mid + 1]:
                return mid
            if mountain[mid] < mountain[mid + 1]:
                lo = mid + 1
            else:
                hi = mid - 1
        return lo

    def bs_asc(lo: int, hi: int) -> int:
        while lo <= hi:
            mid = (lo + hi) // 2
            if mountain[mid] == target:
                return mid
            if mountain[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1

    def bs_desc(lo: int, hi: int) -> int:
        while lo <= hi:
            mid = (lo + hi) // 2
            if mountain[mid] == target:
                return mid
            if mountain[mid] > target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1

    p = peak_index()
    if mountain[p] == target:
        return p
    if target > mountain[p]:
        return -1
    left = bs_asc(0, p - 1)
    if left != -1:
        return left
    return bs_desc(p + 1, len(mountain) - 1)
