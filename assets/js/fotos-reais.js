/* =========================================================
   Policoating — Fotos reais de ambientes (casas, fachadas, indústria)
   Fotos do banco gratuito Pexels (licença livre para uso comercial).
   Para trocar por fotos próprias: use `src` com o caminho do arquivo,
   ex.: { src: "assets/img/galeria/minha-obra.jpg", cor: "preto", ... }
   ========================================================= */
(function () {
  "use strict";

  // Grupos de cor mostrados nos filtros (na ordem)
  const GRUPOS = [
    { id: "branco", nome: "Branco", hex: "#F1F0EA" },
    { id: "preto", nome: "Preto", hex: "#0E0E10" },
    { id: "cinza", nome: "Cinza e grafite", hex: "#474A50" },
    { id: "azul", nome: "Azul", hex: "#0E4C92" },
    { id: "amarelo", nome: "Amarelo", hex: "#F2A900" },
    { id: "verde", nome: "Verde", hex: "#114232" },
    { id: "vermelho", nome: "Vermelho", hex: "#A72920" },
    { id: "colorido", nome: "Coloridas", hex: "conic-gradient(#A72920,#F2A900,#57A639,#0E4C92,#A72920)" },
    { id: "industria", nome: "Indústria", hex: "#8D9296" }
  ];

  // pexels: código da foto no Pexels | produto/cor: tinta sugerida para o visual da foto
  const FOTOS = [
    { pexels: 1115804, cor: "branco", titulo: "Residência branca", texto: "Esquadrias e gradis em branco", produto: "poliester-brilhante", corProduto: "Branco Tráfego RAL 9016" },
    { pexels: 2525329, cor: "branco", titulo: "Casas brancas com gradil", texto: "Gradil metálico branco fosco", produto: "poliester-fosco", corProduto: "Branco RAL 9010" },
    { pexels: 280222, cor: "branco", titulo: "Casa branca e cinza", texto: "Acabamento acetinado branco", produto: "hibrida-acetinada", corProduto: "Branco RAL 9016" },
    { pexels: 698772, cor: "preto", titulo: "Portão preto", texto: "Portão de aço preto fosco", produto: "poliester-fosco", corProduto: "Preto RAL 9005" },
    { pexels: 13505706, cor: "preto", titulo: "Fachada com portão preto", texto: "Portão e grades pretos texturizados", produto: "texturizada-rugosa", corProduto: "Preto RAL 9005" },
    { pexels: 186077, cor: "cinza", titulo: "Casa azul e cinza", texto: "Esquadrias em cinza antracite", produto: "poliester-fosco", corProduto: "Cinza Antracite RAL 7016" },
    { pexels: 13589789, cor: "cinza", titulo: "Casa com portão cinza", texto: "Portão metálico grafite", produto: "poliester-fosco", corProduto: "Grafite RAL 7024" },
    { pexels: 4556051, cor: "azul", titulo: "Fachada azul", texto: "Janelas e detalhes em azul", produto: "poliester-brilhante", corProduto: "Azul Genciana RAL 5010" },
    { pexels: 2102587, cor: "amarelo", titulo: "Casa amarela", texto: "Detalhes metálicos em amarelo", produto: "poliester-brilhante", corProduto: "Amarelo Sinal RAL 1003" },
    { pexels: 2323079, cor: "amarelo", titulo: "Prédio amarelo", texto: "Fachada em tom amarelo", produto: "poliester-brilhante", corProduto: "Amarelo Sinal RAL 1003" },
    { pexels: 688336, cor: "verde", titulo: "Parede verde", texto: "Verde vivo em fachada", produto: "hibrida-brilhante", corProduto: "Verde RAL 6018" },
    { pexels: 4946986, cor: "verde", titulo: "Casa com porta verde", texto: "Porta e detalhes em verde", produto: "poliester-brilhante", corProduto: "Verde Musgo RAL 6005" },
    { pexels: 210538, cor: "vermelho", titulo: "Casa vermelha e preta", texto: "Vermelho intenso com preto", produto: "poliester-brilhante", corProduto: "Vermelho Fogo RAL 3000" },
    { pexels: 1029612, cor: "vermelho", titulo: "Fachada vermelha", texto: "Revestimento vermelho", produto: "poliester-brilhante", corProduto: "Vermelho Fogo RAL 3000" },
    { pexels: 6370162, cor: "colorido", titulo: "Rua de casas coloridas", texto: "Cada casa com uma cor", produto: "cor-especial", corProduto: "Cor a definir" },
    { pexels: 16215566, cor: "colorido", titulo: "Fachadas multicoloridas", texto: "Cores sob medida", produto: "cor-especial", corProduto: "Cor a definir" },
    { pexels: 31801216, cor: "colorido", titulo: "Casas coloridas", texto: "Paleta viva e alegre", produto: "cor-especial", corProduto: "Cor a definir" },
    { pexels: 11667731, cor: "industria", titulo: "Galpão com estrutura azul", texto: "Estrutura metálica protegida", produto: "epoxi-anticorrosivo", corProduto: "Azul Segurança RAL 5005" },
    { pexels: 236705, cor: "industria", titulo: "Estrutura metálica", texto: "Proteção anticorrosiva", produto: "primer-zinco", corProduto: "Cinza Zinco" },
    { pexels: 20954930, cor: "industria", titulo: "Fachada metálica", texto: "Acabamento metálico", produto: "metalica-prata", corProduto: "Prata RAL 9006" }
  ];

  function url(f, largura) {
    if (f.src) return f.src;
    return `https://images.pexels.com/photos/${f.pexels}/pexels-photo-${f.pexels}.jpeg?auto=compress&cs=tinysrgb&w=${largura || 800}`;
  }

  // Foto que não carregar some da tela, sem deixar imagem quebrada
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement) || !img.hasAttribute("data-foto-real")) return;
    const card = img.closest("[data-card-real]");
    const pai = card ? card.parentElement : null;
    if (card) card.remove(); else img.remove();
    document.dispatchEvent(new CustomEvent("foto-real-falhou", { detail: { src: img.getAttribute("src"), pai } }));
  }, true);

  window.FotosReais = { GRUPOS, FOTOS, url, credito: "Fotos ilustrativas: Pexels" };
})();
