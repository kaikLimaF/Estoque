function ConfigScreen({ onConnect, dataMode, setDataMode, webAppUrl, setWebAppUrl, sheetName, setSheetName, showToast, onProxyConnect }) {
  const { useState } = React;
  
  const [connectionStatus, setConnectionStatus] = useState(null);

  const testConnection = async () => {
    // ... (same as before)
  };

  const handleConnect = () => {
    onConnect(webAppUrl, sheetName);
  };
  
  const handleDataMode = (mode) => {
    setDataMode(mode);
  };
  
  const handleFileImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    showToast(`Arquivo ${file.name} selecionado.`, 'info');
    console.log(file);
  };

  const copyScript = () => {
    const code = document.getElementById('scriptCode').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast('Código copiado!', 'success');
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-3xl">
      <div className="bg-white rounded-xl shadow-lg p-5 mb-6">
        {/* ... (Tabs and panels as before) ... */}
         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-800">Configuração</h3>
            <p className="text-gray-600 text-sm">Escolha a fonte dos seus dados.</p>
          </div>
        </div>
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => handleDataMode('sheets')} className={`pb-4 px-1 border-b-2 text-sm flex items-center gap-2 transition-colors ${dataMode === 'sheets' ? 'border-indigo-600 font-bold text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 font-medium'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5M5.5 19H7M17 5v14M17 19h2a2 2 0 012 2h-2m-2-2H5.5a2 2 0 01-2-2V5.5a2 2 0 012-2h11.5"></path></svg>
              Google Sheets
            </button>
            <button onClick={() => handleDataMode('excel')} className={`pb-4 px-1 border-b-2 text-sm flex items-center gap-2 transition-colors ${dataMode === 'excel' ? 'border-amber-600 font-bold text-amber-600' : 'border-transparent text-gray-500 hover:text-gray-700 font-medium'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3"></path></svg>
              Excel / CSV (Offline)
            </button>
            <button onClick={onProxyConnect} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3"></path></svg>
                Carregar Produtos do Banco de Dados
            </button>
          </nav>
        </div>
         {dataMode === 'sheets' && (
          <div className="fade-in">
            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl mb-4">
              <p className="text-indigo-900 text-sm"><strong>Google Sheets</strong>: Sincronização online em tempo real. As alterações são salvas diretamente na planilha.</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">URL do Web App</label>
                <input value={webAppUrl} onChange={(e) => setWebAppUrl(e.target.value)} type="text" placeholder="https://script.google.com/macros/s/..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
                <p className="text-xs text-gray-500 mt-2">Dica: obtenha a URL ao publicar o Apps Script como Web App.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nome da aba (opcional)</label>
                <input value={sheetName} onChange={(e) => setSheetName(e.target.value)} type="text" placeholder="Estoque" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm" />
                <p className="text-xs text-gray-500 mt-2">Dica: se não informar, usará a primeira aba da planilha.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={testConnection} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Testar Conexão
                </button>
                <button onClick={handleConnect} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Conectar
                </button>
              </div>
              {connectionStatus && (
                <div className={`p-4 rounded-lg ${connectionStatus.type === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <p className={`${connectionStatus.type === 'success' ? 'text-green-800' : 'text-red-800'}`}>{connectionStatus.message}</p>
                </div>
              )}
              <div className="mt-6 p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <h4 className="font-bold text-indigo-800 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  Problemas de Conexão?
                </h4>
                <ul className="text-sm text-indigo-700 space-y-2">
                  <li>• <strong>Erro "Failed to fetch":</strong> Verifique se o Web App foi publicado para "Qualquer pessoa"</li>
                  <li>• <strong>Resposta inválida:</strong> Crie uma NOVA implantação após salvar o script</li>
                  <li>• <strong>Permissões:</strong> Autorize todas as permissões solicitadas no Apps Script</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {dataMode === 'excel' && (
          <div className="fade-in">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
              <p className="text-amber-900 text-sm">
                <strong>Modo Offline:</strong> Importe um arquivo Excel (.xlsx) ou CSV, faça a contagem no navegador e exporte o resultado.
              </p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Importar arquivo</label>
                <input onChange={handleFileImport} type="file" accept=".xlsx,.xls,.csv,text/csv" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-white" />
                <p className="text-xs text-gray-500 mt-2">Formatos suportados: .xlsx, .xls, .csv</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button onClick={() => showToast('Importar ainda não implementado.', 'warning')} className="flex-1 bg-amber-600 hover:bg-amber-700 text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  Importar Arquivo
                </button>
                <button onClick={() => showToast('Exportar ainda não implementado.', 'warning')} className="flex-1 bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                  Exportar Excel (.xlsx)
                </button>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 mt-4">
                <h4 className="font-bold text-gray-700 mb-2 text-sm">Como usar o modo offline:</h4>
                <ol className="text-sm text-gray-600 list-decimal ml-4 space-y-1">
                  <li>Importe sua planilha (Excel ou CSV)</li>
                  <li>Faça a contagem no app (os dados ficam no navegador)</li>
                  <li>Clique em <strong>Exportar CSV Atualizado</strong></li>
                  <li>Abra o CSV gerado no Excel para ver os saldos atualizados</li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="bg-gradient-to-r from-amber-600 to-orange-700 text-white rounded-2xl shadow-xl p-8 mb-6">
        {/* ... Banner ... */}
         <div className="flex items-center gap-4 mb-4">
          <div className="bg-white/20 rounded-full p-3">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.5M5.5 19H7M17 5v14M17 19h2a2 2 0 012 2h-2m-2-2H5.5a2 2 0 01-2-2V5.5a2 2 0 012-2h11.5"></path></svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold">Contagem de Estoque</h1>
            <p className="text-amber-100">Importe seu CSV do Excel e comece a contagem</p>
          </div>
        </div>
      </div>
      <div id="sheetsInstructions">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">1</span>
                Crie a Planilha no Google Sheets
            </h3>
            {/* ... Table and tips ... */}
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">2</span>
                Adicione o Script no Google Sheets
            </h3>
            <div className="space-y-4">
                <p className="text-gray-600">No Excel Online, vá em <strong>Dados → Office Scripts → Novo Script</strong> e cole este código:</p>
                <div className="relative">
                    <pre id="scriptCode" className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto max-h-80 overflow-y-auto">
                        <code>{`
/**
 * Contagem Rápida de Estoque - Office Script para Excel Online
 ... (script content) ...
 */
function main(workbook, parameters) {
  // ...
}
                        `}</code>
                    </pre>
                    <button onClick={copyScript} className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                        Copiar
                    </button>
                </div>
            </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <span className="bg-blue-100 text-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">3</span>
                Publique como Web App
            </h3>
            {/* ... Publication steps ... */}
        </div>
      </div>
    </div>
  );
}