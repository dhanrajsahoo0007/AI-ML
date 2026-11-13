from typing import List
from collections import defaultdict


class DSU:
    def __init__(self, n: int) -> None:
        self.parent = list(range(n))
        self.size = [1] * n
        self.number_of_components = n

    def find(self, x: int) -> int:
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])
        return self.parent[x]

    def union(self, x: int, y: int) -> None:
        x_parent, y_parent = self.find(x), self.find(y)
        if x_parent == y_parent:
            return

        if self.size[x_parent] > self.size[y_parent]:
            self.parent[y_parent] = x_parent
            self.size[x_parent] += self.size[y_parent]
        else:
            self.parent[x_parent] = y_parent
            self.size[y_parent] += self.size[x_parent]

        self.number_of_components -= 1


def accounts_merge(accounts: List[List[str]]) -> List[List[str]]:
    n = len(accounts)
    dsu = DSU(n)

    email_to_account: dict[str, int] = {}
    for i, (_, *emails) in enumerate(accounts):
        for email in emails:
            if email in email_to_account:
                dsu.union(i, email_to_account[email])
            else:
                email_to_account[email] = i

    merged_accounts: dict[int, List[str]] = defaultdict(list)
    for email, account_index in email_to_account.items():
        root = dsu.find(account_index)
        merged_accounts[root].append(email)

    result: List[List[str]] = []
    for account_index, emails in merged_accounts.items():
        name = accounts[account_index][0]
        result.append([name] + sorted(emails))

    return result


# --- Glue (same as the starter) ---

def accounts_merge_tests(a0):  # the entry the tests call
    result = accounts_merge(a0)
    result = sorted(result, key=repr) if isinstance(result, list) else result
    return result
