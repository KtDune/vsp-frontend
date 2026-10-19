export default function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-4 py-2 text-lg font-semibold transition ${
        active
          ? "border-accent text-accent"
          : "border-transparent text-text-dim hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}
