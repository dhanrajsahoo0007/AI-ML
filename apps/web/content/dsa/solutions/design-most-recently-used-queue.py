from typing import List


class MRUQueue:
    def __init__(self, n: int) -> None:
        self.queue: List[int] = list(range(1, n + 1))

    def fetch(self, k: int) -> int:
        value = self.queue.pop(k - 1)
        self.queue.append(value)
        return value
