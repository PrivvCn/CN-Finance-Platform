
const SUPABASE_URL = "https://zmjahwuaqkddbkbrqkdw.supabase.co";
const SUPABASE_KEY = "sb_publishable_xDCWQlrTKc0arXNQhqKqUw_u4A325XP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Elementos da página
const acesso = document.getElementById("acesso");
const painel = document.getElementById("painelFinanceiro");

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const mensagemAcesso = document.getElementById("mensagemAcesso");

const descricaoInput = document.getElementById("descricao");
const tipoInput = document.getElementById("tipo");
const valorInput = document.getElementById("valor");

const saldoElemento = document.getElementById("resultado");
const situacaoElemento = document.getElementById("situacao");
const receitasElemento = document.getElementById("totalReceitas");
const despesasElemento = document.getElementById("totalDespesas");
const historicoElemento = document.getElementById("historico");

let utilizadorAtual = null;
let movimentos = [];

function mensagem(texto) {
  mensagemAcesso.textContent = texto;
}

function atualizarInterface() {
  const autenticado = Boolean(utilizadorAtual);

  acesso.hidden = autenticado;
  painel.hidden = !autenticado;
}

function formatarValor(valor) {
  return Number(valor).toLocaleString("pt-MZ", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " MT";
}

// Registar conta
async function registar() {
  const email = emailInput.value.trim();
  const password = senhaInput.value;

  if (!email || !password) {
    mensagem("Preenche o email e a palavra-passe.");
    return;
  }

  if (password.length < 6) {
    mensagem("A palavra-passe deve ter pelo menos 6 caracteres.");
    return;
  }

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo:
        "https://privvcn.github.io/CN-Finance-Platform/"
    }
  });

  if (error) {
    mensagem(error.message);
  } else {
    mensagem("Conta criada! Confirma o teu email.");
  }
}

// Iniciar sessão
async function entrar() {
  const email = emailInput.value.trim();
  const password = senhaInput.value;

  if (!email || !password) {
    mensagem("Preenche o email e a palavra-passe.");
    return;
  }

  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    mensagem(error.message);
  }
}

// Terminar sessão
async function sair() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    mensagem(error.message);
  }
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
    console.error(error);
    alert("Erro ao carregar os movimentos.");
    return;
  }

  movimentos = data || [];
  atualizarResumo();
}

// Atualizar saldo e histórico
function atualizarResumo() {
  const receitas = movimentos
    .filter(m => m.tipo === "receita")
    .reduce((soma, m) => soma + Number(m.valor), 0);

  const despesas = movimentos
    .filter(m => m.tipo === "despesa")
    .reduce((soma, m) => soma + Number(m.valor), 0);

  const saldo = receitas - despesas;

  saldoElemento.textContent = formatarValor(saldo);
  receitasElemento.textContent = formatarValor(receitas);
  despesasElemento.textContent = formatarValor(despesas);

  situacaoElemento.textContent =
    saldo > 0 ? "Lucro" :
    saldo < 0 ? "Prejuízo" : "Equilíbrio";

  historicoElemento.innerHTML = "";

  if (movimentos.length === 0) {
    historicoElemento.innerHTML =
      "<li>Ainda não existem movimentos.</li>";
    return;
  }

  movimentos.forEach(m => {
    const item = document.createElement("li");
    const texto = document.createElement("span");

    texto.textContent =
      `${m.descricao} — ${m.tipo} — ${formatarValor(m.valor)} `;

    const editar = document.createElement("button");
    editar.textContent = "Editar";
    editar.type = "button";
    editar.onclick = () => editarMovimento(m);

    const eliminar = document.createElement("button");
    eliminar.textContent = "Eliminar";
    eliminar.type = "button";
    eliminar.onclick = () => eliminarMovimento(m.id);

    item.append(texto, editar, eliminar);
    historicoElemento.appendChild(item);
  });
}

// Adicionar movimento
async function adicionarMovimento() {
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
    console.error(error);
    alert("Erro ao adicionar movimento.");
    return;
  }

  descricaoInput.value = "";
  valorInput.value = "";

  await carregarMovimentos();
}

// Editar movimento
async function editarMovimento(m) {
  const descricao = prompt("Nova descrição:", m.descricao);
  if (descricao === null) return;

  const valorTexto = prompt("Novo valor:", m.valor);
  if (valorTexto === null) return;

  const valor = Number(valorTexto);

  if (!descricao.trim() || !Number.isFinite(valor) || valor <= 0) {
    alert("Dados inválidos.");
    return;
  }

  const { error } = await supabaseClient
    .from("movimentos")
    .update({
      descricao: descricao.trim(),
      valor
    })
    .eq("id", m.id)
    .eq("user_id", utilizadorAtual.id);

  if (error) {
    console.error(error);
    alert("Erro ao editar movimento.");
    return;
  }

  await carregarMovimentos();
}

// Eliminar movimento
async function eliminarMovimento(id) {
  if (!confirm("Queres mesmo eliminar este movimento?")) return;

  const { error } = await supabaseClient
    .from("movimentos")
    .delete()
    .eq("id", id)
    .eq("user_id", utilizadorAtual.id);

  if (error) {
    console.error(error);
    alert("Erro ao eliminar movimento.");
    return;
  }

  await carregarMovimentos();
}

// Eventos dos botões
document.getElementById("registar").addEventListener("click", registar);
document.getElementById("entrar").addEventListener("click", entrar);
document.getElementById("sair").addEventListener("click", sair);
document.getElementById("adicionar").addEventListener("click", adicionarMovimento);

// Acompanhar alterações da sessão
supabaseClient.auth.onAuthStateChange((event, session) => {
  utilizadorAtual = session?.user || null;
  atualizarInterface();

  if (utilizadorAtual) {
    carregarMovimentos();
  } else {
    movimentos = [];
    atualizarResumo();
  }
});

// Verificar sessão ao abrir o site
async function iniciarAplicacao() {
  atualizarInterface();

  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(error);
    mensagem("Não foi possível verificar a sessão.");
    return;
  }

  utilizadorAtual = data.session?.user || null;
  atualizarInterface();

  if (utilizadorAtual) {
    await carregarMovimentos();
  }
}

iniciarAplicacao();
