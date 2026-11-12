import heapq
from typing import List


def get_order(tasks: List[List[int]]) -> List[int]:
    indexed_tasks = sorted((t[0], t[1], i) for i, t in enumerate(tasks))
    heap = []
    result = []
    task_idx = 0
    current_time = indexed_tasks[0][0]

    while len(result) < len(tasks):
        while task_idx < len(tasks) and indexed_tasks[task_idx][0] <= current_time:
            enqueue, process, orig_idx = indexed_tasks[task_idx]
            heapq.heappush(heap, (process, orig_idx))
            task_idx += 1

        if heap:
            process_time, orig_idx = heapq.heappop(heap)
            result.append(orig_idx)
            current_time += process_time
        else:
            current_time = indexed_tasks[task_idx][0]

    return result
