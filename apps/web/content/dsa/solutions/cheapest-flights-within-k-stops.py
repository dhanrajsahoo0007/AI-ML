from typing import List
import heapq


def find_cheapest_price(n: int, flights: List[List[int]], src: int, dst: int, k: int) -> int:
    # Create adjacency list
    graph = [[] for _ in range(n)]
    for fromi, toi, pricei in flights:
        graph[fromi].append((toi, pricei))
        
    # Initialize distances and stops
    distances = [float('inf')] * n
    stops = [float('inf')] * n
    distances[src] = 0
    stops[src] = 0
        
    # Priority queue to store vertices to visit
    pq = [(0, 0, src)]  # (price, stops, node)
        
    while pq:
        current_price, current_stops, current_node = heapq.heappop(pq)
            
        # If we've reached the destination, return the price
        if current_node == dst:
            return current_price
            
        # If we've exceeded the number of stops, continue to the next iteration
        if current_stops > k:
            continue
            
        # Check all neighbors of the current node
        for neighbor, price in graph[current_node]:
            new_price = current_price + price
            new_stops = current_stops + 1
                
            # If we've found a cheaper path or a path with fewer stops, update it
            if new_price < distances[neighbor] or new_stops < stops[neighbor]:
                distances[neighbor] = new_price
                stops[neighbor] = new_stops
                heapq.heappush(pq, (new_price, new_stops, neighbor))
        
    # If we can't reach the destination within k stops, return -1
    return -1 if distances[dst] == float('inf') else distances[dst]

# Test the function with the given examples
