from typing import List


def tower_of_hanoi(n: int) -> List[str]:
    moves: List[str] = []

    def hanoi(disks: int, src: str, aux: str, dst: str) -> None:
        if disks == 0:
            return
        hanoi(disks - 1, src, dst, aux)
        moves.append(f"{src}->{dst}")
        hanoi(disks - 1, aux, src, dst)

    hanoi(n, "A", "B", "C")
    return moves
