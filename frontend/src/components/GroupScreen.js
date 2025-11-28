function GroupScreen({ groups, products, onDisconnect, onSync, onExport, onGroupSelect, dataMode }) {
  const { useState, useMemo } = React;

  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return groups;
    return groups.filter(g => g.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [groups, searchTerm]);

  const stats = useMemo(() => {
    const totalGroups = groups.length;
    const totalProducts = products.length;
    const totalItems = products.reduce((sum, p) => sum + (p.quantity || 0), 0);
    const lastCount = localStorage.getItem('lastCountTime') 
      ? new Date(parseInt(localStorage.getItem('lastCountTime'))).toLocaleString('pt-BR')
      : '-';
    return { totalGroups, totalProducts, totalItems, lastCount };
  }, [groups, products]);

  const formatQuantity = (n) => new Intl.NumberFormat('pt-BR').format(n);

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-full p-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"></path></svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Contagem de Estoque</h1>
              <p className="text-blue-100 text-sm">Selecione um grupo para contar</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {dataMode === 'sheets' ? (
              <button onClick={onSync} className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
                Sincronizar
              </button>
            ) : (
              <button onClick={onExport} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Exportar Excel
              </button>
            )}
            <button onClick={onDisconnect} className="bg-red-500/80 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-semibold transition">
              Desconectar
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-green-500 rounded-full pulse-dot"></div>
          <span className="text-gray-700 font-medium">Conectado a {dataMode === 'sheets' ? 'Google Sheets' : 'Arquivo Local'}</span>
        </div>
        <span className="text-gray-500 text-sm">Sincronizado: {new Date().toLocaleTimeString('pt-BR')}</span>
      </div>

      <div className="mb-6">
        <div className="relative">
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="🔍 Pesquisar grupos..." className="w-full px-6 py-4 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pl-12" />
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center"><svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg></div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-blue-500"><p className="text-gray-500 text-sm mb-1">Grupos</p><p className="text-3xl font-bold text-blue-600">{stats.totalGroups}</p></div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-green-500"><p className="text-gray-500 text-sm mb-1">Produtos</p><p className="text-3xl font-bold text-green-600">{stats.totalProducts}</p></div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-purple-500"><p className="text-gray-500 text-sm mb-1">Itens em Estoque</p><p className="text-3xl font-bold text-purple-600">{formatQuantity(stats.totalItems)}</p></div>
        <div className="bg-white rounded-xl shadow p-4 border-l-4 border-orange-500"><p className="text-gray-500 text-sm mb-1">Última Contagem</p><p className="text-lg font-bold text-orange-600">{stats.lastCount}</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGroups.length > 0 ? filteredGroups.map(group => {
          const groupProducts = products.filter(p => p.groupId === group.id);
          const totalItems = groupProducts.reduce((sum, p) => sum + p.quantity, 0);
          return (
            <div key={group.id} onClick={() => onGroupSelect(group.id)} className="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-2 border-transparent hover:border-blue-300">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">{group.name}</h3>
                <div className="bg-blue-100 rounded-lg p-2"><svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-gray-800">{groupProducts.length}</p><p className="text-xs text-gray-500">Produtos</p></div>
                <div className="bg-blue-50 rounded-lg p-3 text-center"><p className="text-2xl font-bold text-blue-600">{formatQuantity(totalItems)}</p><p className="text-xs text-gray-500">Itens</p></div>
              </div>
              <div className="flex items-center justify-center text-blue-600 font-semibold text-sm pt-3 border-t"><span>Iniciar Contagem</span><svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg></div>
            </div>
          )
        }) : (
            <div className="col-span-full bg-white rounded-xl shadow p-12 text-center">
                <h3 className="text-xl font-bold text-gray-500 mb-2">Nenhum grupo encontrado</h3>
                <p className="text-gray-400">Tente usar outro termo de pesquisa ou verifique a fonte de dados.</p>
            </div>
        )}
      </div>
    </div>
  );
}
