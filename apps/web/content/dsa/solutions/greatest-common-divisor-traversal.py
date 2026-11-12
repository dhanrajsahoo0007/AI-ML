from typing import List


class DSU:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.size = [1] * n
        self.number_of_components = n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: int, y: int) -> None:
        x_parent, y_parent = self.find(x), self.find(y)
        if x_parent == y_parent:
            return

        if self.size[x_parent] > self.size[y_parent]:
            self.parent[y_parent] = x_parent
            self.size[x_parent] += self.size[y_parent]
        else:
            self.parent[x_parent] = y_parent
            self.size[y_parent] += self.size[x_parent]

        self.number_of_components -= 1

    def components(self) -> int:
        return self.number_of_components


def can_traverse_all_pairs(nums: List[int]) -> bool:
    n = len(nums)
    dsu = DSU(n)

    m = max(nums)
    first = [-1] * (m + 1)

    for i in range(n):
        num = nums[i]

        for prime in range(2, int(num**0.5) + 1):
            if num % prime != 0:
                continue

            if first[prime] != -1:
                dsu.union(first[prime], i)
            else:
                first[prime] = i

            while num % prime == 0:
                num //= prime

        if num > 1:
            if first[num] != -1:
                dsu.union(first[num], i)
            else:
                first[num] = i

    return dsu.components() == 1
