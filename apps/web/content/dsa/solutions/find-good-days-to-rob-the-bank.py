from typing import List


def good_days_to_rob_bank(security: List[int], time: int) -> List[int]:
    n = len(security)
    if time == 0:
        return list(range(n))
    before = [0] * n
    for i in range(1, n):
        if security[i] <= security[i - 1]:
            before[i] = before[i - 1] + 1
    after = [0] * n
    for i in range(n - 2, -1, -1):
        if security[i] <= security[i + 1]:
            after[i] = after[i + 1] + 1
    out: List[int] = []
    for i in range(time, n - time):
        if before[i] >= time and after[i] >= time:
            out.append(i)
    return out
