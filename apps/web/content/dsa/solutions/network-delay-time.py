from typing import List
import heapq


def network_delay_time(times: List[List[int]], n: int, k: int) -> int:
    # Create adjacency list
    graph = [[] for _ in range(n + 1)]
    for u, v, w in times:
        graph[u].append((v, w))
        
    # Initialize distances
    distances = [float('inf')] * (n + 1)
    distances[k] = 0
        
    # Priority queue to store vertices to visit
    pq = [(0, k)]
        
    while pq:
        current_time, current_node = heapq.heappop(pq)
            
        # If we've already found a shorter path, skip
        if current_time > distances[current_node]:
            continue
            
        # Check all neighbors of the current node
        for neighbor, time in graph[current_node]:
            new_time = current_time + time
                
            # If we've found a shorter path to the neighbor, update it
            if new_time < distances[neighbor]:
                distances[neighbor] = new_time
                heapq.heappush(pq, (new_time, neighbor))
        
    # Find the maximum time (excluding node 0 and unreachable nodes)
    # max_time = max(d for i, d in enumerate(distances) if i > 0)
    # as the oth element in the list will always be infinity (zero based index , we are taking n+1 in the calculation )
    max_time = max(distances[1:])
        
    # If any node is unreachable, return -1
    return max_time if max_time < float('inf') else -1

# Example usage
