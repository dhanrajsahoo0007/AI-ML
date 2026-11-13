from typing import List


def latest_time_catch_the_bus(buses: List[int], passengers: List[int], capacity: int) -> int:
    buses.sort()
    passengers.sort()
    p = 0
    prev = -1  # last timestamp that is definitely occupied by an existing passenger
    ans = 0
    for dep in buses:
        taken = 0
        while p < len(passengers) and passengers[p] <= dep and taken < capacity:
            # Try to slip in one second before this passenger if that second is still free.
            if passengers[p] - 1 != prev:
                ans = passengers[p] - 1
            prev = passengers[p]
            p += 1
            taken += 1
        if taken < capacity and prev != dep:
            # Bus not full → riding exactly at departure might still be possible.
            ans = dep
    return ans
