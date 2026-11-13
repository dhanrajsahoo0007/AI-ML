from typing import List
import heapq


def shortest_path(n: int, m: int, edges: List[List[int]]) -> List[int]:
    # Create adjacency list
    graph = [[] for _ in range(n+1)]
    for u, v, w in edges:
        graph[u].append((v, w))
        graph[v].append((u, w))
        
    # Initialize distances and previous nodes
    distances = [float('inf')] * (n+1)
    distances[1] = 0
    previous = [None] * (n+1)
        
    # Priority queue to store vertices to visit
    pq = [(0, 1)]
        
    while pq:
        current_distance, current_node = heapq.heappop(pq)
            
        # If we've reached the target node
        if current_node == n:
            break
            
        # If we've already found a shorter path, skip
        if current_distance > distances[current_node]:
            continue
            
        # Check all neighbors of the current node
        for neighbor, weight in graph[current_node]:
            distance = current_distance + weight
                
            # If we've found a shorter path to the neighbor, update it
            if distance < distances[neighbor]:
                distances[neighbor] = distance
                previous[neighbor] = current_node
                heapq.heappush(pq, (distance, neighbor))
        
    # If no path exists to node n
    if distances[n] == float('inf'):
        return [-1]
        
    # Reconstruct the path
    path = []
    current = n
    while current:
        path.append(current)
        current = previous[current]
    path.reverse()
        
    # Return the weight of the path and the path itself
    return [distances[n]] + path

# Example usage
