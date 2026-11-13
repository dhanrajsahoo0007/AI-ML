from typing import List


def corp_flight_bookings(bookings: List[List[int]], n: int) -> List[int]:
    diff = [0] * (n + 2)
    for first, last, seats in bookings:
        diff[first] += seats
        diff[last + 1] -= seats
    out: List[int] = []
    cur = 0
    for i in range(1, n + 1):
        cur += diff[i]
        out.append(cur)
    return out
