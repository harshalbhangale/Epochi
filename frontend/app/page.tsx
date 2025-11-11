export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-purple-50 to-indigo-50">
      <div className="z-10 max-w-5xl w-full items-center justify-center">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            ⏰ Epochi
          </h1>
          <p className="text-2xl text-gray-700 mb-2">
            Calendar-Powered DeFi Automation
          </p>
          <p className="text-lg text-gray-600">
            Schedule cryptocurrency swaps directly from your Google Calendar
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <FeatureCard
            icon="🔐"
            title="No Wallet Needed"
            description="Deterministic wallets generated automatically. No MetaMask required!"
          />
          <FeatureCard
            icon="📅"
            title="Calendar Interface"
            description="Schedule swaps like calendar events. Simple and intuitive."
          />
          <FeatureCard
            icon="⚡"
            title="Somnia Network"
            description="Ultra-fast, low-cost transactions with Data Streams proof."
          />
        </div>

        {/* Getting Started */}
        <div className="bg-white rounded-lg shadow-xl p-8 border border-gray-200">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">🚀 Getting Started</h2>
          <div className="space-y-4">
            <Step number="1" text="Connect your Google Calendar" />
            <Step number="2" text="Fund your wallet with testnet tokens" />
            <Step number="3" text="Create event: 'Swap 0.1 ETH to USDC'" />
            <Step number="4" text="Watch it execute automatically!" />
          </div>
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-gray-600 mb-4">
              Backend API running on port 3001
            </p>
            <div className="flex gap-4 justify-center">
              <a
                href="http://localhost:3001/health"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md"
              >
                Check API Health
              </a>
              <a
                href="http://localhost:3001/api/status"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all shadow-md"
              >
                API Status
              </a>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            ✅ Chunk 1 Complete • ⏳ Building Chunk 2 Next
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Powered by Somnia Network • Built with Next.js & Viem
          </p>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-xl font-semibold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}

function Step({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex items-center justify-center font-bold">
        {number}
      </div>
      <p className="text-gray-700">{text}</p>
    </div>
  );
}
