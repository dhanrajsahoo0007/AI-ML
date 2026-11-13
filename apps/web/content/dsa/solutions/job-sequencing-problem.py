from typing import List


def job_sequencing(jobs: List[List[int]]) -> int:
    if not jobs:
        return 0

    jobs.sort(key=lambda job: job[1], reverse=True)
    max_deadline = max(d for d, _ in jobs)
    parent = list(range(max_deadline + 2))

    def find(x: int) -> int:
        if parent[x] != x:
            parent[x] = find(parent[x])
        return parent[x]

    total = 0
    for deadline, profit in jobs:
        slot = find(deadline)
        if slot == 0:
            continue
        total += profit
        parent[slot] = find(slot - 1)

    return total
