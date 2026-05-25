import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-linear-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="flex max-w-md flex-col items-center gap-6 text-center">
        <Image
          src="/favicon.png"
          alt="LCON — Leafclutch Online Network"
          width={80}
          height={80}
          priority
          className="rounded-2xl shadow-md"
        />

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">
            LCON
          </h1>
          <p className="text-base font-medium text-indigo-600">
            Leafclutch Online Network
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Secure staff portal for Leafclutch team members
          </p>
        </div>

        <Link
          href="/login"
          className="mt-2 inline-flex items-center rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        >
          Sign In
        </Link>
      </div>
    </main>
  );
}
