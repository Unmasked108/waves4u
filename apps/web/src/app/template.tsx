/** A template re-mounts on every navigation, so each page fades up gently (no extra library). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page">{children}</div>;
}
