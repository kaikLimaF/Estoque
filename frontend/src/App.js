function App() {
  const { useState, useEffect, useCallback } = React;

  // Screen management
  const [screen, setScreen] = useState('config'); // 'config', 'group', 'counting'

  // UI state
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(null);
  const [modal, setModal] = useState(null);

  // Data state
  const [dataMode, setDataMode] = useState(localStorage.getItem('dataMode') || 'sheets');
  const [webAppUrl, setWebAppUrl] = useState(localStorage.getItem('sheetsWebAppUrl') || '');
  const [sheetName, setSheetName] = useState(localStorage.getItem('sheetsSheetName') || '');
  const [groups, setGroups] = useState([]);
  const [products, setProducts] = useState([]);
  const [currentGroup, setCurrentGroup] = useState(null);

  // ==================== Effects ====================

  useEffect(() => {
    localStorage.setItem('dataMode', dataMode);
  }, [dataMode]);

  useEffect(() => {
    localStorage.setItem('sheetsWebAppUrl', webAppUrl);
  }, [webAppUrl]);

  useEffect(() => {
    localStorage.setItem('sheetsSheetName', sheetName);
  }, [sheetName]);

  // ==================== UI Functions ====================

  const showToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showLoading = (text, subtext) => setLoading({ text, subtext });
  const hideLoading = () => setLoading(null);

  // ==================== Data Processing ====================
  
  const processFetchedData = (data) => {
    const groupMap = new Map();
    const groupList = [];
    let gid = 1;
    const normalize = (str) => str ? str.toLowerCase().replace(/\s+/g, '') : '';

    const prodList = data.map((item, index) => {
        let code, groupName, desc, saldo;
        for (const key in item) {
            const normKey = normalize(key);
            if (normKey === 'codigo') code = item[key];
            if (normKey === 'grupo') groupName = item[key];
            if (normKey === 'descricao') desc = item[key];
            if (normKey === 'saldofisico') saldo = item[key];
        }
        code = code || `item-${index}`;
        groupName = groupName || 'Sem Grupo';
        if (!groupMap.has(groupName)) {
            groupMap.set(groupName, gid++);
            groupList.push({ id: groupMap.get(groupName), name: groupName });
        }
        return {
            id: String(code), code: String(code), groupId: groupMap.get(groupName),
            groupName: groupName, name: desc || String(code),
            quantity: parseFloat(String(saldo || '0').replace(',', '.')) || 0,
        };
    });
    groupList.sort((a,b) => a.name.localeCompare(b.name));
    setGroups(groupList);
    setProducts(prodList);
    setScreen('group');
  };

  // ==================== Data Functions ====================

  const handleProxyConnect = async () => {
    const PROXY_URL = 'http://localhost:3000/Estoque';
    showLoading('Carregando do Banco de Dados...', PROXY_URL);
    try {
        const response = await fetch(PROXY_URL);
        if (!response.ok) throw new Error(`Erro HTTP! Status: ${response.status}`);
        const data = await response.json();
        if (data.erro) throw new Error(data.erro);
        processFetchedData(data);
        showToast(`Sucesso! ${data.length} produtos carregados.`, 'success');
    } catch (error) {
        showToast(`Erro na conexão: ${error.message}`, 'error');
    }
    hideLoading();
  };

  const handleSheetsConnect = async (url, sn) => {
    if(url) setWebAppUrl(url);
    if (sn) setSheetName(sn);
    showLoading('Carregando dados do Google Sheets...', sn ? `Aba: ${sn}` : '');
    try {
      const data = await apiCall(url || webAppUrl, sn || sheetName, 'getAll');
      processFetchedData(data.products || []);
      showToast('Conectado com sucesso!', 'success');
    } catch (error) {
      showToast(`Erro: ${error.message}`, 'error');
    }
    hideLoading();
  };
  
  const handleSave = async (changes) => {
    const updates = Object.entries(changes).map(([code, quantity]) => ({ code, quantity }));
    if(updates.length === 0) {
      showToast('Nenhuma alteração para salvar', 'warning');
      return;
    }
    showLoading('Salvando alterações...', `${updates.length} item(ns)`);
    try {
      if (dataMode === 'sheets') {
        await apiCall(webAppUrl, sheetName, 'updateBatch', { updates: JSON.stringify(updates) });
      }
      const updatedProducts = products.map(p => {
        if (changes[p.code] !== undefined) {
          return { ...p, quantity: changes[p.code] };
        }
        return p;
      });
      setProducts(updatedProducts);
      localStorage.setItem('lastCountTime', Date.now().toString());
      showToast('Alterações salvas com sucesso!', 'success');
      handleBackToGroups();
    } catch (error) {
      showToast(`Erro ao salvar: ${error.message}`, 'error');
    }
    hideLoading();
  };

  const handleDisconnect = () => {
    setWebAppUrl('');
    setSheetName('');
    setGroups([]);
    setProducts([]);
    setScreen('config');
    showToast('Desconectado.', 'info');
  };
  
  const handleGroupSelect = (groupId) => {
    const group = groups.find(g => g.id === groupId);
    setCurrentGroup(group);
    setScreen('counting');
  };

  const handleBackToGroups = () => {
    setCurrentGroup(null);
    setScreen('group');
  };
  
  // ==================== Render ====================

  return (
    <React.Fragment>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      {loading && <Loading text={loading.text} subtext={loading.subtext} />}
      
      {screen === 'config' && (
        <ConfigScreen 
          onConnect={handleSheetsConnect}
          onProxyConnect={handleProxyConnect}
          dataMode={dataMode}
          setDataMode={setDataMode}
          webAppUrl={webAppUrl}
          setWebAppUrl={setWebAppUrl}
          sheetName={sheetName}
          setSheetName={setSheetName}
          showToast={showToast}
        />
      )}
      {screen === 'group' && (
        <GroupScreen 
          groups={groups}
          products={products}
          onDisconnect={handleDisconnect}
          onSync={() => handleSheetsConnect()}
          onExport={() => showToast('Exportar ainda não implementado.', 'warning')}
          onGroupSelect={handleGroupSelect}
          dataMode={dataMode}
        />
      )}
      {screen === 'counting' && (
        <CountingScreen
          group={currentGroup}
          products={products.filter(p => p.groupId === currentGroup.id)}
          onBack={handleBackToGroups}
          onSave={handleSave}
          showToast={showToast}
        />
      )}
    </React.Fragment>
  );
}
