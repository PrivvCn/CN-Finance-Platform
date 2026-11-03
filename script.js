
// =====================================
// CONFIGURAÇÃO DO SUPABASE
// =====================================

const SUPABASE_URL = "https://zmjahwuaqkddbkbrqkdw.supabase.co";
const SUPABASE_KEY = "sb_publishable_xDCWQlrTKc0arXNQhqKqUw_u4A325XP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// =====================================
// ELEMENTOS DA PÁGINA
// =====================================

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

const dashSaldo = document.getElementById("dashSaldo");
const dashReceitas = document.getElementById("dashReceitas");
const dashDespesas = document.getElementById("dashDespesas");

const mesAtualElemento = document.getElementById("mesAtual");
const mesReceitasElemento = document.getElementById("mesReceitas");
const mesDespesasElemento = document.getElementById("mesDespesas");
const mesResultadoElemento = document.getElementById("mesResultado");

const grafico = document.getElementById("graficoFinanceiro");
const mensagemGrafico = document.getElementById("mensagemGrafico");

let utilizadorAtual = null;
let movimentos = [];

// =====================================
// FUNÇÕES GERAIS
// =====================================

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

function obterTotais(lista) {
  const receitas = lista
    .filter(m => m.tipo === "receita")
    .reduce((soma, m) => soma + Number(m.valor), 0);

  const despesas = lista
    .filter(m => m.tipo === "despesa")
    .reduce((soma, m) => soma + Number(m.valor), 0);

  return {
    receitas,
    despesas,
    saldo: receitas - despesas
  };
}

// =====================================
// CRIAR CONTA
// =====================================

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

// =====================================
// INICIAR SESSÃO
// =====================================

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

// =====================================
// TERMINAR SESSÃO
// =====================================

async function sair() {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    mensagem(error.message);
  }
}

// =====================================
// CARREGAR MOVIMENTOS
// =====================================

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

// =====================================
// ATUALIZAR RESUMO FINANCEIRO
// =====================================

function atualizarResumo() {
  const totais = obterTotais(movimentos);

  saldoElemento.textContent = formatarValor(totais.saldo);
  receitasElemento.textContent = formatarValor(totais.receitas);
  despesasElemento.textContent = formatarValor(totais.despesas);

  dashSaldo.textContent = formatarValor(totais.saldo);
  dashReceitas.textContent = formatarValor(totais.receitas);
  dashDespesas.textContent = formatarValor(totais.despesas);

  situacaoElemento.textContent =
    totais.saldo > 0 ? "Lucro" :
    totais.saldo < 0 ? "Prejuízo" :
    "Equilíbrio";

  atualizarResumoMensal();
  desenharGrafico(totais.receitas, totais.despesas);
  atualizarHistorico();
}

// =====================================
// RESUMO DO MÊS ATUAL
// =====================================

function atualizarResumoMensal() {
  const agora = new Date();

  const inicioMes = new Date(
    agora.getFullYear(),
    agora.getMonth(),
    1
  );

  const proximoMes = new Date(
    agora.getFullYear(),
    agora.getMonth() + 1,
    1
  );

  const movimentosDoMes = movimentos.filter(m => {
    const data = new Date(m.created_at);
    return data >= inicioMes && data < proximoMes;
  });

  const totais = obterTotais(movimentosDoMes);

  mesAtualElemento.textContent = agora.toLocaleDateString("pt-MZ", {
    month: "long",
    year: "numeric"
  });

  mesReceitasElemento.textContent = formatarValor(totais.receitas);
  mesDespesasElemento.textContent = formatarValor(totais.despesas);
  mesResultadoElemento.textContent = formatarValor(totais.saldo);
}

// =====================================
// GRÁFICO FINANCEIRO
// =====================================

function desenharGrafico(receitas, despesas) {
  const contexto = grafico.getContext("2d");

  const largura = grafico.clientWidth || 500;
  const altura = 250;
  const escala = window.devicePixelRatio || 1;

  grafico.width = largura * escala;
  grafico.height = altura * escala;

  contexto.setTransform(escala, 0, 0, escala, 0, 0);
  contexto.clearRect(0, 0, largura, altura);

  if (receitas === 0 && despesas === 0) {
    mensagemGrafico.textContent =
      "Adiciona movimentos para visualizar o gráfico.";
    return;
  }

  mensagemGrafico.textContent =
    "Valores acumulados de todos os movimentos.";

  const maximo = Math.max(receitas, despesas, 1);
  const alturaMaxima = 150;
  const base = 190;
  const larguraBarra = Math.min(75, largura / 5);

  const itens = [
    {
      nome: "Receitas",
      valor: receitas,
      cor: "#d7b46a",
      x: largura * 0.30
    },
    {
      nome: "Despesas",
      valor: despesas,
      cor: "#263f65",
      x: largura * 0.70
    }
  ];

  contexto.font = "13px Arial";
  contexto.textAlign = "center";

  itens.forEach(item => {
    const alturaBarra = (item.valor / maximo) * alturaMaxima;
    const x = item.x - larguraBarra / 2;
    const y = base - alturaBarra;

    contexto.fillStyle = item.cor;
    contexto.fillRect(x, y, larguraBarra, alturaBarra);

    contexto.fillStyle = "#142541";
    contexto.fillText(
      item.valor.toLocaleString("pt-MZ", {
        maximumFractionDigits: 0
      }),
      item.x,
      Math.max(y - 10, 15)
    );

    contexto.fillText(item.nome, item.x, 220);
  });
}

// =====================================
// HISTÓRICO
// =====================================

function atualizarHistorico() {
  historicoElemento.innerHTML = "";

  if (movimentos.length === 0) {
    historicoElemento.innerHTML =
      "<li>Ainda não existem movimentos.</li>";
    return;
  }

  movimentos.forEach(m => {
    const item = document.createElement("li");
    const texto = document.createElement("span");

    const tipoTexto =
      m.tipo === "receita" ? "Receita" : "Despesa";

    texto.textContent =
      `${m.descricao} — ${tipoTexto} — ${formatarValor(m.valor)}`;

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

// =====================================
// ADICIONAR MOVIMENTO
// =====================================

async function adicionarMovimento() {
  if (!utilizadorAtual) {
    alert("Inicia sessão primeiro.");
    return;
  }

  const descricao = descricaoInput.value.trim();
  const tipo = tipoInput.value;
  const valor = Number(valorInput.value);

  if (!descricao || !Number.isFinite(valor) || valor <= 0) {
    alert("Preenche correctamente todos os campos.");
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

// =====================================
// EDITAR MOVIMENTO
// =====================================

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

// =====================================
// ELIMINAR MOVIMENTO
// =====================================

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

// =====================================
// EVENTOS DOS BOTÕES
// =====================================

document.getElementById("registar")
  .addEventListener("click", registar);

document.getElementById("entrar")
  .addEventListener("click", entrar);

document.getElementById("sair")
  .addEventListener("click", sair);

document.getElementById("adicionar")
  .addEventListener("click", adicionarMovimento);

// =====================================
// ACOMPANHAR SESSÃO
// =====================================

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

// =====================================
// VERIFICAR SESSÃO AO ABRIR O SITE
// =====================================

async function iniciarAplicacao() {
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

// =====================================
// ACTUALIZAR GRÁFICO AO REDIMENSIONAR
// =====================================

window.addEventListener("resize", () => {
  if (!painel.hidden) {
    const totais = obterTotais(movimentos);
    desenharGrafico(totais.receitas, totais.despesas);
  }
});

