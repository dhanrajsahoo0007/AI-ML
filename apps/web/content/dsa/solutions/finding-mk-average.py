import bisect
from collections import deque


class MKAverage:
    """Keeps the last m values in arrival order and in sorted order.

    The original version kept three heaps and moved values between them; it could leave a value on the wrong side
    when the window slid, so it returned wrong averages. Keeping one sorted list of the window is simpler and
    always right: adding and removing cost O(m), the average costs O(m).
    """

    def __init__(self, m: int, k: int):
        self.m = m
        self.k = k
        self.queue = deque()
        self.window = []

    def addElement(self, num: int) -> None:
        self.queue.append(num)
        bisect.insort(self.window, num)
        if len(self.queue) > self.m:
            old = self.queue.popleft()
            del self.window[bisect.bisect_left(self.window, old)]

    def calculateMKAverage(self) -> int:
        if len(self.queue) < self.m:
            return -1
        middle = self.window[self.k:self.m - self.k]
        return sum(middle) // len(middle)
