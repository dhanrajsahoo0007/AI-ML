import bisect
from typing import List


def suggested_products(products: List[str], searchWord: str) -> List[List[str]]:
    products.sort()
    res: List[List[str]] = []
    left, right = 0, len(products)
    prefix = ""
    for c in searchWord:
        prefix += c
        left = bisect.bisect_left(products, prefix, left, right)
        right = bisect.bisect_right(products, prefix + "{", left, right)
        res.append(products[left : min(left + 3, right)])
    return res
