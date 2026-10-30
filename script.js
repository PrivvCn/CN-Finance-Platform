
const SUPABASE_URL = "https://zmjahwuaqkddbkbrqkdw.supabase.co/rest/v1/";
const SUPABASE_KEY = "sb_publishable_xDCWQlrTKc0arXNQhqKqUw_u4A325XP";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

const descricaoInput = document.getElementById("descricao");
const tipoInput = document.getElementById("tipo");
const valorInput = document.getElementById("valor");
const botaoAdicionar = document.getElementById("adicionar");

const resultadoTexto = document.getElementById("resultado");
const situacaoTexto = document.getElementById("situacao");
const totalReceitasTexto = document.getElementById("totalReceitas");
const totalDespesasTexto = document.getElementById("totalDespesas");
const historicoLista = document.getElementById("historico");

let movimentos = [];

try {
  movimentos = JSON.parse(localStorage.getItem("cnMovimentos") || "[]");

  if (!Array.isArray(movimentos)) {
    movimentos = [];
  }
} catch (erro) {
  movimentos = [];
}

function formatarMT(valor) {
  return valor.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }) + " MT";
}

botaoAdicionar.addEventListener("click", function () {
  const descricao = descricaoInput.value.trim();
  const tipo = tipoInput.value;
  const valor = Number(valorInput.value);

  if (descricao === "") {
    situacaoTexto.textContent = "Introduz a descrição do movimento.";
    return;
  }

  if (valorInput.value.trim() === "" ||
      !Number.isFinite(valor) || valor <= 0) {
    situacaoTexto.textContent = "Introduz um valor maior que zero.";
    return;
  }

  movimentos.push({ descricao, tipo, valor });

  try {
    localStorage.setItem("cnMovimentos", JSON.stringify(movimentos));
  } catch (erro) {
    movimentos.pop();
    situacaoTexto.textContent = "Não foi possível guardar os movimentos.";
    return;
  }

  atualizarResumo();

  descricaoInput.value = "";
  valorInput.value = "";
  descricaoInput.focus();
});

function atualizarResumo() {
  let receitas = 0;
  let despesas = 0;

  historicoLista.replaceChildren();

  movimentos.forEach(function (movimento, index) {
    const item = document.createElement("li");
    const sinal = movimento.tipo === "receita" ? "+" : "-";

    const texto = document.createElement("span");
    texto.textContent =
      movimento.descricao + " — " +
      movimento.tipo + ": " +
      sinal + formatarMT(movimento.valor);

    const botaoEditar = document.createElement("button");
    botaoEditar.textContent = "Editar";
    botaoEditar.type = "button";
    botaoEditar.style.width = "auto";

    botaoEditar.addEventListener("click", function () {
      const novaDescricao = prompt("Nova descrição:", movimento.descricao);
      if (novaDescricao === null) return;

      const descricaoLimpa = novaDescricao.trim();
      if (descricaoLimpa === "") {
        alert("A descrição não pode ficar vazia.");
        return;
      }

      const novoTipo = prompt("Escreve receita ou despesa:", movimento.tipo);
      if (novoTipo === null) return;

      const tipoLimpo = novoTipo.trim().toLowerCase();
      if (tipoLimpo !== "receita" && tipoLimpo !== "despesa") {
        alert("Escreve receita ou despesa.");
        return;
      }

      const novoValorTexto = prompt("Novo valor em MT:", String(movimento.valor));
      if (novoValorTexto === null) return;

      const novoValor = Number(novoValorTexto);
      if (novoValorTexto.trim() === "" ||
          !Number.isFinite(novoValor) || novoValor <= 0) {
        alert("Introduz um valor maior que zero.");
        return;
      }

      const antigo = { ...movimento };

      movimento.descricao = descricaoLimpa;
      movimento.tipo = tipoLimpo;
      movimento.valor = novoValor;

      try {
        localStorage.setItem("cnMovimentos", JSON.stringify(movimentos));
      } catch (erro) {
        Object.assign(movimento, antigo);
        alert("Não foi possível guardar a alteração.");
        return;
      }

      atualizarResumo();
    });

    const botaoEliminar = document.createElement("button");
    botaoEliminar.textContent = "Eliminar";
    botaoEliminar.type = "button";
    botaoEliminar.style.width = "auto";

    botaoEliminar.addEventListener("click", function () {
      const confirmar = confirm(
        "Tens a certeza de que queres eliminar este movimento?"
      );

      if (!confirmar) return;

      movimentos.splice(index, 1);

      localStorage.setItem("cnMovimentos", JSON.stringify(movimentos));
      atualizarResumo();
    });

    item.appendChild(texto);
    item.appendChild(botaoEditar);
    item.appendChild(botaoEliminar);
    historicoLista.appendChild(item);

    if (movimento.tipo === "receita") {
      receitas += movimento.valor;
    } else {
      despesas += movimento.valor;
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

atualizarResumo();
