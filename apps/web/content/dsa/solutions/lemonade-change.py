from typing import List


def lemonade_change(bills: List[int]) -> bool:
    five = ten = 0
    for bill in bills:
        if bill == 5:
            five += 1
        elif bill == 10:
            if not five:
                return False
            five -= 1
            ten += 1
        else:  # $20 bill → need $15 of change
            if ten and five:
                # Greedy preference: spend a $10 before burning three $5s.
                ten -= 1
                five -= 1
            elif five >= 3:
                five -= 3
            else:
                return False
    return True
