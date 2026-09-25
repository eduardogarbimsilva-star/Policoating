/*
 * CATÁLOGO DE PRODUTOS
 * Para adicionar um produto, copie um bloco { ... } e altere os campos.
 *  - id:          identificador único (sem espaços)
 *  - categoria:   deve ser uma das chaves de CATEGORIAS abaixo
 *  - embalagens:  tamanhos disponíveis para o cliente escolher
 *  - cores:       cores disponíveis (nome + código hexadecimal)
 *  - preco:       opcional. Se informado, é exibido; senão aparece "Sob consulta"
 *  - destaque:    true para aparecer na página inicial
 */
window.CATEGORIAS = {
  imobiliaria: { nome: "Imobiliária", descricao: "Paredes internas e externas, tetos e fachadas.", icone: "🏠" },
  industrial: { nome: "Industrial", descricao: "Proteção anticorrosiva e alta performance para indústria.", icone: "🏭" },
  automotiva: { nome: "Automotiva", descricao: "Primers, bases e vernizes para repintura automotiva.", icone: "🚗" },
  madeira: { nome: "Madeiras", descricao: "Vernizes, stains e seladoras para madeira.", icone: "🪵" },
  impermeabilizante: { nome: "Impermeabilizantes", descricao: "Lajes, telhados e áreas molhadas protegidas.", icone: "💧" },
  complementos: { nome: "Complementos", descricao: "Massas, seladores, solventes e acessórios.", icone: "🧰" }
};

