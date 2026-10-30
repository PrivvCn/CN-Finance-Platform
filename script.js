
const SUPABASE_URL = "https://zmjahwuaqkddbkbrqkdw.supabase.co";
const SUPABASE_KEY = "sb_publishable_xDCWQlrTKc0arXNQhqKqUw_u4A325XP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Elementos financeiros
const descricaoInput = document.getElementById("descricao");
const tipoInput = document.getElementById("tipo");
const valorInput = document.getElementById("valor");
const botaoAdicionar = document.getElementById("adicionar");

const resultadoTexto = document.getElementById("resultado");
const situacaoTexto = document.getElementById("situacao");
const totalReceitasTexto = document.getElementById("totalReceitas");
const totalDespesasTexto = document.getElementById("totalDespesas");
const historicoLista = document.getElementById("historico");

// Elementos de acesso
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const botaoRegistar = document.getElementById("registar");
const botaoEntrar = document.getElementById("entrar");
const botaoSair = document.getElementById("sair");
const mensagemAcesso = document.getElementById("mensagemAcesso");

let movimentos = [];
let utilizadorAtual = null;

// Controlar a visibilidade do painel financeiro
const acessoSection = document.getElementById("acesso");
const main = document.querySelector("main");

const elementosFinanceiros = Array.from(main.children)
  .filter(elemento => elemento !== acessoSection);

function atualizarAcesso() {
  const autenticado = Boolean(utilizadorAtual);

  elementosFinanceiros.forEach(elemento => {
    elemento.hidden = !autenticado;
  });

  botaoRegistar.style.display = autenticado ? "none" : "block";
  botaoEntrar.style.display = autenticado ? "none" : "block";
  botaoSair.style.display = autenticado ? "block" : "none";

  if (!autenticado) {
    movimentos = [];
    atualizarResumo();
  }
}

// Formatar valores em meticais
function formatarMT(valor) {
  return Number(valor).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " MT";
}

// Carregar movimentos do utilizador
async function carregarMovimentos() {
  if (!utilizadorAtual) return;

  const { data, error } = await supabaseClient
    .from("movimentos")
    .select("*")
    .eq("user_id", utilizadorAtual.id)
    .order("created_at", { ascending: false });

  if (error) {
    situacaoTexto.textContent =
      "Erro ao carregar movimentos: " + error.message;
    return;
  }

  movimentos = data || [];
  atualizarResumo();
}

