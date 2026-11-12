import heapq


def kth_largest_value(m: int, n: int, k: int) -> int:
    vals = [i ^ j for i in range(m) for j in range(n)]
    return heapq.nlargest(k, vals)[-1]
