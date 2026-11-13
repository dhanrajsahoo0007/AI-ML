from collections import defaultdict, deque
from typing import List


def find_all_recipes(
    recipes: List[str], ingredients: List[List[str]], supplies: List[str]
) -> List[str]:
    indegree: dict[str, int] = {}
    graph: dict[str, List[str]] = defaultdict(list)
    for r, ing in zip(recipes, ingredients):
        indegree[r] = len(ing)
        for x in ing:
            graph[x].append(r)
    q = deque(supplies)
    result: List[str] = []
    recipe_set = set(recipes)
    while q:
        cur = q.popleft()
        for r in graph.get(cur, []):
            indegree[r] -= 1
            if indegree[r] == 0:
                result.append(r)
                if r in recipe_set:
                    q.append(r)
    return [r for r in result if r in recipe_set]
