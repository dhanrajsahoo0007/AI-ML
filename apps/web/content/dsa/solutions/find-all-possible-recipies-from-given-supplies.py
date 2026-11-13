from typing import List
from collections import defaultdict, deque


def find_all_recipes(recipes: List[str], ingredients: List[List[str]], supplies: List[str]) -> List[str]:
    recipe_set = set(recipes)
    indegree: dict[str, int] = {}
    graph: dict[str, List[str]] = defaultdict(list)
    for r, ing in zip(recipes, ingredients):
        indegree[r] = len(ing)
        for x in ing:
            graph[x].append(r)
    q: deque[str] = deque(supplies)
    result: List[str] = []
    while q:
        item = q.popleft()
        if item in recipe_set:
            result.append(item)
        for r in graph.get(item, []):
            indegree[r] -= 1
            if indegree[r] == 0:
                q.append(r)
    return result
