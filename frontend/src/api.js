// A simplified version of the apiCall function from script.js

async function apiCall(webAppUrl, sheetName, action, params = {}) {
  if (!webAppUrl) {
    throw new Error('URL do Web App não configurada');
  }

  const isGet = action === 'getAll';
  const url = new URL(webAppUrl);
  url.searchParams.append('action', action);
  if (sheetName) {
    url.searchParams.append('sheetName', sheetName);
  }

  console.log('API Call:', action, params);

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

    const response = await fetch(url.toString(), fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error('Erro HTTP ' + response.status);

    const text = await response.text();
    console.log('Response text:', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Resposta inválida do servidor');
    }

    if (data.error) throw new Error(data.error);
    return data;

  } catch (error) {
    console.error('API Error:', error);
    if (error.name === 'AbortError') throw new Error('Tempo limite excedido');
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Falha na conexão. Verifique a URL e as permissões do Web App.');
    }
    throw error;
  }
}
