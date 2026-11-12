def push_dominoes(dominoes: str) -> str:
    n = len(dominoes)
    forces = [0] * n
    strength = 0
    for i in range(n):
        if dominoes[i] == "R":
            strength = n
        elif dominoes[i] == "L":
            strength = 0
        else:
            strength = max(strength - 1, 0)
        forces[i] += strength
    strength = 0
    for i in range(n - 1, -1, -1):
        if dominoes[i] == "L":
            strength = n
        elif dominoes[i] == "R":
            strength = 0
        else:
            strength = max(strength - 1, 0)
        forces[i] -= strength
    return "".join("." if f == 0 else "R" if f > 0 else "L" for f in forces)
