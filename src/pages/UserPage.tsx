import { Link } from "react-router-dom";
import { mockUser, defaultAvatar } from "../data/user";
import SubscribeButton from "../components/SubscribeButton";

const formattedDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 py-3">
      <dt className="text-xs font-medium tracking-wide text-text-dim uppercase">
        {label}
      </dt>
      <dd className="text-sm text-text">{value}</dd>
    </div>
  );
}

export default function UserPage() {
  const user = mockUser;

  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <img
            src={user.avatar ?? defaultAvatar}
            alt="Avatar"
            className="h-20 w-20 rounded-full ring-2 ring-accent"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{user.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  user.visibility === "PUBLIC"
                    ? "bg-accent/15 text-accent"
                    : "bg-text-dim/15 text-text-dim"
                }`}
              >
                {user.visibility === "PUBLIC" ? "Public account" : "Private account"}
              </span>
            </div>
          </div>
          <div className="ml-auto shrink-0">
            <SubscribeButton channelId={user.id} isPrivate={user.visibility === "PRIVATE"} />
          </div>
        </div>

        <hr className="my-6 border-border" />

        <dl>
          <Detail label="Email" value={user.email} />
          <Detail label="Joined" value={formattedDate(user.joinedAt)} />
        </dl>
      </div>

      <Link
        to="/"
        className="mt-6 inline-block text-sm text-text-dim hover:text-accent"
      >
        ← Back to home
      </Link>
    </main>
  );
}
