export default function Home() {
  // Auto-redirect to /organizer
  if (typeof window !== "undefined") {
    window.location.href = "/organizer";
  }
  return null;
}