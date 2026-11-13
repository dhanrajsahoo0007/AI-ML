from typing import List
from collections import defaultdict, deque


def find_all_recipes(recipes: List[str], ingredients: List[List[str]], supplies: List[str]) -> List[str]:
    need = defaultdict(list)
    indeg = {}
    for r, ing in zip(recipes, ingredients):
        indeg[r] = len(ing)
        for x in ing:
            need[x].append(r)

    q = deque(supplies)
    recipes_set = set(recipes)
    made = []

    while q:
        x = q.popleft()
        for r in need[x]:
            indeg[r] -= 1
            if indeg[r] == 0:
                made.append(r)
                q.append(r)
    return made
