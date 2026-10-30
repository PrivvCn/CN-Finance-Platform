
const SUPABASE_URL = "https://zmjahwuaqkddbkbrqkdw.supabase.co";
const SUPABASE_KEY = "sb_publishable_xDCWQlrTKc0arXNQhqKqUw_u4A325XP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Elementos de acesso
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const botaoRegistar = document.getElementById("registar");
const botaoEntrar = document.getElementById("entrar");
const botaoSair = document.getElementById("sair");
const mensagemAcesso = document.getElementById("mensagemAcesso");
const acessoSection = document.getElementById("acesso");

// Elementos financeiros
const descricaoInput = document.getElementById("descricao");
const tipoInput = document.getElementById("tipo");
const valorInput = document.getElementById("valor");
const botaoAdicionar = document.getElementById("adicionar");
const saldoElemento = document.getElementById("resultado");
const situacaoElemento = document.getElementById("situacao");
const receitasElemento = document.getElementById("totalReceitas");
const despesasElemento = document.getElementById("totalDespesas");
const historicoElemento = document.getElementById("historico");

const elementosFinanceiros = [
  descricaoInput, tipoInput, valorInput, botaoAdicionar,
  saldoElemento, situacaoElemento, receitasElemento,
  despesasElemento, historicoElemento
];

let utilizadorAtual = null;
let movimentos = [];

function mostrarMensagem(texto) {
  if (mensagemAcesso) mensagemAcesso.textContent = texto;
}

function atualizarAcesso() {
  const autenticado = Boolean(utilizadorAtual);

  if (acessoSection) acessoSection.hidden = autenticado;

  elementosFinanceiros.forEach(elemento => {
    if (elemento) {
      elemento.closest("section")?.removeAttribute("hidden");
    }
  });

  if (botaoSair) {
    botaoSair.hidden = !autenticado;
  }

  if (!autenticado) {
    movimentos = [];
    atualizarResumo();
  }
}

function formatarValor(valor) {
  return Number(valor).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " MT";
}

async function carregarMovimentos() {
  if (!utilizadorAtual) return;

  const { data, error } = await supabaseClient
    .from("movimentos")
    .select("*")
    .eq("user_id", utilizadorAtual.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    mostrarMensagem("Erro ao carregar movimentos.");
    return;
  }

  movimentos = data || [];
  atualizarResumo();
}

function atualizarResumo() {
  const receitas = movimentos
    .filter(m => m.tipo === "receita")
    .reduce((total, m) => total + Number(m.valor), 0);

  const despesas = movimentos
    .filter(m => m.tipo === "despesa")
    .reduce((total, m) => total + Number(m.valor), 0);

  const saldo = receitas - despesas;

  if (saldoElemento) saldoElemento.textContent = formatarValor(saldo);
  if (receitasElemento) receitasElemento.textContent = formatarValor(receitas);
  if (despesasElemento) despesasElemento.textContent = formatarValor(despesas);

  if (situacaoElemento) {
    situacaoElemento.textContent =
      saldo > 0 ? "Lucro" :
      saldo < 0 ? "Prejuízo" : "Equilíbrio";
  }

  if (!historicoElemento) return;

  historicoElemento.innerHTML = "";

  if (movimentos.length === 0) {
    historicoElemento.innerHTML = "<li>Ainda não existem movimentos.</li>";
    return;
  }

  movimentos.forEach(movimento => {
    const item = document.createElement("li");
    const texto = document.createElement("span");

    texto.textContent =
      `${movimento.descricao} — ${movimento.tipo} — ${formatarValor(movimento.valor)} `;

    const editar = document.createElement("button");
    editar.textContent = "Editar";
    editar.onclick = () => editarMovimento(movimento);

    const apagar = document.createElement("button");
    apagar.textContent = "Eliminar";
    apagar.onclick = () => eliminarMovimento(movimento.id);

    item.append(texto, editar, apagar);
    historicoElemento.appendChild(item);
  });
}

async function adicionarMovimento() {
  if (!utilizadorAtual) return;

  const descricao = descricaoInput.value.trim();
  const tipo = tipoInput.value;
  const valor = Number(valorInput.value);

  if (!descricao || !Number.isFinite(valor) || valor <= 0) {
    alert("Preenche corretamente todos os campos.");
    return;
  }

  const { error } = await supabaseClient
    .from("movimentos")
    .insert({
      user_id: utilizadorAtual.id,
      descricao,
      tipo,
      valor
    });

  if (error) {
    alert("Não foi possível adicionar o movimento.");
    console.error(error);
    return;
  }

  descricaoInput.value = "";
  valorInput.value = "";
  await carregarMovimentos();
}

async function editarMovimento(movimento) {
  const novaDescricao = prompt("Nova descrição:", movimento.descricao);
  if (novaDescricao === null) return;

  const novoValorTexto = prompt("Novo valor:", movimento.valor);
  if (novoValorTexto === null) return;

  const novoValor = Number(novoValorTexto);

  if (!novaDescricao.trim() || !Number.isFinite(novoValor) || novoValor <= 0) {
    alert("Dados inválidos.");
    return;
  }

  const { error } = await supabaseClient
    .from("movimentos")
    .update({
      descricao: novaDescricao.trim(),
      valor: novoValor
    })
    .eq("id", movimento.id)
    .eq("user_id", utilizadorAtual.id);

  if (error) {
    alert("Erro ao editar movimento.");
    console.error(error);
    return;
  }

  await carregarMovimentos();
}

async function eliminarMovimento(id) {
  if (!confirm("Tens a certeza que queres eliminar este movimento?")) return;

  const { error } = await supabaseClient
    .from("movimentos")
    .delete()
    .eq("id", id)
    .eq("user_id", utilizadorAtual.id);

  if (error) {
    alert("Erro ao eliminar movimento.");
    console.error(error);
    return;
  }

  await carregarMovimentos();
}

async function registar() {
  const email = emailInput.value.trim();
  const password = senhaInput.value;

  if (!email || !password) {
    mostrarMensagem("Preenche o email e a palavra-passe.");
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://privvcn.github.io/CN-Finance-Platform/"
    }
  });

  mostrarMensagem(
    error ? error.message : "Conta criada! Confirma o teu email."
  );
}

async function entrar() {
  const email = emailInput.value.trim();
  const password = senhaInput.value;

  if (!email || !password) {
    mostrarMensagem("Preenche o email e a palavra-passe.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    mostrarMensagem(error.message);
    return;
  }

  mostrarMensagem("Sessão iniciada!");
}

async function sair() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    mostrarMensagem(error.message);
  }
}

botaoRegistar?.addEventListener("click", registar);
botaoEntrar?.addEventListener("click", entrar);
botaoSair?.addEventListener("click", sair);
botaoAdicionar?.addEventListener("click", adicionarMovimento);

supabaseClient.auth.onAuthStateChange(async (event, session) => {
  utilizadorAtual = session?.user || null;
  atualizarAcesso();

  if (utilizadorAtual) {
    await carregarMovimentos();
  }
});

async function iniciarAplicacao() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    mostrarMensagem("Erro ao verificar sessão.");
    console.error(error);
    return;
  }

  utilizadorAtual = data.session?.user || null;
  atualizarAcesso();

  if (utilizadorAtual) {
    await carregarMovimentos();
  }
}

iniciarAplicacao();
