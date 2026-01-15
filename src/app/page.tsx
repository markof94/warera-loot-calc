import Simulator from "./simulator";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-700 font-sans">
      <main className="flex min-h-screen w-full max-w-6xl flex-col items-center justify-between py-16 px-16 sm:items-start text-white">
        <Simulator />
      </main>
    </div>
  );
}
