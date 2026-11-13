from typing import List


def can_complete_circuit(gas: List[int], cost: List[int]) -> int:
    total = 0
    start = 0
    tank = 0
    for i in range(len(gas)):
        diff = gas[i] - cost[i]
        total += diff
        tank += diff
        if tank < 0:
            start = i + 1
            tank = 0
    return start if total >= 0 else -1
