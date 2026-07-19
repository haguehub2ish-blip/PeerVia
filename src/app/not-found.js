import Navbar from "@/Components/Navbar";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFF9F2] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6 text-center">
        <div>
          <p className="text-6xl mb-4">🧭</p>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Page Not Found :(
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            The page you're looking for doesn't exist, or may have moved.
          </p>
          <a
            href="/"
            className="inline-block bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-green-800 transition"
          >
            Back To Home
          </a>
        </div>
      </div>
    </div>
  );
}