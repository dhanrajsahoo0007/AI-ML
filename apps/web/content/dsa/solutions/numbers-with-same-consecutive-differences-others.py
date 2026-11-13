from typing import List
from collections import defaultdict, deque


def nums_same_consec_diff(n: int, k: int) -> List[int]:
    if n == 1:
        return list(range(10))
    cur = list(range(1, 10))
    for _ in range(n - 1):
        nxt = []
        for num in cur:
            d = num % 10
            for nd in {d - k, d + k}:
                if 0 <= nd <= 9:
                    nxt.append(num * 10 + nd)
        cur = nxt
    return cur


# --- Glue (same as the starter) ---

def nums_same_consec_diff_tests(a0, a1):  # the entry the tests call
    result = nums_same_consec_diff(a0, a1)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
