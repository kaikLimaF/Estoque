// server.js

// Importação com require (padrão Node.js)
require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importação específica do cliente Supabase. 
// Nota: Em projetos Node.js modernos, você pode precisar usar import 
// se o seu package.json tiver "type": "module".
// Mas vamos tentar a sintaxe require para o cenário mais comum.
const { createClient } = require('@supabase/supabase-js');


// 2. Variáveis de Configuração (Lendo do .env)
const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL; // Lendo a nova variável
const SUPABASE_KEY = process.env.SUPABASE_KEY; // Lendo a nova variável

// 3. Inicialização do Cliente Supabase
// A conexão com o BD é feita aqui, usando as chaves secretas carregadas.
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);


// 4. Inicialização do Express
const app = express();

// Configuração de Middlewares
app.use(cors());
app.use(express.json());


// Log de verificação (Para o terminal)
console.log('--- Configuração do Proxy (Supabase) ---');
console.log(`Supabase URL Carregada: ${SUPABASE_URL ? '✅ Sim' : '❌ Não'}`);
console.log(`Supabase Key Carregada: ${SUPABASE_KEY ? '✅ Sim (Oculta)' : '❌ Não'}`);
console.log(`Proxy Rodando na Porta: ${PORT}`);
console.log('----------------------------------------');

// 5. Definição da Rota do Proxy (GET /produtos)
// Esta rota agora consulta a tabela 'produtos' no Supabase.
app.get('/Estoque', async (req, res) => {

    try {
        if (!SUPABASE_URL || !SUPABASE_KEY) {
            throw new Error("As variáveis de ambiente do Supabase não estão configuradas.");
        }

        console.log('📤 A consultar Supabase: Tabela "Estoque"');

        // EXECUTA A CONSULTA: Seleciona todos os dados da tabela 'produtos'

        const { data: produtos, error } = await supabase
            .from('Estoque') // <--- CORRIGIR AQUI (Ex: 'products' ou 'estoque')
            .select('*');

        // Verifica se houve erro na consulta ao Supabase
        if (error) {
            console.error('Erro Supabase:', error);
            // Retorna um erro 500 com os detalhes do erro do BD
            return res.status(500).json({
                erro: 'Falha na consulta ao banco de dados.',
                detalhe: error.message
            });
        }

        // Retorna os dados como JSON para o Frontend
        res.json(produtos);

    } catch (erro) {
        console.error('Erro no servidor proxy:', erro.message);
        res.status(500).json({ erro: `Erro interno no servidor proxy: ${erro.message}` });
    }
});


// 6. Iniciar o Servidor Proxy
app.listen(PORT, () => {
    console.log(`🚀 Proxy Server a rodar na porta ${PORT}`);
    console.log(`Seu Frontend deve acessar: http://localhost:${PORT}/Estoque`);
});