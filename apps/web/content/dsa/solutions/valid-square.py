from typing import List


def valid_square(
    p1: List[int], p2: List[int], p3: List[int], p4: List[int]
) -> bool:
    pts = [p1, p2, p3, p4]
    dists: List[int] = []
    for i in range(4):
        for j in range(i + 1, 4):
            dx = pts[i][0] - pts[j][0]
            dy = pts[i][1] - pts[j][1]
            dists.append(dx * dx + dy * dy)
    dists.sort()
    return (
        dists[0] > 0
        and dists[0] == dists[1] == dists[2] == dists[3]
        and dists[4] == dists[5]
        and dists[4] == 2 * dists[0]
    )


# --- Glue (same as the starter) ---

def valid_square_tests(a0, a1, a2, a3):  # the entry the tests call
    result = valid_square(a0, a1, a2, a3)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
