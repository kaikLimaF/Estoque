function CountingScreen({ group, products, onBack, onSave, showToast }) {
  const { useState, useMemo, useCallback } = React;

  const [searchTerm, setSearchTerm] = useState('');
  const [changes, setChanges] = useState({});

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const term = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(term) ||
      p.code.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const formatQuantity = useCallback((n) => {
    const num = parseFloat(String(n || '0').replace(',', '.'));
    if (isNaN(num)) return '0';
    // Format with comma, preserving decimals
    return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 3,
    }).format(num);
  }, []);

  const handleQuantityChange = (code, value) => {
    const product = products.find(p => p.code === code);
    if (!product) return;
    
    const numValue = parseFloat(String(value).replace(/\./g, '').replace(',', '.') || 0);

    if (Math.abs(numValue - product.quantity) > 0.0001) {
      setChanges(prev => ({ ...prev, [code]: numValue }));
    } else {
      const newChanges = { ...changes };
      delete newChanges[code];
      setChanges(newChanges);
    }
  };

  const adjustQty = (code, delta) => {
    const product = products.find(p => p.code === code);
    if(!product) return;
    const currentQty = changes[code] !== undefined ? changes[code] : product.quantity;
    const newValue = (currentQty || 0) + delta;
    handleQuantityChange(code, newValue);
    
    // Also update the input field directly for responsiveness
    const input = document.getElementById(`input-${code}`);
    if (input) input.value = formatQuantity(newValue);
  };
  
  const changedCount = Object.keys(changes).length;

  return (
    <div id="countingScreen" className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 max-w-7xl">
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div>
              <h2 className="text-2xl font-bold" id="currentGroupName">{group?.name}</h2>
              <p className="text-green-100 text-sm">Atualize as quantidades da contagem física</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-green-100 text-sm">Produtos alterados</p>
            <p className="text-3xl font-bold" id="changedCount">{changedCount}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="flex-1">
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="🔍 Buscar produto..." className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500" />
        </div>
        <button onClick={() => showToast('Zerar estoque ainda não implementado.', 'warning')} className="bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-semibold transition flex items-center gap-2 whitespace-nowrap">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          Zerar Estoque
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 pb-32 sm:pb-28" id="productsGrid">
        {filteredProducts.map(product => {
          const hasChanged = changes[product.code] !== undefined;
          const currentQty = hasChanged ? changes[product.code] : product.quantity;
          return (
            <div key={product.id} className={`bg-white rounded-xl shadow-lg overflow-hidden ${hasChanged ? 'ring-2 ring-green-500' : ''}`}>
              <div className={`p-4 ${hasChanged ? 'bg-green-50' : 'bg-gray-50'} border-b`}>
                <h4 className="font-bold text-gray-800 truncate" title={product.name}>{product.name}</h4>
                <p className="text-xs text-gray-500">Código: {product.code}</p>
                {hasChanged && <span className="text-xs text-green-600 font-semibold">● Modificado</span>}
              </div>
              <div className="p-4">
                <div className="flex justify-between items-center mb-4 text-sm">
                  <span className="text-gray-500">Qtd. original:</span>
                  <span className={`font-bold text-lg ${product.quantity < 0 ? 'text-red-600' : 'text-blue-600'}`}>{formatQuantity(product.quantity)}</span>
                </div>
                <div className="mb-4">
                  <label htmlFor={`input-${product.code}`} className="block text-sm font-medium text-gray-600 mb-2">Nova quantidade:</label>
                  <input 
                    id={`input-${product.code}`}
                    type="text" 
                    inputMode="decimal"
                    defaultValue={formatQuantity(currentQty)}
                    onChange={e => handleQuantityChange(product.code, e.target.value)}
                    className={`w-full px-4 py-3 text-2xl font-bold border-2 rounded-lg text-center ${hasChanged ? 'border-green-400 bg-green-50' : 'border-gray-200'}`}
                  />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  <button onClick={() => adjustQty(product.code, -10)} className="bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-bold transition">-10</button>
                  <button onClick={() => adjustQty(product.code, -1)} className="bg-red-200 hover:bg-red-300 text-red-800 py-2 rounded-lg font-bold transition">-1</button>
                  <button onClick={() => adjustQty(product.code, 1)} className="bg-green-200 hover:bg-green-300 text-green-800 py-2 rounded-lg font-bold transition">+1</button>
                  <button onClick={() => adjustQty(product.code, 10)} className="bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded-lg font-bold transition">+10</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t shadow-lg p-3 sm:p-4 bottom-safe">
        <div className="container mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="text-sm text-gray-600">
            <span id="pendingChanges">{changedCount}</span> alterações pendentes
          </div>
          <button onClick={() => onSave(changes)} disabled={changedCount === 0} id="saveBtn" className={`bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-8 py-3 rounded-xl font-bold text-lg flex items-center gap-2 transition ${changedCount === 0 ? 'cursor-not-allowed' : ''}`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
