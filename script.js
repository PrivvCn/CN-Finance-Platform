
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

// Verificar elementos essenciais
const elementosObrigatorios = [
  descricaoInput, tipoInput, valorInput, botaoAdicionar,
  resultadoTexto, situacaoTexto, totalReceitasTexto,
  totalDespesasTexto, historicoLista, emailInput,
  senhaInput, botaoRegistar, botaoEntrar,
  botaoSair, mensagemAcesso
];

if (elementosObrigatorios.some(elemento => !elemento)) {
  throw new Error("Faltam elementos HTML necessários para a CN Finance.");
}

const acessoSection = document.getElementById("acesso");
const main = document.querySelector("main");

if (!acessoSection || !main) {
  throw new Error("Não foi encontrada a secção de acesso ou o elemento main.");
}

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

function formatarMT(valor) {
  return Number(valor).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " MT";
}

// Carregar movimentos
async function carregarMovimentos() {
  if (!utilizadorAtual) return;

  const { data, error } = await supabaseClient
    .from("movimentos")
    .select("*")
    .eq("user_id", utilizadorAtual.id)
    .order("created_at", { ascending: false });

  if (error) {
    situacaoTexto.textContent =
      "Erro ao carregar: " + error.message;
    return;
  }

  movimentos = data || [];
  atualizarResumo();
}

// Adicionar movimento
botaoAdicionar.addEventListener("click", async function () {
  if (!utilizadorAtual) return;

  const descricao = descricaoInput.value.trim();
  const tipo = tipoInput.value;
  const valor = Number(valorInput.value);

  if (!descricao || !Number.isFinite(valor) || valor <= 0) {
    situacaoTexto.textContent = "Preenche os campos corretamente.";
    return;
  }

  const { data, error } = await supabaseClient
    .from("movimentos")
    .insert({
      user_id: utilizadorAtual.id,
      descricao,
      tipo,
      valor
    })
    .select()
    .single();

  if (error) {
    situacaoTexto.textContent = "Erro ao guardar: " + error.message;
    return;
  }

  movimentos.unshift(data);
  atualizarResumo();

  descricaoInput.value = "";
  valorInput.value = "";
});

// Atualizar resumo
function atualizarResumo() {
  let receitas = 0;
  let despesas = 0;

  historicoLista.replaceChildren();

  if (movimentos.length === 0) {
    const item = document.createElement("li");
    item.textContent = "Ainda não existem movimentos.";
    historicoLista.appendChild(item);
  }

  movimentos.forEach(movimento => {
    const valor = Number(movimento.valor);
    const item = document.createElement("li");
    const texto = document.createElement("span");

    texto.textContent =
      movimento.descricao + " — " +
      movimento.tipo + ": " +
      (movimento.tipo === "receita" ? "+" : "-") +
      formatarMT(valor);

    const botaoEditar = document.createElement("button");
    botaoEditar.textContent = "Editar";
    botaoEditar.type = "button";

    botaoEditar.addEventListener("click", async function () {
      const descricao = prompt("Nova descrição:", movimento.descricao);
      if (descricao === null) return;

      const tipo = prompt("Escreve receita ou despesa:", movimento.tipo);
      if (tipo === null) return;

      const valorTexto = prompt("Novo valor em MT:", String(valor));
      if (valorTexto === null) return;

      const novoTipo = tipo.trim().toLowerCase();
      const novoValor = Number(valorTexto);

      if (
        !descricao.trim() ||
        !["receita", "despesa"].includes(novoTipo) ||
        !Number.isFinite(novoValor) ||
        novoValor <= 0
      ) {
        alert("Verifica os dados introduzidos.");
        return;
      }

      const { data, error } = await supabaseClient
        .from("movimentos")
        .update({
          descricao: descricao.trim(),
          tipo: novoTipo,
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

      movimentos = movimentos.map(item =>
        item.id === movimento.id ? data : item
      );

      atualizarResumo();
    });

    const botaoEliminar = document.createElement("button");
    botaoEliminar.textContent = "Eliminar";
    botaoEliminar.type = "button";

    botaoEliminar.addEventListener("click", async function () {
      if (!confirm("Queres eliminar este movimento?")) return;

      const { error } = await supabaseClient
        .from("movimentos")
        .delete()
        .eq("id", movimento.id)
        .eq("user_id", utilizadorAtual.id);

      if (error) {
        alert("Erro ao eliminar: " + error.message);
        return;
      }

      movimentos = movimentos.filter(item => item.id !== movimento.id);
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
    mensagemAcesso.textContent = "Preenche o email e a palavra-passe.";
    return;
  }

  botaoRegistar.disabled = true;
  mensagemAcesso.textContent = "A criar a tua conta...";

  try {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password: senha,
      options: {
        emailRedirectTo: "https://privvcn.github.io/CN-Finance-Platform/"
      }
    });

    if (error) throw error;

    mensagemAcesso.textContent = data.session
      ? "Conta criada e sessão iniciada!"
      : "Conta criada! Verifica o teu email para confirmar.";
  } catch (erro) {
    mensagemAcesso.textContent = "Erro no registo: " + erro.message;
  } finally {
    botaoRegistar.disabled = false;
  }
});

// Iniciar sessão
botaoEntrar.addEventListener("click", async function () {
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email || !senha) {
    mensagemAcesso.textContent = "Preenche o email e a palavra-passe.";
    return;
  }

  botaoEntrar.disabled = true;
  mensagemAcesso.textContent = "A iniciar sessão...";

  try {
    const { error } = await supabaseClient.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) throw error;
  } catch (erro) {
    mensagemAcesso.textContent = "Erro ao entrar: " + erro.message;
  } finally {
    botaoEntrar.disabled = false;
  }
});

// Terminar sessão
botaoSair.addEventListener("click", async function () {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    mensagemAcesso.textContent = "Erro ao sair: " + error.message;
    return;
  }

  mensagemAcesso.textContent = "Sessão terminada.";
});

// Acompanhar sessão
supabaseClient.auth.onAuthStateChange((evento, session) => {
  utilizadorAtual = session ? session.user : null;
  atualizarAcesso();

  if (utilizadorAtual) {
    mensagemAcesso.textContent =
      "Sessão iniciada: " + utilizadorAtual.email;

    carregarMovimentos();
  } else {
    mensagemAcesso.textContent = "Cria uma conta ou inicia sessão.";
  }
});

// Verificar sessão existente
async function iniciarAplicacao() {
  try {
    const { data, error } = await supabaseClient.auth.getSession();

    if (error) throw error;

    utilizadorAtual = data.session ? data.session.user : null;
    atualizarAcesso();

    if (utilizadorAtual) {
      await carregarMovimentos();
    }
  } catch (erro) {
    mensagemAcesso.textContent =
      "Erro ao iniciar CN Finance: " + erro.message;
  }
}

iniciarAplicacao();
