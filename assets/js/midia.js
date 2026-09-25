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
  // categoria: "ambientes" (Fotos reais), "cores", "acabamentos" ou "aplicacoes"
  // Ex.: { src: "assets/img/galeria/portao-preto.jpg", titulo: "Portão em RAL 9005 fosco", categoria: "ambientes" }
  galeria: [
    { src: "assets/img/marca/estoque-ral.jpg", titulo: "Estoque por cor", descricao: "Tinta em pó organizada por código RAL", categoria: "ambientes" },
    { src: "assets/img/marca/esquadria-bronze.jpg", titulo: "Esquadria metálica", descricao: "Acabamento bronze em perfil de alumínio", categoria: "ambientes" },
    { src: "assets/img/marca/teste-impacto.jpg", titulo: "Teste de impacto", descricao: "Resistência da película a batidas", categoria: "ambientes" },
    { src: "assets/img/marca/painel-estufa.jpg", titulo: "Controle da estufa", descricao: "Temperatura de cura monitorada", categoria: "ambientes" },
    { src: "assets/img/marca/linha-fabrica.jpg", titulo: "Linha de pintura", descricao: "Cabine robotizada, transportador e estufa", categoria: "ambientes" },
    { src: "assets/img/marca/pecas-linha.jpg", titulo: "Peças acabadas", descricao: "Gradil, esquadria, banco metálico e painel", categoria: "ambientes" },
    { src: "assets/img/marca/alimentador-po.jpg", titulo: "Alimentação do pó", descricao: "Reservatório que envia o pó para a pistola", categoria: "ambientes" },
    { src: "assets/img/marca/estufa-cura.jpg", titulo: "Cura na estufa", descricao: "Peças no transportador dentro da estufa", categoria: "ambientes" },
    { src: "assets/img/marca/aplicacao-roda.jpg", titulo: "Aplicação em roda", descricao: "Cobertura uniforme em cabine de pintura", categoria: "ambientes" },
    { src: "assets/img/marca/inspecao-qualidade.jpg", titulo: "Controle de qualidade", descricao: "Medição da espessura da camada", categoria: "ambientes" },
    { src: "assets/img/marca/placas-acabamentos.jpg", titulo: "Acabamentos", descricao: "Fosco, brilhante, metálico e texturizado", categoria: "ambientes" },
    { src: "assets/img/marca/pecas-pintadas.jpg", titulo: "Peças pintadas", descricao: "Rodas, quadros e perfis", categoria: "ambientes" },
    { src: "assets/img/marca/aplicacao-pistola.jpg", titulo: "Aplicação eletrostática", descricao: "Pistola Policoating em cabine de pintura a pó", categoria: "ambientes" },
    { src: "assets/img/marca/potes-cores.jpg", titulo: "Cartela de cores Policoating", descricao: "Tinta em pó em várias cores e efeitos", categoria: "ambientes" },
    { src: "assets/img/marca/aplicacoes-metalicas.jpg", titulo: "Aplicações em ferragens", descricao: "Portões, grades, pergolados e esquadrias", categoria: "ambientes" },
    { src: "assets/img/marca/banner-policoating.jpg", titulo: "Policoating", descricao: "Tecnologia que reveste, qualidade que permanece", categoria: "ambientes" },
    { src: "assets/img/marca/caixa-policoating.jpg", titulo: "Embalagem", descricao: "Caixa de papelão Policoating", categoria: "ambientes" }
  ],

  // Vídeos da empresa: YouTube (só o código do vídeo) ou arquivo .mp4 próprio.
  // Ex.: { titulo: "Conheça nossa fábrica", youtube: "CODIGO_DO_VIDEO" }
  //      { titulo: "Aplicação na prática", arquivo: "assets/video/aplicacao.mp4", capa: "assets/img/capa-video.jpg" }
  videos: []
};
