  // ==================== DATA STORAGE ====================
        let groups = [];
        let products = [];
        let currentGroup = null;
        let tempChanges = {}; // { code: newQuantity }
        let modalCallback = null;
        let webAppUrl = localStorage.getItem('sheetsWebAppUrl') || '';
        let sheetName = localStorage.getItem('sheetsSheetName') || '';
        let officeFlowUrl = localStorage.getItem('officeFlowUrl') || '';
        let dataMode = localStorage.getItem('dataMode') || 'office'; // 'office' | 'sheets' | 'excel'

        // Excel import/export state
        let excelHeaders = [];
        let excelRows = []; // raw rows including all columns (excluding header)
        let excelHeaderMap = {};

        // Debounce timers for performance optimization
        let groupSearchTimer = null;
        let productSearchTimer = null;

        // ==================== INITIALIZATION ====================
        document.addEventListener('DOMContentLoaded', function() {
            // Default to sheets if not set or invalid
            if (dataMode !== 'excel' && dataMode !== 'sheets') {
                dataMode = 'sheets';
            }
            
            // Apply persisted mode on load
            setDataMode(dataMode, { silent: true });

            const urlInput = document.getElementById('webAppUrl');
            if (urlInput) urlInput.value = webAppUrl;
            const sheetInput = document.getElementById('sheetName');
            if (sheetInput) sheetInput.value = sheetName;

            // Auto-connect based on mode
            if (dataMode === 'sheets' && webAppUrl) {
                document.getElementById('configScreen').classList.add('hidden');
                document.getElementById('groupScreen').classList.remove('hidden');
                syncFromSheet();
            } else {
                // Default state: Config screen
                document.getElementById('configScreen').classList.remove('hidden');
                document.getElementById('groupScreen').classList.add('hidden');
                document.getElementById('countingScreen').classList.add('hidden');
            }
        });

        // ==================== UTILITY FUNCTIONS ====================
        function parseQuantity(raw) {
            if (raw === null || raw === undefined) return 0;
            if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
            const s = String(raw).trim().replace(',', '.');
            const n = parseFloat(s);
            return Number.isFinite(n) ? n : 0;
        }

        function formatQuantity(n) {
            const num = parseQuantity(n);
            if (Math.abs(num - Math.round(num)) < 0.0001) return String(Math.round(num));
            return num.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
        }

        function clampQuantity(n) {
            // usado apenas para inputs do usuário (PERMITE negativos)
            return parseQuantity(n);
        }

        function signedQuantity(n) {
            // usado para manter valores negativos vindos da planilha (Sheets/Office)
            return parseQuantity(n);
        }

        function escapeHtml(str) {
            return String(str ?? '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }

        function formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return '';
            
            return date.toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }

        // ==================== TOAST NOTIFICATIONS ====================
        function showToast(message, type = 'info') {
            const container = document.getElementById('toastContainer');
            const colors = {
                success: 'bg-green-500',
                error: 'bg-red-500',
                info: 'bg-blue-500',
                warning: 'bg-yellow-500'
            };
            
            const toast = document.createElement('div');
            toast.className = `toast ${colors[type]} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2`;
            toast.innerHTML = `
                <span>${message}</span>
                <button onclick="this.parentElement.remove()" class="ml-2 hover:opacity-80">✕</button>
            `;
            container.appendChild(toast);
            
            setTimeout(() => toast.remove(), 5000);
        }

        // ==================== LOADING FUNCTIONS ====================
        function showLoading(text = 'Sincronizando...', subtext = 'Aguarde um momento') {
            document.getElementById('loadingText').textContent = text;
            document.getElementById('loadingSubtext').textContent = subtext;
            document.getElementById('loadingOverlay').classList.remove('hidden');
        }

        function hideLoading() {
            document.getElementById('loadingOverlay').classList.add('hidden');
        }

        // ==================== MODAL FUNCTIONS ====================
        function showModal(title, content, callback) {
            document.getElementById('editModalTitle').textContent = title;
            document.getElementById('editModalContent').innerHTML = content;
            document.getElementById('editModal').classList.remove('hidden');
            modalCallback = callback;
        }

        function closeModal() {
            document.getElementById('editModal').classList.add('hidden');
            modalCallback = null;
        }

        function saveModal() {
            if (modalCallback) modalCallback();
        }

        // ==================== API FUNCTIONS ====================
        async function apiCall(action, params = {}) {
            // Router: office -> Power Automate HTTP endpoint; sheets -> Google Apps Script
            if (dataMode === 'office') {
                return await officeApiCall(action, params);
            }
            if (!webAppUrl) {
                throw new Error('URL do Web App não configurada');
            }

            const isGet = action === 'getAll';
            const url = new URL(webAppUrl);
            url.searchParams.append('action', action);

            console.log('📤 API Call (Sheets):', action, params);

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                let fetchOptions = {
                    method: isGet ? 'GET' : 'POST',
                    redirect: 'follow',
                    signal: controller.signal
                };

                if (isGet) {
                    for (const [key, value] of Object.entries(params)) {
                        url.searchParams.append(
                            key,
                            typeof value === 'object' ? JSON.stringify(value) : String(value)
                        );
                    }
                } else {
                    const bodyParams = new URLSearchParams();
                    bodyParams.append('action', action);
                    for (const [key, value] of Object.entries(params)) {
                        bodyParams.append(
                            key,
                            typeof value === 'object' ? JSON.stringify(value) : String(value)
                        );
                    }
                    fetchOptions.headers = {
                        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                    };
                    fetchOptions.body = bodyParams.toString();
                }

                console.log('📤 URL:', url.toString());

                const response = await fetch(url.toString(), fetchOptions);
                clearTimeout(timeoutId);

                if (!response.ok) throw new Error('Erro HTTP ' + response.status);

                const text = await response.text();
                console.log('📥 Response text:', text);

                let data;
                try {
                    data = JSON.parse(text);
                } catch {
                    throw new Error('Resposta inválida do servidor');
                }

                if (data.error) throw new Error(data.error);
                return data;

            } catch (error) {
                console.error('❌ API Error:', error);
                if (error.name === 'AbortError') throw new Error('Tempo limite excedido');
                if (error.message.includes('Failed to fetch')) {
                    throw new Error('Falha na conexão. Verifique a URL e as permissões do Web App.');
                }
                throw error;
            }
        }

        async function officeApiCall(action, params = {}) {
            if (!officeFlowUrl) {
                throw new Error('URL do Flow (Office Script) não configurada');
            }

            // Expectation: Power Automate Flow accepts POST JSON and returns JSON:
            // { success: true, groups: [...], products: [...], errors: [...] }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000);

            try {
                const payload = { action, ...params };
                console.log('📤 API Call (Office):', payload);

                const response = await fetch(officeFlowUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const t = await response.text().catch(() => '');
                    throw new Error(`Erro HTTP ${response.status}${t ? ' — ' + t : ''}`);
                }

                const data = await response.json().catch(async () => {
                    const t = await response.text().catch(() => '');
                    throw new Error('Resposta inválida do Flow' + (t ? `: ${t}` : ''));
                });

                if (data && data.error) throw new Error(data.error);
                return data;

            } catch (error) {
                console.error('❌ Office API Error:', error);
                if (error.name === 'AbortError') throw new Error('Tempo limite excedido');
                if (error.message.includes('Failed to fetch')) {
                    throw new Error('Falha na conexão com o Flow. Verifique CORS, URL e permissões do Power Automate.');
                }
                throw error;
            }
        }

        // ==================== DATA MODE (SHEETS / EXCEL) ====================
        function setDataMode(mode, opts = {}) {
            dataMode = (mode === 'excel' || mode === 'sheets') ? mode : 'sheets';
            localStorage.setItem('dataMode', dataMode);

            const sheetsPanel = document.getElementById('sheetsPanel');
            const excelPanel = document.getElementById('excelPanel');
            const tabSheets = document.getElementById('tabSheets');
            const tabExcel = document.getElementById('tabExcel');
            const sheetsInstructions = document.getElementById('sheetsInstructions');

            // Classes for active/inactive states
            const activeClassSheets = ['border-indigo-600', 'font-bold', 'text-indigo-600'];
            const activeClassExcel = ['border-amber-600', 'font-bold', 'text-amber-600'];
            const inactiveClass = ['border-transparent', 'text-gray-500', 'hover:text-gray-700', 'font-medium'];

            if (mode === 'sheets') {
                if (sheetsPanel) sheetsPanel.classList.remove('hidden');
                if (excelPanel) excelPanel.classList.add('hidden');
                if (sheetsInstructions) sheetsInstructions.classList.remove('hidden');
                
                if (tabSheets) {
                    tabSheets.classList.remove(...inactiveClass);
                    tabSheets.classList.add(...activeClassSheets);
                }
                if (tabExcel) {
                    tabExcel.classList.remove(...activeClassExcel);
                    tabExcel.classList.add(...inactiveClass);
                }
            } else {
                if (sheetsPanel) sheetsPanel.classList.add('hidden');
                if (excelPanel) excelPanel.classList.remove('hidden');
                if (sheetsInstructions) sheetsInstructions.classList.add('hidden');
                
                if (tabSheets) {
                    tabSheets.classList.remove(...activeClassSheets);
                    tabSheets.classList.add(...inactiveClass);
                }
                if (tabExcel) {
                    tabExcel.classList.remove(...inactiveClass);
                    tabExcel.classList.add(...activeClassExcel);
                }
            }

            if (!opts.silent) {
                if (dataMode === 'excel') {
                    showToast('Modo Offline: Importe um arquivo para começar.', 'info');
                } else {
                    showToast('Modo Google Sheets: Conecte-se para sincronizar.', 'info');
                }
            }
        }

        function normalizeHeaderKey(v) {
            return String(v || '')
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, ' ');
        }

        function buildHeaderMap(headers) {
            const map = {};
            headers.forEach((h, idx) => {
                const k = normalizeHeaderKey(h);
                if (k) map[k] = idx;
            });
            return map;
        }

        function parseCsv(text) {
            // Minimal CSV parser with support for quotes.
            const rows = [];
            let row = [];
            let field = '';
            let inQuotes = false;

            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const next = text[i + 1];

                if (inQuotes) {
                    if (ch === '"' && next === '"') {
                        field += '"';
                        i++;
                    } else if (ch === '"') {
                        inQuotes = false;
                    } else {
                        field += ch;
                    }
                } else {
                    if (ch === '"') {
                        inQuotes = true;
                    } else if (ch === ',') {
                        row.push(field);
                        field = '';
                    } else if (ch === '\n') {
                        row.push(field);
                        field = '';
                        // trim CR
                        if (row.length === 1 && row[0] === '') { row = []; continue; }
                        rows.push(row.map(v => v.replace(/\r$/, '')));
                        row = [];
                    } else {
                        field += ch;
                    }
                }
            }

            // last field
            row.push(field);
            rows.push(row.map(v => v.replace(/\r$/, '')));

            // remove trailing empty line
            if (rows.length && rows[rows.length - 1].every(v => String(v).trim() === '')) {
                rows.pop();
            }

            return rows;
        }

        function toCsv(rows) {
            const escape = (v) => {
                const s = String(v ?? '');
                if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
                return s;
            };
            return rows.map(r => r.map(escape).join(',')).join('\n');
        }

        function importExcelFile() {
            const input = document.getElementById('excelFile');
            const file = input?.files?.[0];
            if (!file) {
                showToast('Selecione um arquivo para importar.', 'warning');
                return;
            }

            const fileExtension = file.name.toLowerCase().split('.').pop();
            
            if (fileExtension === 'csv') {
                // Import CSV
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const text = String(reader.result || '');
                        const rows = parseCsv(text);
                        if (!rows.length) throw new Error('CSV vazio');

                        excelHeaders = rows[0];
                        excelHeaderMap = buildHeaderMap(excelHeaders);
                        excelRows = rows.slice(1);

                        processExcelData();
                    } catch (e) {
                        console.error(e);
                        showToast(`Erro ao importar CSV: ${e.message}`, 'error');
                    }
                };
                reader.onerror = () => showToast('Falha ao ler o arquivo CSV.', 'error');
                reader.readAsText(file, 'utf-8');
            } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
                // Import Excel
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = new Uint8Array(e.target.result);
                        const workbook = XLSX.read(data, { type: 'array' });
                        
                        // Get the first sheet
                        const firstSheetName = workbook.SheetNames[0];
                        const worksheet = workbook.Sheets[firstSheetName];
                        
                        // Convert to array of arrays
                        const rows = XLSX.utils.sheet_to_json(worksheet, { 
                            header: 1, 
                            defval: '',
                            raw: false,
                            dateNF: false
                        });
                        
                        if (!rows.length) throw new Error('Planilha vazia');
                        
                        excelHeaders = rows[0].map(h => String(h || '').trim());
                        excelHeaderMap = buildHeaderMap(excelHeaders);
                        excelRows = rows.slice(1);

                        processExcelData();
                    } catch (e) {
                        console.error(e);
                        showToast(`Erro ao importar Excel: ${e.message}`, 'error');
                    }
                };
                reader.onerror = () => showToast('Falha ao ler o arquivo Excel.', 'error');
                reader.readAsArrayBuffer(file);
            } else {
                showToast('Formato de arquivo não suportado. Use .xlsx, .xls ou .csv', 'error');
            }
        }

        function processExcelData() {
            const colCodigo = excelHeaderMap['codigo'];
            const colDescricao = excelHeaderMap['descricao'];
            const colGrupo = excelHeaderMap['grupo'];
            const colDesativado = excelHeaderMap['desativado'];
            const colSaldoFisico = excelHeaderMap['saldo fisico'];

            const missing = [];
            if (colCodigo === undefined) missing.push('Codigo');
            if (colDescricao === undefined) missing.push('Descricao');
            if (colGrupo === undefined) missing.push('Grupo');
            if (colSaldoFisico === undefined) missing.push('Saldo Fisico');
            if (missing.length) throw new Error('Colunas não encontradas: ' + missing.join(', '));

            // Build groups/products like the Sheets API would
            const groupMap = new Map();
            const groupList = [];
            let gid = 1;

            const prodList = [];
            for (let i = 0; i < excelRows.length; i++) {
                const r = excelRows[i];
                const codigo = r[colCodigo];
                if (codigo === '' || codigo === null || codigo === undefined) continue;

                const descricao = String(r[colDescricao] || '').trim();
                let grupo = String(r[colGrupo] || '').trim();
                const desativadoVal = (colDesativado !== undefined) ? String(r[colDesativado] || '').trim().toLowerCase() : '';
                const desativado = ['1','true','sim','s','yes','y','x'].includes(desativadoVal);
                if (desativado) continue;
                if (!grupo) grupo = 'Sem Grupo';

                if (!groupMap.has(grupo)) {
                    groupMap.set(grupo, gid++);
                    groupList.push({ id: groupMap.get(grupo), name: grupo });
                }

                const saldo = parseQuantity(r[colSaldoFisico]);
                prodList.push({
                    id: String(codigo),
                    code: String(codigo),
                    groupId: groupMap.get(grupo),
                    groupName: grupo,
                    name: descricao || String(codigo),
                    quantity: saldo,
                    row: i + 2 // Excel line number in "sheet" terms
                });
            }

            groupList.sort((a,b) => a.name.localeCompare(b.name));
            groups = groupList;
            products = prodList;

            updateStatistics();
            renderGroupCards();

            document.getElementById('configScreen').classList.add('hidden');
            document.getElementById('groupScreen').classList.remove('hidden');
            document.getElementById('lastSync').textContent = `Importado: ${new Date().toLocaleTimeString('pt-BR')}`;

            updateHeaderUI();
            showToast(`Importado com sucesso! ${groups.length} grupos, ${products.length} itens.`, 'success');
        }

        function exportUpdatedCsv() {
            if (!excelHeaders.length || !excelRows.length) {
                showToast('Importe um CSV primeiro.', 'warning');
                return;
            }

            const colCodigo = excelHeaderMap['codigo'];
            const colSaldoFisico = excelHeaderMap['saldo fisico'];
            if (colCodigo === undefined || colSaldoFisico === undefined) {
                showToast('CSV inválido: faltam colunas Codigo/Saldo Fisico.', 'error');
                return;
            }

            // Build code->quantity from current app state
            const qtyIndex = new Map(products.map(p => [String(p.code), parseQuantity(p.quantity)]));

            // Rewrite Saldo Fisico preserving other columns
            const outRows = [excelHeaders.slice()];
            for (const r of excelRows) {
                const out = r.slice();
                const code = String(r[colCodigo] ?? '');
                if (qtyIndex.has(code)) {
                    // Use pt-BR formatting with comma for Excel friendliness
                    const q = qtyIndex.get(code);
                    out[colSaldoFisico] = String(q).replace('.', ',');
                }
                outRows.push(out);
            }

            const csv = toCsv(outRows);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `estoque_atualizado_${new Date().toISOString().slice(0,10)}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();

            showToast('CSV exportado! Abra no Excel para atualizar a planilha.', 'success');
        }

        // ==================== CONNECTION FUNCTIONS ====================
        function copyScript() {
            const code = document.querySelector('#scriptCode code').textContent;
            navigator.clipboard.writeText(code).then(() => {
                showToast('Código copiado!', 'success');
            });
        }

        async function testConnection() {
            // OFFICE mode: call flow with action getAll
            if (dataMode === 'office') {
                const url = document.getElementById('officeFlowUrl')?.value?.trim() || '';
                if (!url) {
                    showStatus('Por favor, insira a URL do Flow (gatilho HTTP)', 'error');
                    return;
                }

                showLoading('Testando conexão...', 'Excel Online (Office Script)');
                try {
                    const response = await fetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'getAll' })
                    });
                    const text = await response.text();
                    let data;
                    try {
                        data = JSON.parse(text);
                    } catch {
                        throw new Error('Resposta inválida do Flow: ' + text);
                    }
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    if (data.error) throw new Error(data.error);
                    showStatus(`✅ Conexão OK (Office)! ${data.groups?.length || 0} grupos, ${data.products?.length || 0} itens`, 'success');
                } catch (error) {
                    showStatus(`❌ ${error.message}`, 'error');
                }
                hideLoading();
                return;
            }

            // SHEETS mode
            const url = document.getElementById('webAppUrl').value.trim();
            const sn = document.getElementById('sheetName')?.value?.trim() || '';

            if (!url) {
                showStatus('Por favor, insira a URL do Web App', 'error');
                return;
            }

            if (!url.includes('script.google.com/macros/s/')) {
                showStatus('❌ URL inválida. Use a URL do Web App.', 'error');
                return;
            }

            showLoading('Testando conexão...', sn ? `Aba: ${sn}` : 'Detectando aba');

            try {
                const testUrl = new URL(url);
                testUrl.searchParams.append('action', 'getAll');
                if (sn) testUrl.searchParams.append('sheetName', sn);

                const response = await fetch(testUrl.toString(), {
                    method: 'GET',
                    redirect: 'follow'
                });

                const text = await response.text();
                let data;

                try {
                    data = JSON.parse(text);
                } catch (e) {
                    throw new Error('Resposta inválida. Verifique o script.');
                }

                if (data.error) {
                    showStatus(`❌ ${data.error}`, 'error');
                } else {
                    showStatus(`✅ Conexão OK! Aba: ${data.sheetName || 'auto'} — ${data.groups?.length || 0} grupos, ${data.products?.length || 0} itens`, 'success');
                }
            } catch (error) {
                showStatus(`❌ ${error.message}`, 'error');
            }
            hideLoading();
        }

        function showStatus(message, type) {
            const el = document.getElementById('connectionStatus');
            const isSuccess = type === 'success';
            el.className = `p-4 rounded-lg ${isSuccess ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`;
            el.innerHTML = `<p class="${isSuccess ? 'text-green-800' : 'text-red-800'}" style="white-space: pre-wrap;">${message}</p>`;
        }

        async function saveAndConnect() {
            // OFFICE mode
            if (dataMode === 'office') {
                const url = document.getElementById('officeFlowUrl')?.value?.trim() || '';
                if (!url) {
                    showStatus('Por favor, insira a URL do Flow (gatilho HTTP)', 'error');
                    return;
                }
                localStorage.setItem('officeFlowUrl', url);
                officeFlowUrl = url;

                document.getElementById('configScreen').classList.add('hidden');
                document.getElementById('groupScreen').classList.remove('hidden');

                await syncFromSheet();
                return;
            }

            // SHEETS mode
            const url = document.getElementById('webAppUrl').value.trim();
            const sn = document.getElementById('sheetName')?.value?.trim() || '';

            if (!url) {
                showStatus('Por favor, insira a URL do Web App', 'error');
                return;
            }

            localStorage.setItem('sheetsWebAppUrl', url);
            localStorage.setItem('sheetsSheetName', sn);
            webAppUrl = url;
            sheetName = sn;

            document.getElementById('configScreen').classList.add('hidden');
            document.getElementById('groupScreen').classList.remove('hidden');

            await syncFromSheet();
        }

        function disconnect() {
            if (confirm('Deseja desconectar?')) {
                localStorage.removeItem('sheetsWebAppUrl');
                localStorage.removeItem('sheetsSheetName');
                localStorage.removeItem('officeFlowUrl');

                webAppUrl = '';
                sheetName = '';
                officeFlowUrl = '';

                const webAppInput = document.getElementById('webAppUrl');
                if (webAppInput) webAppInput.value = '';
                const sheetInput = document.getElementById('sheetName');
                if (sheetInput) sheetInput.value = '';
                const officeInput = document.getElementById('officeFlowUrl');
                if (officeInput) officeInput.value = '';

                document.getElementById('groupScreen').classList.add('hidden');
                document.getElementById('countingScreen').classList.add('hidden');
                document.getElementById('configScreen').classList.remove('hidden');
            }
        }

        // ==================== SYNC FUNCTIONS ====================
        async function syncFromSheet() {
            if (dataMode === 'excel') {
                showToast('Modo Excel: use Importar para carregar os dados.', 'info');
                return;
            }

            const modeLabel = (dataMode === 'office') ? 'Excel Online (Office Script)' : 'Google Sheets';
            showLoading('Carregando dados...', `${modeLabel}${sheetName ? ` — Aba: ${sheetName}` : ''}`);

            try {
                const params = {};
                if (sheetName) params.sheetName = sheetName;

                const data = await apiCall('getAll', params);

                groups = (data.groups || []).map(g => ({ id: g.id, name: g.name }));
                products = (data.products || []).map(p => ({
                    ...p,
                    id: String(p.id || p.code),
                    code: String(p.code || p.id),
                    quantity: parseQuantity(p.quantity),
                    updatedAt: p.updatedAt || null
                }));

                // Only Sheets mode can auto-detect sheetName
                if (dataMode === 'sheets' && data.sheetName) {
                    sheetName = String(data.sheetName);
                    localStorage.setItem('sheetsSheetName', sheetName);
                }

                updateStatistics();
                renderGroupCards();

                document.getElementById('lastSync').textContent = `Sincronizado: ${new Date().toLocaleTimeString('pt-BR')}`;

                showToast('Dados sincronizados!', 'success');
            } catch (error) {
                showToast(`Erro: ${error.message}`, 'error');
            }

            hideLoading();
        }

        function updateStatistics() {
            document.getElementById('totalGroups').textContent = groups.length;
            document.getElementById('totalProducts').textContent = products.length;
            // Computar saldos positivos, zerados e negativos (sem clamp)
            const totalSigned = products.reduce((sum, p) => sum + signedQuantity(p.quantity), 0);
            document.getElementById('totalItems').textContent = formatQuantity(totalSigned);
            // Tooltip informativo (não altera visual): mostra quebra entre positivos/negativos
            const totalPos = products.reduce((sum, p) => {
                const q = signedQuantity(p.quantity);
                return sum + (q > 0 ? q : 0);
            }, 0);
            const totalNeg = products.reduce((sum, p) => {
                const q = signedQuantity(p.quantity);
                return sum + (q < 0 ? q : 0);
            }, 0);
            const totalItemsEl = document.getElementById('totalItems');
            if (totalItemsEl) {
                totalItemsEl.title = `Soma (com negativos): ${formatQuantity(totalSigned)}\nPositivos: ${formatQuantity(totalPos)}\nNegativos: ${formatQuantity(totalNeg)}`;
            }
            
            const lastCountTime = localStorage.getItem('lastCountTime');
            if (lastCountTime) {
                const date = new Date(parseInt(lastCountTime));
                document.getElementById('lastCount').textContent = date.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }
            
            // Update header UI for Excel mode
            updateHeaderUI();
        }

        function updateHeaderUI() {
            const btn = document.getElementById('mainSyncBtn');
            const exportBtn = document.getElementById('exportBtn');
            const icon = document.getElementById('syncIcon');
            const text = document.getElementById('syncText');
            
            if (!btn || !exportBtn) return;

            if (dataMode === 'excel') {
                // Excel Mode: Show export button, hide sync button
                btn.classList.add('hidden');
                exportBtn.classList.remove('hidden');
                
                // Update export button text based on data availability
                if (groups.length > 0) {
                    exportBtn.textContent = 'Exportar Excel';
                    exportBtn.disabled = false;
                    exportBtn.className = 'bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2 shadow-lg';
                    exportBtn.title = "Baixar arquivo .xlsx com as contagens atualizadas";
                } else {
                    exportBtn.textContent = 'Importar primeiro';
                    exportBtn.disabled = true;
                    exportBtn.className = 'bg-gray-400 text-white px-4 py-2 rounded-lg font-semibold cursor-not-allowed flex items-center gap-2';
                    exportBtn.title = "Importe um arquivo antes de exportar";
                }
            } else {
                // Sheets Mode: Show sync button, hide export button
                btn.classList.remove('hidden');
                exportBtn.classList.add('hidden');
                
                text.textContent = 'Sincronizar';
                icon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>';
                btn.className = 'bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-semibold transition flex items-center gap-2';
                btn.title = "Recarregar dados do Google Sheets";
            }
        }

        function exportAsXlsx() {
            if (!excelHeaders.length || !excelRows.length) {
                showToast('Nenhum dado para exportar.', 'warning');
                return;
            }

            const colCodigo = excelHeaderMap['codigo'];
            const colSaldoFisico = excelHeaderMap['saldo fisico'];

            if (colCodigo === undefined || colSaldoFisico === undefined) {
                showToast('Estrutura de dados inválida.', 'error');
                return;
            }

            // Map quantities
            const qtyIndex = new Map(products.map(p => [String(p.code), parseQuantity(p.quantity)]));

            // Reconstruct data for Excel
            // Header
            const data = [excelHeaders]; 
            
            // Rows
            for (const r of excelRows) {
                const newRow = [...r]; // Copy row
                const code = String(r[colCodigo] ?? '');
                
                if (qtyIndex.has(code)) {
                    // Update quantity - keep as number for Excel
                    newRow[colSaldoFisico] = qtyIndex.get(code);
                }
                data.push(newRow);
            }

            try {
                // Create workbook
                const wb = XLSX.utils.book_new();
                const ws = XLSX.utils.aoa_to_sheet(data);
                XLSX.utils.book_append_sheet(wb, ws, "Estoque");

                // Export
                XLSX.writeFile(wb, `estoque_atualizado_${new Date().toISOString().slice(0,10)}.xlsx`);
                showToast('Arquivo Excel (.xlsx) exportado com sucesso!', 'success');
            } catch (e) {
                console.error(e);
                showToast('Erro ao gerar arquivo Excel: ' + e.message, 'error');
            }
        }

        function handleMainAction() {
            if (dataMode === 'excel') {
                exportAsXlsx();
            } else {
                syncFromSheet();
            }
        }

        // ==================== GROUP CARDS ====================
        function renderGroupCards(filter = '') {
            const container = document.getElementById('groupCards');
            
            if (groups.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-white rounded-xl shadow p-12 text-center">
                        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                        </svg>
                        <h3 class="text-xl font-bold text-gray-500 mb-2">Nenhum grupo encontrado</h3>
                        <p class="text-gray-400 mb-4">Verifique se a planilha tem dados na coluna "Grupo"</p>
                    </div>
                `;
                return;
            }

            let filteredGroups = groups;
            if (filter) {
                const term = filter.toLowerCase();
                filteredGroups = groups.filter(group => 
                    group.name.toLowerCase().includes(term)
                );
            }

            if (filteredGroups.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-white rounded-xl shadow p-12 text-center">
                        <svg class="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                        </svg>
                        <h3 class="text-xl font-bold text-gray-500 mb-2">Nenhum grupo encontrado</h3>
                        <p class="text-gray-400">Tente usar outro termo de pesquisa</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = filteredGroups.map(group => {
                const groupProducts = products.filter(p => p.groupId === group.id);
                // Computar saldos positivos, zerados e negativos (sem clamp)
                const totalItems = groupProducts.reduce((sum, p) => sum + signedQuantity(p.quantity), 0);
                
                return `
                    <div onclick="openGroup(${group.id})" class="bg-white rounded-xl shadow-lg p-6 cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-200 border-2 border-transparent hover:border-blue-300">
                        <div class="flex items-start justify-between mb-4">
                            <h3 class="text-xl font-bold text-gray-800">${group.name}</h3>
                            <div class="bg-blue-100 rounded-lg p-2">
                                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
                                </svg>
                            </div>
                        </div>
                        
                        <div class="grid grid-cols-2 gap-4 mb-4">
                            <div class="bg-gray-50 rounded-lg p-3 text-center">
                                <p class="text-2xl font-bold text-gray-800">${groupProducts.length}</p>
                                <p class="text-xs text-gray-500">Produtos</p>
                            </div>
                            <div class="bg-blue-50 rounded-lg p-3 text-center">
                                <p class="text-2xl font-bold text-blue-600">${formatQuantity(totalItems)}</p>
                                <p class="text-xs text-gray-500">Itens</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-center text-blue-600 font-semibold text-sm pt-3 border-t">
                            <span>Iniciar Contagem</span>
                            <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                            </svg>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterGroups() {
            const filter = document.getElementById('groupSearch').value;
            
            // Clear existing timer to avoid excessive calls
            if (groupSearchTimer) {
                clearTimeout(groupSearchTimer);
            }
            
            // Debounce with 300ms delay for better performance
            groupSearchTimer = setTimeout(() => {
                renderGroupCards(filter);
            }, 300);
        }

        // ==================== COUNTING SCREEN ====================
        function openGroup(groupId) {
            currentGroup = groups.find(g => g.id === groupId);
            tempChanges = {};
            
            document.getElementById('currentGroupName').textContent = currentGroup.name;
            document.getElementById('productSearch').value = '';
            document.getElementById('groupScreen').classList.add('hidden');
            document.getElementById('countingScreen').classList.remove('hidden');
            
            renderProductsGrid();
            updateChangedCount();
        }

        function renderProductsGrid(filter = '') {
            const container = document.getElementById('productsGrid');
            let groupProducts = products.filter(p => p.groupId === currentGroup.id);
            
            if (filter) {
                const term = String(filter).trim().toLowerCase();
                const termNoSpaces = term.replace(/\s+/g, '');
                groupProducts = groupProducts.filter(p => {
                    const name = String(p.name || '').toLowerCase();
                    const code = String(p.code || '').toLowerCase();
                    const codeNoSpaces = code.replace(/\s+/g, '');
                    return name.includes(term) || code.includes(term) || codeNoSpaces.includes(termNoSpaces);
                });
            }
            
            if (groupProducts.length === 0) {
                container.innerHTML = `
                    <div class="col-span-full bg-white rounded-xl p-12 text-center">
                        <p class="text-gray-500">${filter ? 'Nenhum produto encontrado' : 'Nenhum produto neste grupo'}</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = groupProducts.map(product => {
                const currentQty = tempChanges[product.code] !== undefined ? tempChanges[product.code] : product.quantity;
                const hasChanged = tempChanges[product.code] !== undefined;
                
                return `
                    <div class="bg-white rounded-xl shadow-lg overflow-hidden ${hasChanged ? 'ring-2 ring-green-500' : ''}" id="card-${product.code}">
                        <div class="p-4 ${hasChanged ? 'bg-green-50' : 'bg-gray-50'} border-b">
                            <h4 class="font-bold text-gray-800 truncate" title="${product.name}">${product.name}</h4>
                            <p class="text-xs text-gray-500">Código: ${product.code}</p>
                            ${hasChanged ? '<span class="text-xs text-green-600 font-semibold">● Modificado</span>' : ''}
                            ${product.updatedAt ? `<p class="text-xs text-orange-600 mt-1">📅 ${formatDate(product.updatedAt)}</p>` : ''}
                        </div>
                        
                        <div class="p-4">
                            <div class="flex justify-between items-center mb-4 text-sm">
                                <span class="text-gray-500">Qtd atual no Sheets:</span>
                                <span class="font-bold ${parseQuantity(product.quantity) < 0 ? 'text-red-600' : 'text-blue-600'} text-lg">${formatQuantity(product.quantity)}</span>
                            </div>

                            <div class="mb-4">
                                <label class="block text-sm font-medium text-gray-600 mb-2">Nova quantidade:</label>
                                <input type="text" 
                                       inputmode="decimal"
                                       id="input-${product.code}" 
                                       value="${formatQuantity(currentQty)}"
                                       onchange="handleQuantityChange('${product.code}', this.value)"
                                       onkeyup="handleQuantityChange('${product.code}', this.value)"
                                       class="w-full px-4 py-3 text-2xl font-bold border-2 ${hasChanged ? 'border-green-400 bg-green-50' : 'border-gray-200'} rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center">
                            </div>

                            <div class="grid grid-cols-4 gap-2">
                                <button onclick="adjustQty('${product.code}', -10)" class="bg-red-100 hover:bg-red-200 text-red-700 py-2 rounded-lg font-bold transition">-10</button>
                                <button onclick="adjustQty('${product.code}', -1)" class="bg-red-200 hover:bg-red-300 text-red-800 py-2 rounded-lg font-bold transition">-1</button>
                                <button onclick="adjustQty('${product.code}', 1)" class="bg-green-200 hover:bg-green-300 text-green-800 py-2 rounded-lg font-bold transition">+1</button>
                                <button onclick="adjustQty('${product.code}', 10)" class="bg-green-100 hover:bg-green-200 text-green-700 py-2 rounded-lg font-bold transition">+10</button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterProducts() {
            const filter = document.getElementById('productSearch').value;
            renderProductsGrid(filter);
        }

        function handleQuantityChange(code, value) {
            const newQty = clampQuantity(value);
            const product = products.find(p => String(p.code) === String(code));
            
            if (!product) return;
            
            const originalQty = clampQuantity(product.quantity);
            
            // Se diferente do original, marcar como alterado
            if (Math.abs(newQty - originalQty) > 0.0001) {
                tempChanges[code] = newQty;
                product.updatedAt = new Date().toISOString(); // Registrar data da alteração
            } else {
                delete tempChanges[code];
            }
            
            updateChangedCount();
            updateCardVisual(code);
        }

        function adjustQty(code, delta) {
            const input = document.getElementById(`input-${code}`);
            if (!input) return;
            
            const currentValue = clampQuantity(input.value);
            const newValue = clampQuantity(currentValue + delta);
            input.value = formatQuantity(newValue);
            handleQuantityChange(code, newValue);
        }

        function updateCardVisual(code) {
            const card = document.getElementById(`card-${code}`);
            const input = document.getElementById(`input-${code}`);
            if (!card || !input) return;
            
            const hasChanged = tempChanges[code] !== undefined;
            
            if (hasChanged) {
                card.classList.add('ring-2', 'ring-green-500');
                input.classList.add('border-green-400', 'bg-green-50');
                input.classList.remove('border-gray-200');
            } else {
                card.classList.remove('ring-2', 'ring-green-500');
                input.classList.remove('border-green-400', 'bg-green-50');
                input.classList.add('border-gray-200');
            }
        }

        function updateChangedCount() {
            const count = Object.keys(tempChanges).length;
            document.getElementById('changedCount').textContent = count;
            document.getElementById('pendingChanges').textContent = count;
            
            const saveBtn = document.getElementById('saveBtn');
            saveBtn.disabled = count === 0;
            
            if (count === 0) {
                saveBtn.classList.add('bg-gray-400');
                saveBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
            } else {
                saveBtn.classList.remove('bg-gray-400');
                saveBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
            }
        }

        // ==================== SAVE CHANGES ====================
        async function saveAllChanges() {
            const changes = Object.entries(tempChanges);

            if (changes.length === 0) {
                showToast('Nenhuma alteração para salvar', 'warning');
                return;
            }

            // EXCEL MODE: apply changes locally and let user export CSV
            if (dataMode === 'excel') {
                for (const [code, qty] of changes) {
                    const product = products.find(p => String(p.code) === String(code));
                    if (product) {
                        product.quantity = parseQuantity(qty);
                        product.updatedAt = new Date().toISOString();
                    }
                }
                tempChanges = {};
                localStorage.setItem('lastCountTime', Date.now().toString());
                updateStatistics();
                renderProductsGrid();
                updateChangedCount();
                showToast('Salvo no app! Clique em "Exportar Excel" na tela de grupos para baixar o arquivo.', 'success');
                return;
            }

            // SHEETS MODE
            showLoading('Salvando alterações...', `${changes.length} item(ns)`);

            try {
                const updates = changes.map(([code, quantity]) => ({
                    code: String(code),
                    quantity: quantity
                }));

                console.log('📤 Enviando updates:', updates);

                const params = { updates: JSON.stringify(updates) };
                if (sheetName) params.sheetName = sheetName;

                const result = await apiCall('updateBatch', params);

                console.log('📥 Resultado:', result);

                if (!result.success) {
                    throw new Error(result.error || 'Erro ao salvar');
                }

                const updatedCodes = result.updated || [];
                for (const item of updatedCodes) {
                    const code = typeof item === 'object' ? item.code : item;
                    const product = products.find(p => String(p.code) === String(code));
                    if (product && tempChanges[code] !== undefined) {
                        product.quantity = tempChanges[code];
                    }
                }

                tempChanges = {};
                localStorage.setItem('lastCountTime', Date.now().toString());

                hideLoading();

                const updatedCount = Array.isArray(updatedCodes) ? updatedCodes.length : 0;
                const errorCount = result.errors ? result.errors.length : 0;

                if (updatedCount > 0) {
                    showToast(`✅ ${updatedCount} item(ns) salvo(s) com sucesso!`, 'success');
                }

                if (errorCount > 0) {
                    const errorCodes = result.errors.map(e => typeof e === 'object' ? e.code : e).join(', ');
                    showToast(`⚠️ ${errorCount} erro(s): ${errorCodes}`, 'warning');
                }

                updateStatistics();
                renderProductsGrid();
                updateChangedCount();

            } catch (error) {
                hideLoading();
                console.error('❌ Erro ao salvar:', error);
                showToast(`Erro: ${error.message}`, 'error');
            }
        }

        function backToGroups() {
            document.getElementById('groupScreen').classList.remove('hidden');
            document.getElementById('countingScreen').classList.add('hidden');
            tempChanges = {};
            updateStatistics();
            renderGroupCards();
        }

        // ==================== ZERO STOCK ====================
        function confirmZeroStock() {
            const groupProducts = products.filter(p => p.groupId === currentGroup.id);
            const productCount = groupProducts.length;
            
            if (productCount === 0) {
                showToast('Nenhum produto neste grupo', 'warning');
                return;
            }

            const content = `
                <div class="text-center">
                    <div class="bg-red-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                        </svg>
                    </div>
                    <h4 class="text-xl font-bold text-gray-800 mb-2">Zerar Estoque do Grupo</h4>
                    <p class="text-gray-600 mb-4">Você está prestes a zerar o estoque de <strong>${productCount} produto(s)</strong> do grupo:</p>
                    <p class="text-lg font-bold text-red-600 mb-4">"${currentGroup.name}"</p>
                    <p class="text-sm text-gray-500">Esta ação definirá a quantidade de todos os produtos deste grupo para <strong>0</strong>.</p>
                    <p class="text-sm text-red-600 font-semibold mt-2">⚠️ Esta ação será salva imediatamente no Google Sheets!</p>
                </div>
            `;

            document.getElementById('editModalTitle').textContent = '⚠️ Confirmar Ação';
            document.getElementById('editModalContent').innerHTML = content;
            document.getElementById('editModalSave').textContent = 'Zerar Estoque';
            document.getElementById('editModalSave').className = 'px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition';
            document.getElementById('editModal').classList.remove('hidden');
            
            modalCallback = executeZeroStock;
        }

        async function executeZeroStock() {
            // Fecha o modal de confirmação
            closeModal();

            // Resetar o botão do modal para o padrão
            const saveBtn = document.getElementById('editModalSave');
            if (saveBtn) {
                saveBtn.textContent = 'Salvar';
                saveBtn.className = 'px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition';
            }

            const groupProducts = products.filter(p => p.groupId === currentGroup.id);

            if (groupProducts.length === 0) {
                showToast('Nenhum produto para zerar', 'warning');
                return;
            }

            // EXCEL MODE: zero locally and allow export
            if (dataMode === 'excel') {
                const nowIso = new Date().toISOString();
                for (const p of groupProducts) {
                    p.quantity = 0;
                    p.updatedAt = nowIso;
                }
                // remove pending changes from this group
                const groupCodes = new Set(groupProducts.map(p => String(p.code)));
                for (const code of Object.keys(tempChanges)) {
                    if (groupCodes.has(String(code))) delete tempChanges[code];
                }
                localStorage.setItem('lastCountTime', Date.now().toString());
                updateStatistics();
                renderProductsGrid();
                updateChangedCount();
                showToast('Grupo zerado no app. Agora use “Exportar CSV Atualizado” para aplicar no Excel.', 'success');
                return;
            }

            showLoading('Zerando estoque...', `${groupProducts.length} produto(s)`);

            try {
                // Monta um lote com todos os produtos do grupo para quantity = 0
                const updates = groupProducts.map(p => ({
                    code: String(p.code),
                    quantity: 0
                }));

                const params = { updates: JSON.stringify(updates) };
                if (sheetName) params.sheetName = sheetName;

                const result = await apiCall('updateBatch', params);

                if (!result || result.success === false) {
                    throw new Error(result && result.error ? result.error : 'Erro ao zerar estoque no Sheets');
                }

                const updatedArr = Array.isArray(result.updated) ? result.updated : [];
                const updatedCodes = new Set(
                    updatedArr.map(item => String(item.code !== undefined ? item.code : item))
                );

                // Atualiza localmente apenas itens que o Sheets confirmou como atualizados
                let successCount = 0;
                const nowIso = new Date().toISOString();
                for (const product of groupProducts) {
                    if (updatedCodes.has(String(product.code))) {
                        product.quantity = 0;
                        product.updatedAt = nowIso;
                        successCount++;
                    }
                }

                // Limpar alterações pendentes apenas dos itens desse grupo
                const groupCodes = new Set(groupProducts.map(p => String(p.code)));
                for (const code of Object.keys(tempChanges)) {
                    if (groupCodes.has(String(code))) {
                        delete tempChanges[code];
                    }
                }

                localStorage.setItem('lastCountTime', Date.now().toString());

                hideLoading();

                if (successCount > 0) {
                    showToast(`✅ Estoque zerado! ${successCount} produto(s) atualizados no Sheets.`, 'success');
                }

                const errorCount = Array.isArray(result.errors) ? result.errors.length : 0;
                if (errorCount > 0) {
                    const errorCodes = result.errors
                        .map(e => (typeof e === 'object' ? e.code : e))
                        .join(', ');
                    showToast(`⚠️ Não foi possível zerar ${errorCount} produto(s): ${errorCodes}`, 'warning');
                }

                // Atualizar interface
                updateStatistics();
                renderProductsGrid();
                updateChangedCount();

            } catch (error) {
                hideLoading();
                console.error('❌ Erro ao zerar estoque:', error);
                showToast(`Erro: ${error.message}`, 'error');
            }
        }


        //servidor
       
const PROXY_URL = 'http://localhost:3000/Estoque';


async function carregarDadosDoProxy() {
    console.log('Iniciando requisição para:', PROXY_URL);
    

    try {
        
        const resposta = await fetch(PROXY_URL);
        
        
        if (!resposta.ok) {
            throw new Error(`Erro HTTP! Status: ${resposta.status}`);
        }
        
       
        const dados = await resposta.json();
        
        
        console.log('Dados recebidos com sucesso:', dados);
        alert(`Sucesso! ${dados.length} produtos carregados (ver console)`);
        
    } catch (erro) {
        console.error('Falha ao carregar dados do Proxy:', erro);
        alert(`Erro na conexão: ${erro.message}. Verifique se o Proxy está rodando.`);
    } finally {
        console.log('Requisição finalizada.');
    }
}