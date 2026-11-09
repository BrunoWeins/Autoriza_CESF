const API_URL = 'http://localhost:3000/api';

let usuarioAtual = {
    tipo: null,
    email: null
};

// --- AUTENTICAÇÃO ---
async function realizarLogin(tipo, email = '') {
    try {
        const res = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tipo, email })
        });
        const data = await res.json();

        if (!res.ok) throw new Error(data.error);

        usuarioAtual = { tipo: data.tipo, email: data.email };
        alert(`Login realizado como ${data.tipo}`);
        
        if (tipo === 'Professor') carregarTurmas();
        if (tipo === 'Monitor') carregarFeedMonitor();
        if (tipo === 'Administração') carregarRelatorioAdmin();

    } catch (err) {
        alert(err.message);
    }
}

// --- FLUXO DO PROFESSOR ---
async function carregarTurmas() {
    const selectTurma = document.getElementById('select-turma');
    if (!selectTurma) return;

    const res = await fetch(`${API_URL}/turmas`);
    const turmas = await res.json();

    selectTurma.innerHTML = '<option value="">Selecione uma turma</option>';
    turmas.forEach(t => {
        selectTurma.innerHTML += `<option value="${t.id}">${t.nome}</option>`;
    });
}

async function carregarAlunosPorTurma(turmaId) {
    const selectAluno = document.getElementById('select-aluno');
    if (!selectAluno) return;

    const res = await fetch(`${API_URL}/alunos/${turmaId}`);
    const alunos = await res.json();

    selectAluno.innerHTML = '<option value="">Selecione um aluno</option>';
    alunos.forEach(a => {
        selectAluno.innerHTML += `<option value="${a.id}">${a.nome}</option>`;
    });
}

async function criarAutorizacao(alunoId, motivo) {
    try {
        const res = await fetch(`${API_URL}/autorizacoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                professor_email: usuarioAtual.email,
                aluno_id: alunoId,
                motivo: motivo
            })
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        alert('Autorização emitida com sucesso!');
    } catch (err) {
        alert(err.message);
    }
}

// --- FLUXO DO MONITOR ---
async function carregarFeedMonitor() {
    const res = await fetch(`${API_URL}/autorizacoes`);
    const autorizacoes = await res.json();
    const container = document.getElementById('feed-monitor');
    if (!container) return;

    container.innerHTML = '';
    autorizacoes.forEach(item => {
        const div = document.createElement('div');
        div.className = `card-autorizacao ${item.status}`;
        div.innerHTML = `
            <p><strong>Aluno:</strong> ${item.alunos.nome} (${item.alunos.turmas.nome})</p>
            <p><strong>Motivo:</strong> ${item.motivo}</p>
            <p><strong>Professor:</strong> ${item.professor_email}</p>
            <p><strong>Status:</strong> ${item.status === 'em_transito' ? 'Em trânsito ⏳' : 'Retornou ✅'}</p>
            ${item.status === 'em_transito' ? `<button onclick="confirmarRetorno(${item.id})">Confirmar Retorno</button>` : ''}
        `;
        container.appendChild(div);
    });
}

async function confirmarRetorno(id) {
    await fetch(`${API_URL}/autorizacoes/${id}/retorno`, { method: 'PATCH' });
    carregarFeedMonitor();
}

// Atualiza o feed do monitor automaticamente a cada 5 segundos
setInterval(() => {
    if (usuarioAtual.tipo === 'Monitor') carregarFeedMonitor();
}, 5000);

// --- FLUXO DA ADMINISTRAÇÃO ---
async function carregarRelatorioAdmin() {
    const res = await fetch(`${API_URL}/admin/historico`);
    const { resumoProfessores, historicoCompleto } = await res.json();

    const tabela = document.getElementById('tabela-historico');
    if (!tabela) return;

    tabela.innerHTML = '';
    for (const [prof, stats] of Object.entries(resumoProfessores)) {
        tabela.innerHTML += `
            <tr>
                <td>${prof}</td>
                <td>${stats.total}</td>
                <td>${stats.banheiro}</td>
                <td>${stats.biblioteca}</td>
                <td>${stats.pedagogico}</td>
                <td>${stats.outro}</td>
            </tr>
        `;
    }
}