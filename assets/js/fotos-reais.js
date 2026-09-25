/* =========================================================
   Policoating — Fotos reais de peças metálicas pintadas a pó
   Fotos do banco gratuito Pexels (licença livre para uso comercial).
   Para trocar por fotos próprias: use `src` com o caminho do arquivo,
   ex.: { src: "assets/img/galeria/portao-cliente.jpg", cor: "preto", ... }
   ========================================================= */
(function () {
  "use strict";

  // Grupos de cor mostrados nos filtros (na ordem)
  const GRUPOS = [
    { id: "preto", nome: "Preto", hex: "#0E0E10" },
    { id: "branco", nome: "Branco", hex: "#F1F0EA" },
    { id: "cinza", nome: "Cinza e grafite", hex: "#474A50" },
    { id: "azul", nome: "Azul", hex: "#0E4C92" },
    { id: "amarelo", nome: "Amarelo e laranja", hex: "#F2A900" },
    { id: "verde", nome: "Verde", hex: "#114232" },
    { id: "vermelho", nome: "Vermelho", hex: "#A72920" },
    { id: "metalico", nome: "Metálicos", hex: "linear-gradient(135deg,#8a8a8a,#e8e8e8 45%,#b08d43)" }
  ];

  // Só peças que são pintadas com tinta em pó (metal): portões, grades, esquadrias, móveis, rodas...
  // pexels: código da foto no Pexels | produto/corProduto: tinta indicada para o visual da peça
  const FOTOS = [
    { pexels: 698772, cor: "preto", titulo: "Portão de aço", texto: "Portões e grades", produto: "poliester-fosco", corProduto: "Preto RAL 9005" },
    { pexels: 4726, cor: "preto", titulo: "Grade ornamental", texto: "Gradis e cercas", produto: "texturizada-rugosa", corProduto: "Preto RAL 9005" },
    { pexels: 3392146, cor: "preto", titulo: "Esquadria de alumínio", texto: "Janelas e caixilhos", produto: "poliester-fosco", corProduto: "Preto RAL 9005" },
    { pexels: 17110820, cor: "preto", titulo: "Roda automotiva", texto: "Rodas e peças automotivas", produto: "poliester-brilhante", corProduto: "Preto Intenso RAL 9005" },
    { pexels: 18120179, cor: "branco", titulo: "Móveis de jardim", texto: "Mesas e cadeiras de metal", produto: "poliester-brilhante", corProduto: "Branco Tráfego RAL 9016" },
    { pexels: 13589789, cor: "cinza", titulo: "Portão residencial", texto: "Portões e grades", produto: "poliester-fosco", corProduto: "Grafite RAL 7024" },
    { pexels: 33706880, cor: "cinza", titulo: "Painéis elétricos", texto: "Quadros e gabinetes", produto: "epoxi-painel-eletrico", corProduto: "Cinza Claro RAL 7035" },
    { pexels: 11513526, cor: "azul", titulo: "Armários de aço", texto: "Armários e roupeiros", produto: "hibrida-brilhante", corProduto: "Azul Céu RAL 5015" },
    { pexels: 32726107, cor: "azul", titulo: "Rodas esportivas", texto: "Rodas e peças automotivas", produto: "poliester-brilhante", corProduto: "Azul Genciana RAL 5010" },
    { pexels: 11667731, cor: "azul", titulo: "Estrutura metálica", texto: "Vigas e estruturas", produto: "epoxi-anticorrosivo", corProduto: "Azul Segurança RAL 5005" },
    { pexels: 16091345, cor: "amarelo", titulo: "Corrimão industrial", texto: "Escadas e guarda-corpos", produto: "poliester-brilhante", corProduto: "Amarelo Sinal RAL 1003" },
    { pexels: 30625283, cor: "amarelo", titulo: "Estantes e carrinhos", texto: "Porta-paletes e carrinhos", produto: "epoxi-anticorrosivo", corProduto: "Laranja Segurança RAL 2004" },
    { pexels: 5671072, cor: "verde", titulo: "Cadeiras de metal", texto: "Mobiliário urbano", produto: "poliester-brilhante", corProduto: "Verde Musgo RAL 6005" },
    { pexels: 9333824, cor: "verde", titulo: "Banco de praça", texto: "Mobiliário urbano", produto: "poliester-brilhante", corProduto: "Verde Musgo RAL 6005" },
    { pexels: 8180445, cor: "verde", titulo: "Gradil", texto: "Cercas e alambrados", produto: "poliester-brilhante", corProduto: "Verde Musgo RAL 6005" },
    { pexels: 7930374, cor: "vermelho", titulo: "Quadro de bicicleta", texto: "Bicicletas e academia", produto: "poliester-brilhante", corProduto: "Vermelho Fogo RAL 3000" },
    { pexels: 2463380, cor: "vermelho", titulo: "Estrutura em aço", texto: "Estruturas e perfis", produto: "poliester-brilhante", corProduto: "Vermelho Fogo RAL 3000" },
    { pexels: 9648649, cor: "metalico", titulo: "Roda dourada", texto: "Efeitos metálicos", produto: "metalica-cobre", corProduto: "Ouro Velho" },
    { pexels: 20954930, cor: "metalico", titulo: "Fachada metálica", texto: "Painéis e revestimentos", produto: "metalica-prata", corProduto: "Prata RAL 9006" },
    { pexels: 236705, cor: "metalico", titulo: "Estrutura galvanizada", texto: "Proteção anticorrosiva", produto: "primer-zinco", corProduto: "Cinza Zinco" }
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
