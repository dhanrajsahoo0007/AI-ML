import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Container, Eyebrow, PageHeader } from "@/components/ui/editorial";
import { MAX_SESSIONS_PER_USER, withPageSession } from "@/features/auth";
import { accountOverview, describeDevice } from "@/features/account";
import { SignOutEverywhereButton } from "@/features/account/account-actions.client";

export const metadata: Metadata = { title: "Your account" };

const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const dateTime = (d: Date) =>
  d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) +
  " UTC";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="rounded-2xl border border-hairline bg-paper p-6 sm:p-8">
      <h2 className="font-display text-2xl tracking-tight">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function AccountPage() {
  const data = await withPageSession(async (auth, db) => ({ auth, overview: await accountOverview(db, auth.user.id) }));
  if (!data?.overview) redirect("/sign-in?callbackURL=%2Faccount");
  const { auth, overview } = data;
  const { profile } = overview;
  const google = overview.accounts.find((a) => a.providerId === "google");

  return (
    <Container className="max-w-3xl space-y-8 py-14 sm:py-20">
      <PageHeader eyebrow="Account" title="Your account" />

      <Panel title="Profile">
        <div className="flex items-center gap-4">
          {profile.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- Google avatar; next/image would need remotePatterns
            <img
              src={profile.image}
              alt=""
              width={56}
              height={56}
              className="size-14 rounded-full"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span
              aria-hidden
              className="inline-flex size-14 items-center justify-center rounded-full bg-paper-2 text-xl text-ink"
            >
              {profile.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-medium text-ink" data-testid="account-name">
              {profile.name}
            </p>
            <p className="truncate text-[15px] text-muted-foreground" data-testid="account-email">
              {profile.email}
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 text-[15px] sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Plan</dt>
            <dd className="mt-1 text-ink" data-testid="account-plan">
              {overview.plan === "pro" ? "Pro" : "Free"}
              {overview.plan === "free" && (
                <>
                  {" · "}
                  <Link href="/pricing" className="underline underline-offset-2">
                    See Pro
                  </Link>
                </>
              )}
              {" · "}
              <Link href="/account/billing" className="underline underline-offset-2">
                Billing
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="mt-1 text-ink">{date(profile.createdAt)}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Connected account">
        <p className="text-[15px] text-ink">
          {google ? <>Google · connected {date(google.createdAt)}</> : "No Google account connected."}
        </p>
        <p className="mt-2 text-[13px] text-muted-foreground">
          You sign in with Google only; we never see or store a password.
        </p>
      </Panel>

      <Panel title="Progress">
        <p className="text-[15px] text-ink" data-testid="account-progress">
          {overview.completed.length} completed · {overview.bookmarks.length} bookmarked
        </p>
        {overview.completed.length > 0 && (
          <ul className="mt-3 space-y-1 text-[14px] text-muted-foreground" data-testid="account-completed">
            {overview.completed.slice(0, 10).map((key) => (
              <li key={key}>
                <Link href={`/${key}`} className="hover:text-ink">
                  {key}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Signed-in devices">
        <p className="text-[13px] text-muted-foreground">
          Up to {MAX_SESSIONS_PER_USER} devices stay signed in; signing in on another one signs out the oldest.
        </p>
        <ul className="mt-4 divide-y divide-hairline" data-testid="account-sessions">
          {overview.sessions.map((s) => (
            <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 py-3 text-[15px]">
              <span className="text-ink">
                {describeDevice(s.userAgent)}
                {s.id === auth.session.id && <span className="ml-2 text-[13px] text-primary">This device</span>}
              </span>
              <span className="text-[13px] text-muted-foreground">
                Signed in {dateTime(s.createdAt)} · active {dateTime(s.updatedAt)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-5">
          <SignOutEverywhereButton />
        </div>
      </Panel>

      <div>
        <Eyebrow>Your data</Eyebrow>
        <p className="mt-2 text-[15px] text-ink">
          <Link href="/account/data" className="underline underline-offset-2">
            Export or delete your data
          </Link>
        </p>
      </div>
    </Container>
  );
}
