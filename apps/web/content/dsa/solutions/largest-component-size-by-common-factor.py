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


def largest_component_size(nums: List[int]) -> int:
    limit = max(nums) + 1
    dsu = DSU(limit)

    def factor_and_union(num: int) -> None:
        x = num
        p = 2
        while p * p <= x:
            if x % p == 0:
                dsu.union(num, p)
                while x % p == 0:
                    x //= p
            p += 1
        if x > 1:
            dsu.union(num, x)

    for value in nums:
        factor_and_union(value)

    component_size: dict[int, int] = {}
    max_size = 0
    for num in nums:
        parent = dsu.find(num)
        component_size[parent] = component_size.get(parent, 0) + 1
        max_size = max(max_size, component_size[parent])

    return max_size
