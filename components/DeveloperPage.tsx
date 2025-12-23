export default function DeveloperPage() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold text-white">Developer Tools</h1>
      <p className="text-slate-400 mt-2">
        This page is reserved for backend-connected tools (API tester, logs, diagnostics).
      </p>

      <div className="mt-4 p-4 rounded-lg border bg-white">
        <div className="font-semibold">Status</div>
        <div className="text-sm text-slate-600 mt-1">
          ✅ Google/Gemini/Chat removed. Next step: connect frontend to backend API.
        </div>
      </div>
    </div>
  );
}
