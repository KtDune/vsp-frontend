import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { searchUsers, type ProfileUser } from "../lib/api";
import { defaultAvatar } from "../data/user";
import SubscribeButton from "../components/SubscribeButton";

const formatDate = (iso: string | null) =>
  iso &&
  new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

export default function UserSearchPage() {
  const [searchParams] = useSearchParams();
  const name = searchParams.get("name")?.trim() ?? "";

  const [result, setResult] = useState<{ user: ProfileUser | null; miss: boolean } | null>(null);

  useEffect(() => {
    if (!name) return;

    let cancelled = false;

    searchUsers(name)
      .then((users) => {
        if (cancelled) return;
        const found = Array.isArray(users) ? users : [];
        setResult({ user: found[0] ?? null, miss: found.length === 0 });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ user: null, miss: true });
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  const user = result?.user ?? null;
  const isPrivate = user?.visibility === "PRIVATE";

  let body: React.ReactNode;
  if (!name) {
    body = <p className="mt-10 text-center text-sm text-text-dim">Type a name to search.</p>;
  } else if (result?.miss) {
    body = <p className="mt-10 text-center text-sm text-text-dim">User not found.</p>;
  } else if (!user) {
    body = null;
  } else {
    body = (
      <div className="mt-4 rounded-2xl border border-border bg-surface p-6 sm:p-8">
        <div className="flex items-center gap-5">
          <img
            src={user.profileUrl ?? defaultAvatar}
            alt="Avatar"
            className="h-20 w-20 rounded-full ring-2 ring-accent"
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold">{user.username}</h1>
            <span
              className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isPrivate ? "bg-text-dim/15 text-text-dim" : "bg-accent/15 text-accent"
              }`}
            >
              {isPrivate ? "Private account" : "Public account"}
            </span>
          </div>
          <div className="ml-auto shrink-0">
            <SubscribeButton channelId={user.id} isPrivate={isPrivate} />
          </div>
        </div>

        <hr className="my-6 border-border" />

        <dl>
          <div className="flex flex-col gap-0.5 py-3">
            <dt className="text-xs font-medium tracking-wide text-text-dim uppercase">Joined</dt>
            <dd className="text-sm text-text">{formatDate(user.createdAt) ?? "—"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pt-24 pb-10">
      <h2 className="text-sm text-text-dim">
        Search results{user ? ` for "${user.username}"` : ""}
      </h2>
      {body}
    </main>
  );
}
