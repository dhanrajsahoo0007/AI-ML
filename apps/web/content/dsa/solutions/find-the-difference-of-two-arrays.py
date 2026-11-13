from typing import List, Set, Tuple


def find_difference(nums1: List[int], nums2: List[int]) -> List[List[int]]:
    s1, s2 = set(nums1), set(nums2)
    return [list(s1 - s2), list(s2 - s1)]


# --- Glue (same as the starter) ---

def find_difference_tests(a0, a1):  # the entry the tests call
    result = find_difference(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
