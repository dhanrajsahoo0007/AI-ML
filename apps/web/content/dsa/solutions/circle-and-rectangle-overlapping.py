def check_overlap(
    radius: int,
    xCenter: int,
    yCenter: int,
    x1: int,
    y1: int,
    x2: int,
    y2: int,
) -> bool:
    cx = min(max(xCenter, x1), x2)
    cy = min(max(yCenter, y1), y2)
    dx, dy = xCenter - cx, yCenter - cy
    return dx * dx + dy * dy <= radius * radius
