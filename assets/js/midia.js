/*
 * FOTOS E VÍDEOS REAIS DA EMPRESA
 * Enquanto as listas estiverem vazias, o site usa ilustrações geradas automaticamente.
 * Coloque os arquivos em assets/img/... e assets/video/... e liste-os aqui.
 *
 * Foto por cor de produto: em produtos.js, adicione `foto` na cor, por exemplo:
 *   { nome: "Preto RAL 9005", hex: "#0E0E10", foto: "assets/img/produtos/poliester-preto.jpg" }
 */
window.MIDIA = {
  // true = usar as fotos reais dos produtos em assets/img/produtos/ (nomes em FOTOS.md).
  // Cores sem foto continuam com a imagem gerada automaticamente.
  fotosProdutos: false,

  // Fotos no fundo dos slides da página inicial (na ordem dos slides). Ex.:
  // slides: ["assets/img/slides/fabrica.jpg", "assets/img/slides/cores.jpg"],
  slides: [],

  // Fotos reais da galeria (aparecem antes das ilustrações).
  // categoria: "cores", "acabamentos" ou "aplicacoes"
  // Ex.: { src: "assets/img/galeria/portao-preto.jpg", titulo: "Portão em RAL 9005 fosco", categoria: "aplicacoes" }
  galeria: [],

  // Vídeos da empresa: YouTube (só o código do vídeo) ou arquivo .mp4 próprio.
  // Ex.: { titulo: "Conheça nossa fábrica", youtube: "CODIGO_DO_VIDEO" }
  //      { titulo: "Aplicação na prática", arquivo: "assets/video/aplicacao.mp4", capa: "assets/img/capa-video.jpg" }
  videos: []
};
