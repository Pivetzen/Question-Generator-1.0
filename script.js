let questaoAtual = null;

// Executa assim que a janela carregar
window.onload = function() {
    const salva = localStorage.getItem("gemini_api_key");
    if (salva) {
        document.getElementById("input-key").value = salva;
    } else {
        toggleConfig(); // Abre o painel se não houver chave salva
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
        alert("Chave salva com sucesso de forma local!");
        toggleConfig();
    } else {
        localStorage.removeItem("gemini_api_key");
        alert("Chave removida.");
    }
}

// Conexão direta via REST com o modelo estável gemini-2.5-flash
async function gerarQuestao() {
    const conteudo = document.getElementById("select-conteudo").value;
    const nivel = document.getElementById("select-nivel").value;
    const apiKey = localStorage.getItem("gemini_api_key");

    if (!apiKey) {
        alert("Por favor, clique na engrenagem e configure sua API Key gratuita do Gemini.");
        toggleConfig();
        return;
    }

    // Configuração visual de carregamento
    document.getElementById("feedback-box").style.display = "none";
    document.getElementById("btn-proxima").style.display = "none";
    document.getElementById("btn-verificar").style.display = "inline-flex";
    
    const textoContainer = document.getElementById("questao-texto");
    textoContainer.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> A IA está criando uma questão inédita para você...";
    document.getElementById("alternativas-container").innerHTML = "";
    document.getElementById("box-questao").style.display = "block";

    // Engenharia de Prompt para o Gemini
    const systemPrompt = `Você é um professor especialista em matemática. Seu trabalho é gerar uma questão inédita de múltipla escolha baseada nos parâmetros solicitados.
Você deve responder ESTRITAMENTE com um objeto JSON válido, sem tags markdown do tipo \`\`\`json no início ou fim, sem textos complementares antes ou depois do JSON.

A estrutura exata do JSON deve ser:
{
  "texto": "Escreva aqui o enunciado completo da questão matemática.",
  "opcoes": ["Alternativa A", "Alternativa B", "Alternativa C", "Alternativa D"],
  "correta": 0, 
  "explicacao": "Explicação passo a passo da resolução da questão."
}

Regras:
1. Em 'correta', coloque um número de 0 a 3 indicando qual das posições do array 'opcoes' possui a resposta certa.
2. Não use caracteres especiais ou aspas duplas dentro dos textos que possam quebrar a formatação JSON. Se usar aspas, use aspas simples.`;

    const userPrompt = `Gere uma questão de matemática inédita e criativa sobre o conteúdo de "${conteudo}" no nível de dificuldade "${nivel}".`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) throw new Error("Erro na comunicação com a API.");

        const data = await response.json();
        let respostaTexto = data.candidates[0].content.parts[0].text.trim();
        
        // Remove limpezas residuais de Markdown por garantia
        respostaTexto = respostaTexto.replace(/^```json/, "").replace(/```$/, "").trim();
        
        questaoAtual = JSON.parse(respostaTexto);
        renderizarQuestao(questaoAtual, conteudo, nivel);

    } catch (e) {
        console.error(e);
        exibirErroFallback();
    }
}

function renderizarQuestao(questao, conteudo, nivel) {
    const box = document.getElementById("box-questao");
    const textoContainer = document.getElementById("questao-texto");
    const alternativasContainer = document.getElementById("alternativas-container");
    
    document.getElementById("badge-conteudo").textContent = conteudo;
    document.getElementById("badge-nivel").textContent = nivel;
    
    textoContainer.textContent = questao.texto;
    alternativasContainer.innerHTML = "";
    
    questao.opcoes.forEach((opcao, index) => {
        const label = document.createElement("label");
        label.className = "option-item";
        label.setAttribute("for", "opt-" + index);
        
        label.innerHTML = `
            <input type="radio" name="alternativa" id="opt-${index}" value="${index}">
            <span>${opcao}</span>
        `;
        alternativasContainer.appendChild(label);
    });
    
    box.style.display = "block";
}

function exibirErroFallback() {
    const textoContainer = document.getElementById("questao-texto");
    textoContainer.innerHTML = "<i class='fa-solid fa-triangle-exclamation' style='color:var(--error)'></i> Não foi possível obter uma resposta limpa da IA. Tente gerar novamente.";
    document.getElementById("btn-verificar").style.display = "none";
}

function verificarResposta() {
    if (!questaoAtual) return;
    
    const selecionado = document.querySelector('input[name="alternativa"]:checked');
    
    if (!selecionado) {
        alert("Por favor, selecione uma alternativa antes de verificar!");
        return;
    }
    
    const respostaUsuario = parseInt(selecionado.value);
    const feedbackBox = document.getElementById("feedback-box");
    const itensOpcao = document.querySelectorAll(".option-item");
    
    document.querySelectorAll('input[name="alternativa"]').forEach(input => input.disabled = true);

    itensOpcao.forEach((item, index) => {
        if (index === questaoAtual.correta) {
            item.classList.add("correct");
        } else if (index === respostaUsuario) {
            item.classList.add("wrong");
        }
    });

    if (respostaUsuario === questaoAtual.correta) {
        feedbackBox.className = "feedback success";
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-check"></i> <b>Excelente, resposta correta!</b><br><br>${questaoAtual.explicacao}`;
    } else {
        feedbackBox.className = "feedback error";
        feedbackBox.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> <b>Incorreto. Veja a resolução abaixo:</b><br><br>${questaoAtual.explicacao}`;
    }
    
    feedbackBox.style.display = "block";
    document.getElementById("btn-verificar").style.display = "none";
    document.getElementById("btn-proxima").style.display = "inline-flex";
}
