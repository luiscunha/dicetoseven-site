/*
 * O idioma da página, escolhido como no jogo: pela língua do dispositivo, e em
 * inglês quando ela não é nenhuma das quatro. Um `?lang=` no endereço ganha a
 * tudo — é o que os botões de idioma escrevem, e o que os links entre páginas
 * levam consigo.
 *
 * Cada página tem o texto nos quatro idiomas, em blocos `[data-idioma]`. Sem
 * JavaScript, aparecem os quatro, um a seguir ao outro: lê-se na mesma.
 */
(() => {
  const IDIOMAS = { pt: "pt-PT", en: "en-GB", es: "es-ES", fr: "fr-FR" };

  const pedido = new URLSearchParams(location.search).get("lang");
  const doSistema = (navigator.languages ?? [navigator.language])
    .map((l) => String(l).slice(0, 2).toLowerCase())
    .find((l) => l in IDIOMAS);
  const idioma = pedido !== null && pedido in IDIOMAS ? pedido : (doSistema ?? "en");

  document.documentElement.lang = IDIOMAS[idioma];

  for (const bloco of document.querySelectorAll("[data-idioma]")) {
    bloco.hidden = bloco.dataset.idioma !== idioma;
  }

  const titulo = document.querySelector(`[data-idioma="${idioma}"][data-titulo]`);
  if (titulo !== null) document.title = titulo.dataset.titulo;

  for (const a of document.querySelectorAll(".idiomas a")) {
    a.setAttribute("aria-current", String(a.dataset.para === idioma));
  }

  // Mudar de página não muda de idioma.
  for (const a of document.querySelectorAll("a[data-pagina]")) {
    a.search = `?lang=${idioma}`;
  }
})();
