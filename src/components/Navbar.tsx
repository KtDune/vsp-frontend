import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const defaultAvatar = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='12' fill='%23272727'/%3E%3Ccircle cx='12' cy='9.5' r='4' fill='%23aaaaaa'/%3E%3Cpath d='M4 20a8 8 0 0 1 16 0z' fill='%23aaaaaa'/%3E%3C/svg%3E";

export default function Navbar({ user }: { user: { name: string; avatar?: string } }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const search = () => {
    const name = query.trim();
    if (name) navigate(`/search?name=${encodeURIComponent(name)}`);
  };

  return (
    <header className="fixed inset-x-0 top-0 z-10 flex h-14 items-center gap-3 border-b border-border bg-bg px-4">
      <div className="flex items-center gap-4">
        <button aria-label="Menu" className="cursor-pointer rounded-full p-2 hover:bg-surface-hover">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 6h18v2H3zm0 5h18v2H3zm0 5h18v2H3z" />
          </svg>
        </button>
        <a href="/" className="flex items-center gap-2 font-bold tracking-wide">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-accent text-sm font-black text-white">
            V
          </span>
          <span className="text-lg">
            VSP<span className="text-accent">.</span>
          </span>
        </a>
      </div>

      <form
        className="mx-auto hidden w-full max-w-xl items-center sm:flex"
        onSubmit={(e) => {
          e.preventDefault();
          search();
        }}
      >
        <input
          type="search"
          placeholder="Search videos"
          aria-label="Search videos"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-10 w-full rounded-l-full border border-border bg-surface px-4 text-sm text-text outline-none placeholder:text-text-dim focus:border-accent"
        />
        <button
          aria-label="Search"
          className="flex h-10 cursor-pointer items-center justify-center rounded-r-full border border-l-0 border-border bg-surface-hover px-4 text-text hover:bg-border"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
        </button>
      </form>

      <button
        aria-label="Search"
        onClick={search}
        className="cursor-pointer rounded-full p-2 hover:bg-surface-hover sm:hidden"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>

      <Link
        to="/me"
        aria-label="Your profile"
        className="cursor-pointer rounded-full"
      >
        <img
          src={user.avatar ?? defaultAvatar}
          alt="Profile"
          className="h-8 w-8 rounded-full"
        />
      </Link>
    </header>
  );
}
