import Navbar from "@/Components/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-cream flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-6xl mb-4">🧭</p>
          <h1 className="font-display text-3xl text-ink mb-2">
            Page Not Found :(
          </h1>
          <p className="text-muted mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist, or may have moved.
          </p>
          <a
            href="/"
            className="inline-block bg-primary text-white px-6 py-2.5 rounded-lg font-medium hover:bg-primary-dark transition"
          >
            Back To Home
          </a>
        </div>
      </div>
    </div>
  );
}