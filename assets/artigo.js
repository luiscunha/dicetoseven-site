/*
 * As figuras do artigo «Building puzzles backwards».
 *
 * Os tabuleiros estão na representação do motor: uma lista de colunas, cada uma
 * de baixo para cima. As regras que aqui se aplicam são as do jogo, reescritas
 * em poucas linhas para a página não depender do código do jogo — que é
 * privado. Só servem para desenhar: o nível da demonstração é um nível
 * verdadeiro, com a solução que ele traz guardada.
 *
 * Sem JavaScript, as figuras ficam vazias e as legendas explicam-nas.
 */
(() => {
  const PINTAS = {
    1: [5],
    2: [1, 9],
    3: [1, 5, 9],
    4: [1, 3, 7, 9],
    5: [1, 3, 5, 7, 9],
    6: [1, 3, 4, 6, 7, 9],
  };

  const coluna = (p) => p >> 6;
  const linha = (p) => p & 63;

  function novaPeca(v) {
    const el = document.createElement("span");
    el.className = "peca";
    el.dataset.v = String(v);
    for (let casa = 1; casa <= 9; casa++) {
      const pinta = document.createElement("i");
      if (!PINTAS[v].includes(casa)) pinta.style.visibility = "hidden";
      el.append(pinta);
    }
    return el;
  }

  function medidas(el) {
    const estilo = getComputedStyle(el);
    const lado = parseFloat(estilo.getPropertyValue("--lado"));
    const folga = parseFloat(estilo.getPropertyValue("--folga"));
    return { lado, passo: lado + folga, folga };
  }

  function porEm(peca, c, r, passo) {
    peca.style.transform = `translate(${c * passo}px, ${-r * passo}px)`;
  }

  /* ─── As figuras paradas ─────────────────────────────────────────────────── */

  /*
   * `data-tabuleiro` é o tabuleiro em JSON; `data-marcadas` e `data-fantasmas`
   * são listas de [coluna, linha]. Uma peça fantasma é desenhada onde se queria
   * pô-la, e não onde a gravidade a deixaria — é o que a figura quer mostrar.
   */
  for (const fig of document.querySelectorAll("[data-tabuleiro]")) {
    const tabuleiro = JSON.parse(fig.dataset.tabuleiro);
    const marcadas = JSON.parse(fig.dataset.marcadas ?? "[]");
    const fantasmas = JSON.parse(fig.dataset.fantasmas ?? "[]");
    const largura = Number(fig.dataset.largura ?? tabuleiro.length);
    const altura = Number(fig.dataset.altura ?? Math.max(...tabuleiro.map((c) => c.length)));
    const { lado, passo } = medidas(fig);

    fig.style.width = `${(largura - 1) * passo + lado}px`;
    fig.style.height = `${(altura - 1) * passo + lado}px`;

    const tem = (lista, c, r) => lista.some(([x, y]) => x === c && y === r);

    tabuleiro.forEach((col, c) => {
      col.forEach((v, r) => {
        if (v === null) return;
        const peca = novaPeca(v);
        if (tem(marcadas, c, r)) peca.classList.add("marcada");
        if (tem(fantasmas, c, r)) peca.classList.add("fantasma");
        porEm(peca, c, r, passo);
        fig.append(peca);
      });
    });
  }

  /* ─── A demonstração: construir de trás para a frente ───────────────────── */

  const demo = document.querySelector("[data-demo]");
  if (demo === null) return;

  const tabuleiro = JSON.parse(demo.dataset.demo);
  const solucao = JSON.parse(demo.dataset.solucao);
  const area = demo.querySelector(".tabuleiro");
  const legenda = demo.querySelector(".demo-legenda");
  const listaPassos = demo.querySelector(".demo-passos");
  const botoes = {
    tirar: demo.querySelector('[data-acao="tirar"]'),
    por: demo.querySelector('[data-acao="por"]'),
    tudo: demo.querySelector('[data-acao="tudo"]'),
  };

  /*
   * Cada peça leva um id, e os estados guardam ids em vez de valores. Assim a
   * mesma peça é o mesmo elemento em todos os estados, e mudar de estado é só
   * mudar-lhe a posição: a gravidade e o colapso animam-se pelo CSS.
   */
  let proximo = 0;
  const valor = [];
  const inicial = tabuleiro.map((col) =>
    col.map((v) => {
      valor[proximo] = v;
      return proximo++;
    }),
  );

  // estados[k] é o tabuleiro antes da jogada k; o último é o tabuleiro vazio.
  const estados = [inicial];
  const grupos = [];

  for (const g of solucao) {
    const atual = estados[estados.length - 1];
    const ids = g.map((p) => atual[coluna(p)][linha(p)]);
    grupos.push(ids);
    estados.push(
      atual.map((col) => col.filter((id) => !ids.includes(id))).filter((col) => col.length > 0),
    );
  }

  const n = solucao.length;
  const largura = inicial.length;
  const altura = Math.max(...inicial.map((col) => col.length));
  const { lado, passo } = medidas(area);
  area.style.width = `${(largura - 1) * passo + lado}px`;
  area.style.height = `${(altura - 1) * passo + lado}px`;

  // Onde está cada peça em cada estado; fora do tabuleiro, fica onde esteve por último.
  const onde = estados.map((estado) => {
    const m = new Map();
    estado.forEach((col, c) => col.forEach((id, r) => m.set(id, [c, r])));
    return m;
  });

  const ultimoSitio = new Map();
  for (const m of onde) for (const [id, pos] of m) ultimoSitio.set(id, pos);

  const pecas = valor.map((v) => {
    const el = novaPeca(v);
    area.append(el);
    return el;
  });

  // A ordem da construção é a da solução ao contrário.
  const somas = solucao.map((g, k) => grupos[k].map((id) => valor[id]).join(" + "));
  for (let t = 1; t <= n; t++) {
    const li = document.createElement("li");
    li.textContent = somas[n - t].replaceAll(" ", "");
    listaPassos.append(li);
  }

  // t é o número de grupos já inseridos: 0 é o tabuleiro vazio, n é o nível pronto.
  // Começa no nível pronto: uma figura vazia à chegada não diz nada.
  let t = n;
  let inicio = true;
  // +1 a construir, -1 a jogar a solução: só muda o que a legenda conta.
  let sentido = 1;
  let relogio;

  function mostrar() {
    const k = n - t;
    const aqui = onde[k];
    const novo = t > 0 ? grupos[k] : [];

    pecas.forEach((el, id) => {
      const pos = aqui.get(id) ?? ultimoSitio.get(id);
      porEm(el, pos[0], pos[1], passo);
      el.classList.toggle("fora", !aqui.has(id));
      el.classList.toggle("marcada", novo.includes(id));
    });

    [...listaPassos.children].forEach((li, i) => {
      li.classList.toggle("feito", i < t - 1);
      li.classList.toggle("agora", i === t - 1);
    });

    // O grupo com o anel é o último que se inseriu — e, por isso mesmo, o próximo a sair.
    if (inicio) {
      legenda.textContent = `A real level, with the ${n} groups it was built from. Press “Solve it” to clear it with its stored solution.`;
    } else if (sentido > 0) {
      if (t === 0) legenda.textContent = "The empty board. The generator starts here.";
      else if (t === n) legenda.textContent = `Step ${t} of ${n}: inserted ${somas[k]}. This is the level as you get it.`;
      else legenda.textContent = `Step ${t} of ${n}: inserted ${somas[k]} = 7.`;
    } else {
      const jogada = n - t;
      if (t === 0) legenda.textContent = `Move ${jogada} of ${n}: cleared ${somas[k - 1]}. The board is empty again.`;
      else legenda.textContent = `Move ${jogada} of ${n}: cleared ${somas[k - 1]}. Next up: the ringed group, ${somas[k]}.`;
    }

    botoes.tirar.disabled = t === 0;
    botoes.por.disabled = t === n;
    botoes.tudo.textContent = t === n ? "Solve it" : "Build it";
  }

  function parar() {
    inicio = false;
    clearInterval(relogio);
    relogio = undefined;
  }

  botoes.por.addEventListener("click", () => {
    parar();
    sentido = 1;
    t = Math.min(n, t + 1);
    mostrar();
  });

  botoes.tirar.addEventListener("click", () => {
    parar();
    sentido = -1;
    t = Math.max(0, t - 1);
    mostrar();
  });

  // Constrói até ao fim, ou, com o nível pronto, joga a solução até o esvaziar.
  botoes.tudo.addEventListener("click", () => {
    parar();
    sentido = t === n ? -1 : 1;
    relogio = setInterval(() => {
      t += sentido;
      mostrar();
      if (t === 0 || t === n) parar();
    }, 850);
  });

  mostrar();
})();
