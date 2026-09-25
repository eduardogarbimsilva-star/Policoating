/*
 * CATÁLOGO DE PRODUTOS — Tinta eletrostática em pó
 * Para adicionar um produto, copie um bloco { ... } e altere os campos.
 *  - id:          identificador único (sem espaços)
 *  - categoria:   deve ser uma das chaves de CATEGORIAS abaixo
 *  - acabamento:  brilhante, semibrilho, fosco, texturizado, metálico...
 *  - embalagens:  tamanhos de caixa disponíveis para o cliente escolher
 *  - cores:       cores disponíveis (nome/código RAL + código hexadecimal)
 *  - densidade:   g/cm³ (usada pela calculadora de consumo)
 *  - preco:       opcional (por kg). Se informado, é exibido; senão aparece "Sob consulta"
 *  - destaque:    true para aparecer na página inicial
 */
window.CATEGORIAS = {
  // Informações técnicas usadas no carrossel "Tipos de tinta" e no guia "Qual pó usar?".
  // Notas de 1 a 5 (quanto maior, melhor).
  poliester: {
    nome: "Poliéster", descricao: "Uso externo, alta resistência ao sol e às intempéries.", icone: "☀️", cor: "#1558d6",
    ideal: "Portões, grades, esquadrias, fachadas e mobiliário urbano",
    uso: "Externo e interno", cura: "10 min a 200 °C",
    notas: { sol: 5, quimica: 3, corrosao: 4 }, acabamentos: ["Brilhante", "Fosco", "Texturizado"]
  },
  epoxi: {
    nome: "Epóxi", descricao: "Uso interno, máxima proteção química e anticorrosiva.", icone: "🛡️", cor: "#E75B12",
    ideal: "Máquinas, painéis elétricos, prateleiras e peças industriais",
    uso: "Somente interno (amarela ao sol)", cura: "15 min a 180 °C",
    notas: { sol: 1, quimica: 5, corrosao: 5 }, acabamentos: ["Semibrilho", "Texturizado fino"]
  },
  hibrida: {
    nome: "Híbrida", descricao: "Epóxi-poliéster: ótimo custo-benefício para ambientes internos.", icone: "⚖️", cor: "#57A639",
    ideal: "Móveis de aço, eletrodomésticos, luminárias e gôndolas",
    uso: "Interno", cura: "10 min a 190 °C",
    notas: { sol: 2, quimica: 4, corrosao: 4 }, acabamentos: ["Brilhante", "Acetinado"]
  },
  texturizada: {
    nome: "Texturizadas", descricao: "Texturas que disfarçam imperfeições e resistem a riscos.", icone: "🧱", cor: "#474A50",
    ideal: "Máquinas, gradis, ferramentas e peças com imperfeições",
    uso: "Externo e interno", cura: "12 min a 200 °C",
    notas: { sol: 4, quimica: 3, corrosao: 4 }, acabamentos: ["Rugoso", "Martelado"]
  },
  metalica: {
    nome: "Metálicas", descricao: "Efeitos metalizados, perolizados e cromados.", icone: "✨", cor: "#A5A5A5",
    ideal: "Rodas, luminárias, móveis e peças decorativas",
    uso: "Externo e interno (com verniz)", cura: "10 min a 200 °C",
    notas: { sol: 4, quimica: 3, corrosao: 3 }, acabamentos: ["Prata", "Cobre", "Bronze"]
  },
  especiais: {
    nome: "Especiais", descricao: "Primers, vernizes, alta temperatura e funcionais.", icone: "🔬", cor: "#8D9296",
    ideal: "Proteção extra, calor até 400 °C e cores sob medida",
    uso: "Conforme o produto", cura: "Conforme o produto",
    notas: { sol: 3, quimica: 4, corrosao: 5 }, acabamentos: ["Primer zinco", "Verniz", "Alta temperatura"]
  }
};

