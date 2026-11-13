import heapq
from typing import List


def car_pooling(trips: List[List[int]], capacity: int) -> bool:
    trips.sort(key=lambda x: x[1])
    heap = []
    passengers = 0

    for num_passengers, start, end in trips:
        while heap and heap[0][0] <= start:
            _, drop = heapq.heappop(heap)
            passengers -= drop

        passengers += num_passengers
        if passengers > capacity:
            return False

        heapq.heappush(heap, (end, num_passengers))

    return True
