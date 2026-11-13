import heapq
from collections import deque


class MKAverage:
    def __init__(self, m: int, k: int):
        self.m = m
        self.k = k
        self.small = []
        self.middle = []
        self.large = []
        self.queue = deque()
        self.middle_sum = 0

    def addElement(self, num: int) -> None:
        self.queue.append(num)

        if not self.small or -num >= self.small[0]:
            heapq.heappush(self.small, -num)
        elif not self.large or num > self.large[0]:
            heapq.heappush(self.large, num)
        else:
            heapq.heappush(self.middle, num)
            self.middle_sum += num

        if len(self.queue) > self.m:
            old = self.queue.popleft()
            self._remove(old)

        self._rebalance()

    def _rebalance(self):
        while len(self.small) > self.k:
            val = -heapq.heappop(self.small)
            heapq.heappush(self.middle, val)
            self.middle_sum += val
        while len(self.small) < self.k and self.middle:
            val = heapq.heappop(self.middle)
            heapq.heappush(self.small, -val)
            self.middle_sum -= val

        while len(self.large) > self.k:
            val = heapq.heappop(self.large)
            heapq.heappush(self.middle, val)
            self.middle_sum += val
        while len(self.large) < self.k and self.middle:
            val = heapq.heappop(self.middle)
            heapq.heappush(self.large, val)
            self.middle_sum -= val

    def _remove(self, num: int) -> None:
        neg = -num
        if self.small and neg in self.small:
            self.small.remove(neg)
            heapq.heapify(self.small)
        elif self.large and num in self.large:
            self.large.remove(num)
            heapq.heapify(self.large)
        else:
            self.middle.remove(num)
            self.middle_sum -= num
            heapq.heapify(self.middle)

    def calculateMKAverage(self) -> int:
        if len(self.queue) < self.m:
            return -1
        if self.middle:
            return self.middle_sum // (self.m - 2 * self.k)
        return 0
