from typing import List


class Solution:
    def __init__(self, nums: List[int]) -> None:
        self._prefix: List[int] = [0]
        s = 0
        for x in nums:
            s += x
            self._prefix.append(s)

    def sumRange(self, left: int, right: int) -> int:
        return self._prefix[right + 1] - self._prefix[left]