// Adicionar movimento
botaoAdicionar.addEventListener("click", async function () {
  if (!utilizadorAtual) {
    mensagemAcesso.textContent = "Inicia sessão primeiro.";
    return;
  }

  const descricao = descricaoInput.value.trim();
  const tipo = tipoInput.value;
  const valor = Number(valorInput.value);

  if (descricao === "") {
    situacaoTexto.textContent =
      "Introduz a descrição do movimento.";
    return;
  }

  if (
    valorInput.value.trim() === "" ||
    !Number.isFinite(valor) ||
    valor <= 0
  ) {
    situacaoTexto.textContent =
      "Introduz um valor maior que zero.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("movimentos")
    .insert({
      user_id: utilizadorAtual.id,
      descricao: descricao,
      tipo: tipo,
      valor: valor
    })
    .select()
    .single();

  if (error) {
    situacaoTexto.textContent =
      "Erro ao guardar: " + error.message;
    return;
  }

  movimentos.unshift(data);
  atualizarResumo();

  descricaoInput.value = "";
  valorInput.value = "";
  descricaoInput.focus();
});

// Atualizar resumo e histórico
function atualizarResumo() {
  let receitas = 0;
  let despesas = 0;

  historicoLista.replaceChildren();

  if (movimentos.length === 0) {
    const itemVazio = document.createElement("li");
    itemVazio.textContent = "Ainda não existem movimentos.";
    historicoLista.appendChild(itemVazio);
  }

  movimentos.forEach(function (movimento) {
    const item = document.createElement("li");
    const valor = Number(movimento.valor);
    const sinal = movimento.tipo === "receita" ? "+" : "-";

    const texto = document.createElement("span");

    texto.textContent =
      movimento.descricao + " — " +
      movimento.tipo + ": " +
      sinal + formatarMT(valor);

    // Botão editar
    const botaoEditar = document.createElement("button");
    botaoEditar.textContent = "Editar";
    botaoEditar.type = "button";
    botaoEditar.style.width = "auto";

    botaoEditar.addEventListener("click", async function () {
      const novaDescricao = prompt(
        "Nova descrição:",
        movimento.descricao
      );

      if (novaDescricao === null) return;

      const descricaoLimpa = novaDescricao.trim();

      if (descricaoLimpa === "") {
        alert("A descrição não pode ficar vazia.");
        return;
      }

      const novoTipo = prompt(
        "Escreve receita ou despesa:",
        movimento.tipo
      );

      if (novoTipo === null) return;

      const tipoLimpo = novoTipo.trim().toLowerCase();

      if (tipoLimpo !== "receita" && tipoLimpo !== "despesa") {
        alert("Escreve receita ou despesa.");
        return;
      }

      const novoValorTexto = prompt(
        "Novo valor em MT:",
        String(valor)
      );

      if (novoValorTexto === null) return;

      const novoValor = Number(novoValorTexto);

      if (
        novoValorTexto.trim() === "" ||
        !Number.isFinite(novoValor) ||
        novoValor <= 0
      ) {
        alert("Introduz um valor maior que zero.");
        return;
      }

      const { data, error } = await supabaseClient
        .from("movimentos")
        .update({
          descricao: descricaoLimpa,
          tipo: tipoLimpo,
          valor: novoValor
        })
        .eq("id", movimento.id)
        .eq("user_id", utilizadorAtual.id)
        .select()
        .single();

      if (error) {
        alert("Erro ao editar: " + error.message);
        return;
      }

      const indice = movimentos.findIndex(
        item => item.id === movimento.id
      );

      if (indice !== -1) {
        movimentos[indice] = data;
      }

      atualizarResumo();
    });

    // Botão eliminar
    const botaoEliminar = document.createElement("button");
    botaoEliminar.textContent = "Eliminar";
    botaoEliminar.type = "button";
    botaoEliminar.style.width = "auto";

    botaoEliminar.addEventListener("click", async function () {
      const confirmar = confirm(
        "Tens a certeza de que queres eliminar este movimento?"
      );

      if (!confirmar) return;

      const { error } = await supabaseClient
        .from("movimentos")
        .delete()
        .eq("id", movimento.id)
        .eq("user_id", utilizadorAtual.id);

      if (error) {
        alert("Erro ao eliminar: " + error.message);
        return;
      }

      movimentos = movimentos.filter(
        item => item.id !== movimento.id
      );

      atualizarResumo();
    });

    item.appendChild(texto);
    item.appendChild(botaoEditar);
    item.appendChild(botaoEliminar);
    historicoLista.appendChild(item);

    if (movimento.tipo === "receita") {
      receitas += valor;
    } else {
      despesas += valor;
    }
  });

  const saldo = receitas - despesas;

  totalReceitasTexto.textContent = formatarMT(receitas);
  totalDespesasTexto.textContent = formatarMT(despesas);
  resultadoTexto.textContent = formatarMT(saldo);

  if (saldo > 0) {
    situacaoTexto.textContent = "Situação: Lucro";
    resultadoTexto.style.color = "#216e49";
  } else if (saldo < 0) {
    situacaoTexto.textContent = "Situação: Prejuízo";
    resultadoTexto.style.color = "#b42318";
  } else {
    situacaoTexto.textContent = "Situação: Equilíbrio";
    resultadoTexto.style.color = "#142b4a";
  }
}

// Criar conta
botaoRegistar.addEventListener("click", async function () {
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    mensagemAcesso.textContent =
      "Preenche o email e a palavra-passe.";
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email: email,
    password: senha,
    options: {
      emailRedirectTo: "https://privvcn.github.io/CN-Finance-Platform/"
    }
  });

  if (error) {
    mensagemAcesso.textContent = error.message;
    return;
  }

  mensagemAcesso.textContent =
    "Conta criada! Confirma o teu email para continuar.";
});

// Iniciar sessão
botaoEntrar.addEventListener("click", async function () {
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    mensagemAcesso.textContent =
      "Preenche o email e a palavra-passe.";
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password: senha
  });

  if (error) {
    mensagemAcesso.textContent = error.message;
    return;
  }
});

// Terminar sessão
botaoSair.addEventListener("click", async function () {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    mensagemAcesso.textContent = error.message;
    return;
  }

  mensagemAcesso.textContent = "Sessão terminada.";
});

// Acompanhar o estado da sessão
supabaseClient.auth.onAuthStateChange((evento, session) => {
  utilizadorAtual = session ? session.user : null;

  atualizarAcesso();

  if (utilizadorAtual) {
    mensagemAcesso.textContent =
      "Sessão iniciada: " + utilizadorAtual.email;

    carregarMovimentos();
  } else {
    mensagemAcesso.textContent =
      "Cria uma conta ou inicia sessão.";
  }
});

// Verificar sessão existente ao abrir o site
async function iniciarAplicacao() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    mensagemAcesso.textContent = error.message;
    return;
  }

  utilizadorAtual = data.session
    ? data.session.user
    : null;

  atualizarAcesso();

  if (utilizadorAtual) {
    carregarMovimentos();
  }
}

iniciarAplicacao();
