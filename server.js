require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// 1. Rota de Login (Validação do e-mail do Professor)
app.post('/api/login', (req, res) => {
    const { tipo, email } = req.body;

    if (tipo === 'Professor') {
        if (!email || (!email.endsWith('@escola.com') && !email.endsWith('@escola.edu.br') && !email.endsWith('@escola'))) {
            return res.status(400).json({ error: 'Professores devem utilizar um e-mail corporativo (@escola).' });
        }
    }
    return res.json({ success: true, tipo, email });
});

// 2. Buscar Turmas
app.get('/api/turmas', async (req, res) => {
    const { data, error } = await supabase.from('turmas').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 3. Buscar Alunos por Turma
app.get('/api/alunos/:turmaId', async (req, res) => {
    const { turmaId } = req.params;
    const { data, error } = await supabase
        .from('alunos')
        .select('*')
        .eq('turma_id', turmaId);
        
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 4. Criar Autorização com Trava de 2 idas ao Banheiro/dia
app.post('/api/autorizacoes', async (req, res) => {
    const { professor_email, aluno_id, motivo } = req.body;

    if (!professor_email || !aluno_id || !motivo) {
        return res.status(400).json({ error: 'Preencha todos os campos obrigatórios.' });
    }

    // Regra de Negócio: Verificar limite diário de banheiro (máximo 2)
    if (motivo === 'banheiro') {
        const hojeInicio = new Date();
        hojeInicio.setHours(0, 0, 0, 0);

        const { count, error: countError } = await supabase
            .from('autorizacoes')
            .select('*', { count: 'exact', head: true })
            .eq('aluno_id', aluno_id)
            .eq('motivo', 'banheiro')
            .gte('criado_em', hojeInicio.toISOString());

        if (countError) return res.status(500).json({ error: countError.message });

        if (count >= 2) {
            return res.status(400).json({ 
                error: 'Limite atingido! Este aluno já utilizou a permissão de banheiro 2 vezes hoje.' 
            });
        }
    }

    // Inserir a nova autorização
    const { data, error } = await supabase
        .from('autorizacoes')
        .insert([{ professor_email, aluno_id, motivo, status: 'em_transito' }])
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data[0]);
});

// 5. Listar Autorizações para o Monitor (Em tempo real / Polling)
app.get('/api/autorizacoes', async (req, res) => {
    const { data, error } = await supabase
        .from('autorizacoes')
        .select(`
            id,
            professor_email,
            motivo,
            status,
            criado_em,
            retornado_em,
            alunos ( nome, turmas ( nome ) )
        `)
        .order('criado_em', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// 6. Atualizar Retorno do Aluno (Ação do Monitor)
app.patch('/api/autorizacoes/:id/retorno', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('autorizacoes')
        .update({ 
            status: 'retornou', 
            retornado_em: new Date().toISOString() 
        })
        .eq('id', id)
        .select();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data[0]);
});

// 7. Relatório Histórico para a Administração
app.get('/api/admin/historico', async (req, res) => {
    const { data, error } = await supabase
        .from('autorizacoes')
        .select(`
            id,
            professor_email,
            motivo,
            criado_em,
            alunos ( nome, turmas ( nome ) )
        `);

    if (error) return res.status(500).json({ error: error.message });

    // Agrupar métricas por professor
    const resumoProfessores = {};
    data.forEach(item => {
        const prof = item.professor_email;
        if (!resumoProfessores[prof]) {
            resumoProfessores[prof] = { total: 0, banheiro: 0, biblioteca: 0, pedagogico: 0, outro: 0 };
        }
        resumoProfessores[prof].total += 1;
        if (item.motivo === 'banheiro') resumoProfessores[prof].banheiro += 1;
        if (item.motivo === 'biblioteca') resumoProfessores[prof].biblioteca += 1;
        if (item.motivo === 'pedagógico') resumoProfessores[prof].pedagogico += 1;
        if (item.motivo === 'outro motivo') resumoProfessores[prof].outro += 1;
    });

    res.json({ resumoProfessores, historicoCompleto: data });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));