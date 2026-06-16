let questaoAtual = null;
const URL_PLANILHA = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQpfAboRLZDuQqVdmk6K-5czQnCCJgup_XaU9N9wxo44YV2iHz63oZqUxNMRGyHvqsJUDS8bPtkAo1X/pub?output=csv"; // <--- COLE SEU LINK AQUI

window.onload = function() {
    const salva = localStorage.getItem("gemini_api_key");
    if (salva) {
        document.getElementById("input-key").value = salva;
    } else {
        toggleConfig();
    }
    carregarAssuntos();
};

async function carregarAssuntos() {
    const select = document.getElementById("select-conteudo");
    try {
        const response = await fetch(URL_PLANILHA);
        const data = await response.text();
        const linhas = data.split('\n').filter(l => l.trim() !== "");
        
        select.innerHTML = "";
        linhas.forEach(assunto => {
            const option = document.createElement("option");
            option.value = assunto.trim();
            option.textContent = assunto.trim();
            select.appendChild(option);
        });
    } catch (e) {
        console.error("Erro ao carregar temas:", e);
        select.innerHTML = '<option>Erro ao carregar temas</option>';
    }
}

function toggleConfig() {
    const painel = document.getElementById("panel-config");
    painel.style.display = painel.style.display === "block" ? "none" : "block";
}

function salvarKey() {
    const key = document.getElementById("input-key").value.trim();
    if(key) {
        localStorage.setItem("gemini_api_key", key);
        alert("Chave salva com sucesso!");
        toggleConfig();
    } else {
        localStorage.removeItem("gemini_api_key");
        alert("Chave removida.");
    }
}

async function gerarQuestao() {
    const conteudo = document.getElementById("select-conteudo").value;
    const nivel = document.getElementById("select-nivel").value;
    const apiKey = localStorage.getItem("gemini_api_key");

    if (!apiKey) {
        alert("Configure sua API Key primeiro.");
        toggleConfig();
        return;
    }

    document.getElementById("feedback-box").style.display = "none";
    document.getElementById("btn-proxima").style.display = "none";
    document.getElementById("btn-verificar").style.display = "inline-flex";
    
    const textoContainer = document.getElementById("questao-texto");
    textoContainer.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Criando questão...";
    document.getElementById("alternativas-container").innerHTML = "";
    document.getElementById("box-questao").style.display = "block";

    const systemPrompt = `Você é um professor especialista em matemática. Responda ESTRITAMENTE com um objeto JSON válido, sem markdown. 
    Estrutura: {"texto": "...", "opcoes": ["A", "B", "C", "D"], "correta": 0, "explicacao": "..."}`;

    const userPrompt = `Gere uma questão de matemática inédita sobre "${conteudo}" no nível "${nivel}".`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: { responseMimeType: "application/json", temperature: 0.7 }
            })
        });

        const data = await response.json();
        const respostaTexto = data.candidates[0].content.parts[0].text.trim();
        questaoAtual = JSON.parse(respostaTexto);
        renderizarQuestao(questaoAtual, conteudo, nivel);
    } catch (e) {
        document.getElementById("questao-texto").textContent = "Erro ao gerar questão. Tente novamente.";
    }
}

function renderizarQuestao(questao, conteudo, nivel) {
    document.getElementById("badge-conteudo").textContent = conteudo;
    document.getElementById("badge-nivel").textContent = nivel;
    document.getElementById("questao-texto").textContent = questao.texto;
    
    const cont = document.getElementById("alternativas-container");
    cont.innerHTML = "";
    questao.opcoes.forEach((op, i) => {
        cont.innerHTML += `<label class="option-item"><input type="radio" name="alternativa" value="${i}"> <span>${op}</span></label>`;
    });
}

function verificarResposta() {
    const sel = document.querySelector('input[name="alternativa"]:checked');
    if (!sel) return alert("Selecione uma opção!");
    
    const r = parseInt(sel.value);
    document.querySelectorAll('input[name="alternativa"]').forEach(i => i.disabled = true);
    
    const fb = document.getElementById("feedback-box");
    fb.innerHTML = (r === questaoAtual.correta ? "Correto! " : "Incorreto. ") + questaoAtual.explicacao;
    fb.className = "feedback " + (r === questaoAtual.correta ? "success" : "error");
    fb.style.display = "block";
    document.getElementById("btn-verificar").style.display = "none";
    document.getElementById("btn-proxima").style.display = "inline-flex";
}
