from typing import List


def simulate_queue(wait: List[int]) -> List[int]:
    n = len(wait)
    result = [n]
    expirations = sorted((wait[i], i) for i in range(n))

    time = 0
    next_expire = 0
    queue_size = n

    while queue_size > 0:
        time += 1
        queue_size -= 1

        while next_expire < n and expirations[next_expire][0] <= time:
            if expirations[next_expire][1] > time - 1:
                queue_size = max(0, queue_size - 1)
            next_expire += 1

        result.append(max(0, queue_size))
        if queue_size <= 0:
            break

    return result