window.PRODUTOS = [
  {
    id: "poliester-brilhante",
    nome: "Poliéster TGIC-Free Brilhante",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Brilhante (> 85 GU)",
    descricao: "Pó poliéster para uso externo com excelente retenção de cor e brilho. Indicado para portões, esquadrias, mobiliário urbano e estruturas metálicas.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "10 min a 200 °C (temperatura da peça)",
    densidade: 1.5,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Branco Tráfego RAL 9016", hex: "#F1F0EA" },
      { nome: "Preto Intenso RAL 9005", hex: "#0E0E10" },
      { nome: "Azul Genciana RAL 5010", hex: "#0E4C92" },
      { nome: "Vermelho Fogo RAL 3000", hex: "#A72920" },
      { nome: "Amarelo Sinal RAL 1003", hex: "#F2A900" },
      { nome: "Verde Musgo RAL 6005", hex: "#114232" }
    ],
    destaque: true
  },
  {
    id: "poliester-fosco",
    nome: "Poliéster Fosco Arquitetônico",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Fosco (< 10 GU)",
    descricao: "Acabamento fosco sofisticado para fachadas, perfis de alumínio e esquadrias. Alta resistência a raios UV.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "10 min a 200 °C",
    densidade: 1.55,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Preto RAL 9005", hex: "#0E0E10" },
      { nome: "Grafite RAL 7024", hex: "#474A50" },
      { nome: "Cinza Antracite RAL 7016", hex: "#383E42" },
      { nome: "Bronze RAL 8019", hex: "#3F3A3A" },
      { nome: "Branco RAL 9010", hex: "#F4F2EA" }
    ],
    destaque: true
  },
  {
    id: "epoxi-anticorrosivo",
    nome: "Epóxi Anticorrosivo",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Semibrilho",
    descricao: "Pó epóxi puro com excelente aderência, resistência química e à corrosão. Ideal para peças de uso interno, máquinas, painéis e prateleiras.",
    rendimento: "≈ 9,8 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.45,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Cinza Claro RAL 7035", hex: "#CBD0CC" },
      { nome: "Cinza Munsell N6.5", hex: "#9C9E9F" },
      { nome: "Laranja Segurança RAL 2004", hex: "#E75B12" },
      { nome: "Azul Segurança RAL 5005", hex: "#1E5AA8" },
      { nome: "Preto RAL 9005", hex: "#0E0E10" }
    ],
    destaque: true
  },
  {
    id: "epoxi-painel-eletrico",
    nome: "Epóxi para Painéis Elétricos",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Texturizado fino",
    descricao: "Desenvolvida para quadros de comando, painéis e gabinetes elétricos. Alta dureza e rigidez dielétrica.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.5,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Cinza RAL 7032", hex: "#B5B0A1" },
      { nome: "Cinza Claro RAL 7035", hex: "#CBD0CC" },
      { nome: "Bege RAL 1015", hex: "#E6D2B5" }
    ]
  },
  {
    id: "hibrida-brilhante",
    nome: "Híbrida Epóxi-Poliéster Brilhante",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Brilhante",
    descricao: "Excelente custo-benefício para eletrodomésticos, móveis de aço, estantes, luminárias e peças de uso interno.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Branco RAL 9003", hex: "#F4F4F4" },
      { nome: "Preto RAL 9005", hex: "#0E0E10" },
      { nome: "Cinza Prata RAL 7001", hex: "#8A9597" },
      { nome: "Azul Céu RAL 5015", hex: "#2271B3" },
      { nome: "Verde RAL 6018", hex: "#57A639" }
    ],
    destaque: true
  },
  {
    id: "hibrida-acetinada",
    nome: "Híbrida Acetinada",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Acetinado (40–60 GU)",
    descricao: "Acabamento suave e uniforme para móveis de escritório, cadeiras, gôndolas e expositores.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Branco RAL 9016", hex: "#F1F0EA" },
      { nome: "Grafite RAL 7024", hex: "#474A50" },
      { nome: "Areia RAL 1019", hex: "#A08F7A" }
    ]
  },
  {
    id: "texturizada-rugosa",
    nome: "Texturizada Rugosa",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Texturizado rugoso",
    descricao: "Textura marcante que esconde imperfeições da peça e oferece alta resistência a riscos e abrasão. Ideal para máquinas e gradis.",
    rendimento: "≈ 8 m²/kg a 80 µm",
    cura: "12 min a 200 °C",
    densidade: 1.55,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Preto RAL 9005", hex: "#1A1A1C" },
      { nome: "Grafite RAL 7024", hex: "#474A50" },
      { nome: "Marrom RAL 8017", hex: "#45322E" },
      { nome: "Branco RAL 9016", hex: "#F1F0EA" }
    ],
    destaque: true
  },
  {
    id: "texturizada-martelada",
    nome: "Martelada (Hammertone)",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Martelado",
    descricao: "Efeito martelado clássico para ferramentas, máquinas, cofres e equipamentos industriais.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "12 min a 200 °C",
    densidade: 1.5,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Cinza Martelado", hex: "#7E8387" },
      { nome: "Azul Martelado", hex: "#3B5B8A" },
      { nome: "Verde Martelado", hex: "#3D5E4A" }
    ]
  },
  {
    id: "metalica-prata",
    nome: "Metálica Efeito Alumínio",
    categoria: "metalica",
    linha: "Linha Efeitos",
    acabamento: "Metálico",
    descricao: "Efeito metalizado brilhante que imita o alumínio. Para rodas, luminárias, móveis e peças decorativas.",
    rendimento: "≈ 10 m²/kg a 60 µm",
    cura: "10 min a 200 °C",
    densidade: 1.4,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Prata RAL 9006", hex: "#A5A5A5" },
      { nome: "Grafite Metálico RAL 9007", hex: "#8F8F8C" },
      { nome: "Champagne", hex: "#C9B28A" }
    ],
    destaque: true
  },
  {
    id: "metalica-cobre",
    nome: "Metálica Cobre & Bronze",
    categoria: "metalica",
    linha: "Linha Efeitos",
    acabamento: "Metálico acetinado",
    descricao: "Tons de cobre, bronze e ouro velho para arquitetura, design de interiores e mobiliário.",
    rendimento: "≈ 10 m²/kg a 60 µm",
    cura: "10 min a 200 °C",
    densidade: 1.4,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Cobre", hex: "#B06A3B" },
      { nome: "Bronze", hex: "#8C6A3E" },
      { nome: "Ouro Velho", hex: "#B08D43" }
    ]
  },
  {
    id: "primer-zinco",
    nome: "Primer Epóxi Rico em Zinco",
    categoria: "especiais",
    linha: "Linha Proteção",
    acabamento: "Fosco",
    descricao: "Fundo em pó com zinco para proteção catódica. Aumenta muito a resistência à corrosão em sistemas de duas camadas.",
    rendimento: "≈ 7 m²/kg a 60 µm",
    cura: "Pré-cura: 5 min a 180 °C",
    densidade: 2.3,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [{ nome: "Cinza Zinco", hex: "#8D9296" }],
    destaque: true
  },
  {
    id: "verniz-po",
    nome: "Verniz em Pó Transparente",
    categoria: "especiais",
    linha: "Linha Proteção",
    acabamento: "Brilhante transparente",
    descricao: "Camada de proteção transparente sobre acabamentos metálicos e peças cromadas. Aumenta a durabilidade e o brilho.",
    rendimento: "≈ 11 m²/kg a 60 µm",
    cura: "10 min a 180 °C",
    densidade: 1.2,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [{ nome: "Incolor", hex: "#E9EEF3" }]
  },
  {
    id: "alta-temperatura",
    nome: "Pó Alta Temperatura 400 °C",
    categoria: "especiais",
    linha: "Linha Funcional",
    acabamento: "Fosco",
    descricao: "Resiste a até 400 °C em serviço contínuo. Para churrasqueiras, fogões, escapamentos e equipamentos térmicos.",
    rendimento: "≈ 9 m²/kg a 60 µm",
    cura: "20 min a 200 °C",
    densidade: 1.6,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [
      { nome: "Preto Fosco", hex: "#1C1C1E" },
      { nome: "Alumínio", hex: "#B9BCBE" }
    ]
  },
  {
    id: "cor-especial",
    nome: "Cor Especial Sob Medida",
    categoria: "especiais",
    linha: "Desenvolvimento",
    acabamento: "Conforme projeto",
    descricao: "Desenvolvemos a cor e o acabamento que o seu projeto precisa, a partir de padrão RAL, Munsell, Pantone ou amostra física.",
    rendimento: "Conforme formulação",
    cura: "Conforme formulação",
    densidade: 1.5,
    embalagens: ["Caixa 20 kg", "Caixa 25 kg"],
    cores: [{ nome: "Cor a definir", hex: "#1558D6" }]
  }
];