window.PRODUTOS = [
  {
    id: "acrilica-premium-fosca",
    nome: "Acrílica Premium Fosca",
    categoria: "imobiliaria",
    linha: "Linha Premium",
    descricao: "Tinta acrílica de alta cobertura e acabamento fosco aveludado. Ideal para ambientes internos e externos, resistente a chuva e ao sol.",
    rendimento: "Até 380 m² por demão (18 L)",
    secagem: "Ao toque: 30 min | Entre demãos: 4 h",
    embalagens: ["800 ml", "3,6 L", "18 L"],
    cores: [
      { nome: "Branco Neve", hex: "#FAFAF7" },
      { nome: "Gelo", hex: "#E9ECEC" },
      { nome: "Areia", hex: "#D9C7A7" },
      { nome: "Azul Sereno", hex: "#8FB3D9" },
      { nome: "Verde Oliva", hex: "#8A9A5B" },
      { nome: "Terracota", hex: "#C0673E" }
    ],
    destaque: true
  },
  {
    id: "acrilica-semibrilho",
    nome: "Acrílica Semibrilho Lavável",
    categoria: "imobiliaria",
    linha: "Linha Premium",
    descricao: "Acabamento acetinado de fácil limpeza. Perfeita para cozinhas, banheiros, corredores e áreas de grande circulação.",
    rendimento: "Até 350 m² por demão (18 L)",
    secagem: "Ao toque: 1 h | Entre demãos: 4 h",
    embalagens: ["800 ml", "3,6 L", "18 L"],
    cores: [
      { nome: "Branco", hex: "#FFFFFF" },
      { nome: "Palha", hex: "#EFE3C4" },
      { nome: "Cinza Urbano", hex: "#9EA3A6" },
      { nome: "Azul Petróleo", hex: "#1F5F6B" },
      { nome: "Amarelo Canário", hex: "#F2C94C" }
    ],
    destaque: true
  },
  {
    id: "latex-pva-economica",
    nome: "Látex PVA Econômica",
    categoria: "imobiliaria",
    linha: "Linha Standard",
    descricao: "Tinta látex para ambientes internos com ótimo custo-benefício. Boa cobertura e secagem rápida.",
    rendimento: "Até 250 m² por demão (18 L)",
    secagem: "Ao toque: 30 min | Entre demãos: 2 h",
    embalagens: ["3,6 L", "18 L"],
    cores: [
      { nome: "Branco", hex: "#FFFFFF" },
      { nome: "Pérola", hex: "#F1EBDD" },
      { nome: "Pêssego", hex: "#F6C9A8" },
      { nome: "Verde Água", hex: "#BFE3D7" }
    ]
  },
  {
    id: "textura-acrilica",
    nome: "Textura Acrílica Rústica",
    categoria: "imobiliaria",
    linha: "Linha Decor",
    descricao: "Revestimento texturizado que disfarça imperfeições e dá personalidade a fachadas e muros.",
    rendimento: "1,5 a 2,5 kg/m²",
    secagem: "Ao toque: 2 h | Total: 24 h",
    embalagens: ["25 kg"],
    cores: [
      { nome: "Branco", hex: "#F7F7F2" },
      { nome: "Camurça", hex: "#C9A97E" },
      { nome: "Grafite", hex: "#4A4E52" },
      { nome: "Concreto", hex: "#A7A39B" }
    ]
  },
  {
    id: "esmalte-sintetico",
    nome: "Esmalte Sintético Alto Brilho",
    categoria: "industrial",
    linha: "Linha Metal & Madeira",
    descricao: "Esmalte de alta durabilidade para metais e madeiras. Acabamento brilhante, resistente a intempéries.",
    rendimento: "Até 60 m² por demão (3,6 L)",
    secagem: "Ao toque: 4 h | Entre demãos: 12 h",
    embalagens: ["225 ml", "900 ml", "3,6 L"],
    cores: [
      { nome: "Preto", hex: "#1A1A1A" },
      { nome: "Branco", hex: "#FFFFFF" },
      { nome: "Vermelho", hex: "#C62828" },
      { nome: "Azul França", hex: "#1E4FA0" },
      { nome: "Verde Colonial", hex: "#1F5E3A" },
      { nome: "Cinza Platina", hex: "#B9BCBF" }
    ],
    destaque: true
  },
  {
    id: "epoxi-bicomponente",
    nome: "Epóxi Bicomponente",
    categoria: "industrial",
    linha: "Linha Industrial HD",
    descricao: "Revestimento epóxi de alta resistência química e à abrasão para pisos industriais, tanques e estruturas.",
    rendimento: "6 a 8 m²/L por demão",
    secagem: "Ao toque: 3 h | Cura total: 7 dias",
    embalagens: ["Kit 3,6 L", "Kit 18 L"],
    cores: [
      { nome: "Cinza Médio", hex: "#8C9093" },
      { nome: "Verde Segurança", hex: "#2E7D32" },
      { nome: "Amarelo Segurança", hex: "#F9C21A" },
      { nome: "Azul Segurança", hex: "#1565C0" }
    ],
    destaque: true
  },
  {
    id: "pu-alifatico",
    nome: "Poliuretano Alifático",
    categoria: "industrial",
    linha: "Linha Industrial HD",
    descricao: "Acabamento PU com excelente retenção de cor e brilho, indicado para estruturas metálicas expostas ao UV.",
    rendimento: "8 a 10 m²/L por demão",
    secagem: "Ao toque: 1 h | Manuseio: 8 h",
    embalagens: ["Kit 3,6 L", "Kit 18 L"],
    cores: [
      { nome: "Azul WEG", hex: "#00579D" },
      { nome: "Branco", hex: "#FFFFFF" },
      { nome: "Laranja Segurança", hex: "#EF6C00" },
      { nome: "Cinza Munsell N6.5", hex: "#9C9E9F" }
    ]
  },
  {
    id: "primer-anticorrosivo",
    nome: "Primer Anticorrosivo Zarcão",
    categoria: "industrial",
    linha: "Linha Metal & Madeira",
    descricao: "Fundo anticorrosivo que protege superfícies ferrosas contra ferrugem e melhora a aderência do acabamento.",
    rendimento: "Até 40 m² por demão (3,6 L)",
    secagem: "Ao toque: 1 h | Entre demãos: 6 h",
    embalagens: ["900 ml", "3,6 L", "18 L"],
    cores: [
      { nome: "Óxido Vermelho", hex: "#9A3B26" },
      { nome: "Cinza", hex: "#7D8184" }
    ]
  },
  {
    id: "alta-temperatura",
    nome: "Tinta Alta Temperatura 600°C",
    categoria: "industrial",
    linha: "Linha Especial",
    descricao: "Resiste a até 600 °C. Para escapamentos, churrasqueiras, fornos, caldeiras e motores.",
    rendimento: "Até 12 m²/L",
    secagem: "Ao toque: 30 min | Cura com calor",
    embalagens: ["300 ml (spray)", "900 ml", "3,6 L"],
    cores: [
      { nome: "Preto Fosco", hex: "#222222" },
      { nome: "Alumínio", hex: "#C4C7C9" }
    ]
  },
  {
    id: "primer-pu-automotivo",
    nome: "Primer PU Automotivo",
    categoria: "automotiva",
    linha: "Linha Auto Pro",
    descricao: "Primer de alto enchimento e fácil lixamento para repintura automotiva profissional.",
    rendimento: "Até 8 m²/L",
    secagem: "Lixamento: 3 h a 25 °C",
    embalagens: ["900 ml", "3,6 L"],
    cores: [
      { nome: "Cinza Claro", hex: "#BDBFC1" },
      { nome: "Cinza Escuro", hex: "#5C5F62" }
    ]
  },
  {
    id: "verniz-automotivo",
    nome: "Verniz Automotivo HS",
    categoria: "automotiva",
    linha: "Linha Auto Pro",
    descricao: "Verniz de alto sólidos com brilho profundo, alta dureza e resistência a riscos e raios UV.",
    rendimento: "Até 10 m²/L",
    secagem: "Manuseio: 6 h | Estufa: 30 min a 60 °C",
    embalagens: ["Kit 900 ml", "Kit 5 L"],
    cores: [{ nome: "Incolor", hex: "#F3EFE2" }],
    destaque: true
  },
  {
    id: "verniz-maritimo",
    nome: "Verniz Marítimo Filtro Solar",
    categoria: "madeira",
    linha: "Linha Madeira",
    descricao: "Protege madeiras externas e internas contra sol, chuva e maresia. Com filtro solar e ação fungicida.",
    rendimento: "Até 50 m² por demão (3,6 L)",
    secagem: "Ao toque: 4 h | Entre demãos: 8 h",
    embalagens: ["900 ml", "3,6 L"],
    cores: [
      { nome: "Natural", hex: "#E3C28D" },
      { nome: "Mogno", hex: "#6E2F1A" },
      { nome: "Imbuia", hex: "#4A2E1F" },
      { nome: "Cedro", hex: "#A55A2A" }
    ],
    destaque: true
  },
  {
    id: "stain-impregnante",
    nome: "Stain Impregnante",
    categoria: "madeira",
    linha: "Linha Madeira",
    descricao: "Penetra nos poros da madeira sem formar película, realçando os veios naturais. Não descasca.",
    rendimento: "Até 12 m²/L",
    secagem: "Ao toque: 2 h | Entre demãos: 6 h",
    embalagens: ["900 ml", "3,6 L"],
    cores: [
      { nome: "Transparente", hex: "#E9D8B4" },
      { nome: "Castanho", hex: "#7B4A2A" },
      { nome: "Ipê", hex: "#5B3A24" }
    ]
  },
  {
    id: "manta-liquida",
    nome: "Manta Líquida Acrílica",
    categoria: "impermeabilizante",
    linha: "Linha Proteção",
    descricao: "Impermeabilizante elástico pronto para uso. Forma uma membrana contínua sobre lajes, telhados e marquises.",
    rendimento: "1 L/m² (3 a 4 demãos)",
    secagem: "Entre demãos: 4 h | Total: 72 h",
    embalagens: ["4 kg", "12 kg", "18 kg"],
    cores: [
      { nome: "Branco", hex: "#FFFFFF" },
      { nome: "Cinza", hex: "#9FA3A6" },
      { nome: "Cerâmica", hex: "#B5522E" }
    ],
    destaque: true
  },
  {
    id: "massa-corrida",
    nome: "Massa Corrida PVA",
    categoria: "complementos",
    linha: "Linha Preparação",
    descricao: "Nivela e corrige imperfeições de paredes internas, deixando a superfície lisa para a pintura.",
    rendimento: "2 a 3 m²/kg",
    secagem: "Lixamento: 3 h",
    embalagens: ["1,4 kg", "5,8 kg", "25 kg"],
    cores: [{ nome: "Branco", hex: "#F7F6F1" }]
  },
  {
    id: "selador-acrilico",
    nome: "Selador Acrílico Pigmentado",
    categoria: "complementos",
    linha: "Linha Preparação",
    descricao: "Uniformiza a absorção de superfícies novas de reboco, economizando tinta no acabamento.",
    rendimento: "Até 100 m² por demão (18 L)",
    secagem: "Ao toque: 30 min | Total: 4 h",
    embalagens: ["3,6 L", "18 L"],
    cores: [{ nome: "Branco", hex: "#FAFAF5" }]
  },
  {
    id: "kit-pintura",
    nome: "Kit Pintura Profissional",
    categoria: "complementos",
    linha: "Acessórios",
    descricao: "Rolo de lã 23 cm, trincha 2\", bandeja, fita crepe e lixa. Tudo o que você precisa para começar.",
    rendimento: "—",
    secagem: "—",
    embalagens: ["Kit"],
    cores: [{ nome: "Padrão", hex: "#00579D" }]
  }
];
