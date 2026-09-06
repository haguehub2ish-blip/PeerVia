export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 py-8 px-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} PeerVia. All rights reserved.
        </p>

        <div className="flex items-center gap-4">
          <a
            href="https://www.linkedin.com/company/peervia/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="PeerVia on LinkedIn"
            className="text-[#0A66C2] hover:opacity-75 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.114 20.452H3.558V9h3.556v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
          <a
            href="https://www.instagram.com/peervia/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="PeerVia on Instagram"
            className="hover:opacity-75 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <defs>
                <radialGradient id="ig-gradient" cx="30%" cy="107%" r="150%">
                  <stop offset="0%" stopColor="#fdf497" />
                  <stop offset="5%" stopColor="#fdf497" />
                  <stop offset="45%" stopColor="#fd5949" />
                  <stop offset="60%" stopColor="#d6249f" />
                  <stop offset="90%" stopColor="#285AEB" />
                </radialGradient>
              </defs>
              <path
                fill="url(#ig-gradient)"
                d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.058-1.69-.073-4.949-.073zm0 5.838a6.163 6.163 0 1 0 0 12.326 6.163 6.163 0 0 0 0-12.326zm0 10.162a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
              />
            </svg>
          </a>
          <a     
          
            href="mailto:info.peervia@gmail.com"
            aria-label="Email PeerVia"
            className="hover:opacity-75 transition"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <rect x="2" y="4" width="20" height="16" rx="2" fill="#EA4335" />
              <path d="M2 6.5v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2v-11l-10 7-10-7z" fill="#FFFFFF" stroke="#EA4335" strokeWidth="0.5" />
            </svg>
          </a>
        </div>
      </div>
    </footer>
  );
}