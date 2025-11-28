function Loading({ text, subtext }) {
  return (
    <div id="loadingOverlay" className="fixed inset-0 bg-black/50 flex items-center justify-center z-40 p-4">
      <div className="bg-white rounded-xl p-6 sm:p-8 flex flex-col items-center shadow-2xl w-full max-w-sm">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
            </svg>
          </div>
        </div>
        <p className="text-gray-700 font-semibold mt-4">{text || 'Sincronizando...'}</p>
        <p className="text-gray-500 text-sm mt-1">{subtext || 'Aguarde um momento'}</p>
      </div>
    </div>
  );
}
