/*
 * CATÁLOGO DE PRODUTOS — Tinta eletrostática em pó
 * Cada produto é UMA cor, com código único. Normalmente o catálogo é editado pelo Painel da empresa;
 * esta lista é a padrão (usada enquanto o painel estiver vazio).
 *  - id:            código em minúsculas (é a chave do produto; não mude depois de publicado)
 *  - codigo:        código exibido (único), ex.: POL-0001
 *  - familia:       linha de origem (ajuda o assistente e as fotos de inspiração)
 *  - categoria:     deve ser uma das chaves de CATEGORIAS abaixo
 *  - cores:         uma única cor [{ nome, hex, foto? }]
 *  - embalagens:    tamanhos de caixa disponíveis
 *  - densidade:     g/cm³ (usada pela calculadora de consumo)
 *  - preco:         preço por kg (R$). precoPromo: preço promocional por kg; promoAte: "AAAA-MM-DD" (opcional)
 *  - precoCombinar: true = "Valor a combinar com o vendedor" (sem preço no site)
 *  - destaque:      true para aparecer na página inicial
 */
window.CATEGORIAS = {
  // Informações técnicas usadas no carrossel "Tipos de tinta" e no guia "Qual pó usar?".
  // Notas de 1 a 5 (quanto maior, melhor).
  poliester: {
    nome: "Poliéster", descricao: "Uso externo, alta resistência ao sol e às intempéries.", icone: "sol", cor: "#1558d6",
    ideal: "Portões, grades, esquadrias, fachadas e mobiliário urbano",
    uso: "Externo e interno", cura: "10 min a 200 °C",
    notas: { sol: 5, quimica: 3, corrosao: 4 }, acabamentos: ["Brilhante", "Fosco", "Texturizado"]
  },
  epoxi: {
    nome: "Epóxi", descricao: "Uso interno, máxima proteção química e anticorrosiva.", icone: "escudo", cor: "#E75B12",
    ideal: "Máquinas, painéis elétricos, prateleiras e peças industriais",
    uso: "Somente interno (amarela ao sol)", cura: "15 min a 180 °C",
    notas: { sol: 1, quimica: 5, corrosao: 5 }, acabamentos: ["Semibrilho", "Texturizado fino"]
  },
  hibrida: {
    nome: "Híbrida", descricao: "Epóxi-poliéster: ótimo custo-benefício para ambientes internos.", icone: "balanca", cor: "#57A639",
    ideal: "Móveis de aço, eletrodomésticos, luminárias e gôndolas",
    uso: "Interno", cura: "10 min a 190 °C",
    notas: { sol: 2, quimica: 4, corrosao: 4 }, acabamentos: ["Brilhante", "Acetinado"]
  },
  texturizada: {
    nome: "Texturizadas", descricao: "Texturas que disfarçam imperfeições e resistem a riscos.", icone: "camadas", cor: "#474A50",
    ideal: "Máquinas, gradis, ferramentas e peças com imperfeições",
    uso: "Externo e interno", cura: "12 min a 200 °C",
    notas: { sol: 4, quimica: 3, corrosao: 4 }, acabamentos: ["Rugoso", "Martelado"]
  },
  metalica: {
    nome: "Metálicas", descricao: "Efeitos metalizados, perolizados e cromados.", icone: "brilho", cor: "#A5A5A5",
    ideal: "Rodas, luminárias, móveis e peças decorativas",
    uso: "Externo e interno (com verniz)", cura: "10 min a 200 °C",
    notas: { sol: 4, quimica: 3, corrosao: 3 }, acabamentos: ["Prata", "Cobre", "Bronze"]
  },
  especiais: {
    nome: "Especiais", descricao: "Primers, vernizes, alta temperatura e funcionais.", icone: "frasco", cor: "#8D9296",
    ideal: "Proteção extra, calor até 400 °C e cores sob medida",
    uso: "Conforme o produto", cura: "Conforme o produto",
    notas: { sol: 3, quimica: 4, corrosao: 5 }, acabamentos: ["Primer zinco", "Verniz", "Alta temperatura"]
  }
};

window.PRODUTOS = [
  {
    id: "pol-0001",
    codigo: "POL-0001",
    familia: "poliester-brilhante",
    nome: "Poliéster TGIC-Free Brilhante Branco Tráfego RAL 9016",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Brilhante (> 85 GU)",
    descricao: "Pó poliéster para uso externo com excelente retenção de cor e brilho. Indicado para portões, esquadrias, mobiliário urbano e estruturas metálicas.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "10 min a 200 °C (temperatura da peça)",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Branco Tráfego RAL 9016",
        hex: "#F1F0EA"
      }
    ],
    precoCombinar: true,
    destaque: true
  },
  {
    id: "pol-0002",
    codigo: "POL-0002",
    familia: "poliester-brilhante",
    nome: "Poliéster TGIC-Free Brilhante Preto Intenso RAL 9005",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Brilhante (> 85 GU)",
    descricao: "Pó poliéster para uso externo com excelente retenção de cor e brilho. Indicado para portões, esquadrias, mobiliário urbano e estruturas metálicas.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "10 min a 200 °C (temperatura da peça)",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Preto Intenso RAL 9005",
        hex: "#0E0E10"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0003",
    codigo: "POL-0003",
    familia: "poliester-brilhante",
    nome: "Poliéster TGIC-Free Brilhante Azul Genciana RAL 5010",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Brilhante (> 85 GU)",
    descricao: "Pó poliéster para uso externo com excelente retenção de cor e brilho. Indicado para portões, esquadrias, mobiliário urbano e estruturas metálicas.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "10 min a 200 °C (temperatura da peça)",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Azul Genciana RAL 5010",
        hex: "#0E4C92"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0004",
    codigo: "POL-0004",
    familia: "poliester-brilhante",
    nome: "Poliéster TGIC-Free Brilhante Vermelho Fogo RAL 3000",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Brilhante (> 85 GU)",
    descricao: "Pó poliéster para uso externo com excelente retenção de cor e brilho. Indicado para portões, esquadrias, mobiliário urbano e estruturas metálicas.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "10 min a 200 °C (temperatura da peça)",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Vermelho Fogo RAL 3000",
        hex: "#A72920"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0005",
    codigo: "POL-0005",
    familia: "poliester-brilhante",
    nome: "Poliéster TGIC-Free Brilhante Amarelo Sinal RAL 1003",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Brilhante (> 85 GU)",
    descricao: "Pó poliéster para uso externo com excelente retenção de cor e brilho. Indicado para portões, esquadrias, mobiliário urbano e estruturas metálicas.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "10 min a 200 °C (temperatura da peça)",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Amarelo Sinal RAL 1003",
        hex: "#F2A900"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0006",
    codigo: "POL-0006",
    familia: "poliester-brilhante",
    nome: "Poliéster TGIC-Free Brilhante Verde Musgo RAL 6005",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Brilhante (> 85 GU)",
    descricao: "Pó poliéster para uso externo com excelente retenção de cor e brilho. Indicado para portões, esquadrias, mobiliário urbano e estruturas metálicas.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "10 min a 200 °C (temperatura da peça)",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Verde Musgo RAL 6005",
        hex: "#114232"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0007",
    codigo: "POL-0007",
    familia: "poliester-fosco",
    nome: "Poliéster Fosco Arquitetônico Preto RAL 9005",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Fosco (< 10 GU)",
    descricao: "Acabamento fosco sofisticado para fachadas, perfis de alumínio e esquadrias. Alta resistência a raios UV.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "10 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Preto RAL 9005",
        hex: "#0E0E10"
      }
    ],
    precoCombinar: true,
    destaque: true
  },
  {
    id: "pol-0008",
    codigo: "POL-0008",
    familia: "poliester-fosco",
    nome: "Poliéster Fosco Arquitetônico Grafite RAL 7024",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Fosco (< 10 GU)",
    descricao: "Acabamento fosco sofisticado para fachadas, perfis de alumínio e esquadrias. Alta resistência a raios UV.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "10 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Grafite RAL 7024",
        hex: "#474A50"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0009",
    codigo: "POL-0009",
    familia: "poliester-fosco",
    nome: "Poliéster Fosco Arquitetônico Cinza Antracite RAL 7016",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Fosco (< 10 GU)",
    descricao: "Acabamento fosco sofisticado para fachadas, perfis de alumínio e esquadrias. Alta resistência a raios UV.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "10 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cinza Antracite RAL 7016",
        hex: "#383E42"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0010",
    codigo: "POL-0010",
    familia: "poliester-fosco",
    nome: "Poliéster Fosco Arquitetônico Bronze RAL 8019",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Fosco (< 10 GU)",
    descricao: "Acabamento fosco sofisticado para fachadas, perfis de alumínio e esquadrias. Alta resistência a raios UV.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "10 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Bronze RAL 8019",
        hex: "#3F3A3A"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0011",
    codigo: "POL-0011",
    familia: "poliester-fosco",
    nome: "Poliéster Fosco Arquitetônico Branco RAL 9010",
    categoria: "poliester",
    linha: "Linha Exterior",
    acabamento: "Fosco (< 10 GU)",
    descricao: "Acabamento fosco sofisticado para fachadas, perfis de alumínio e esquadrias. Alta resistência a raios UV.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "10 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Branco RAL 9010",
        hex: "#F4F2EA"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0012",
    codigo: "POL-0012",
    familia: "epoxi-anticorrosivo",
    nome: "Epóxi Anticorrosivo Cinza Claro RAL 7035",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Semibrilho",
    descricao: "Pó epóxi puro com excelente aderência, resistência química e à corrosão. Ideal para peças de uso interno, máquinas, painéis e prateleiras.",
    rendimento: "≈ 9,8 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.45,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cinza Claro RAL 7035",
        hex: "#CBD0CC"
      }
    ],
    precoCombinar: true,
    destaque: true
  },
  {
    id: "pol-0013",
    codigo: "POL-0013",
    familia: "epoxi-anticorrosivo",
    nome: "Epóxi Anticorrosivo Cinza Munsell N6.5",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Semibrilho",
    descricao: "Pó epóxi puro com excelente aderência, resistência química e à corrosão. Ideal para peças de uso interno, máquinas, painéis e prateleiras.",
    rendimento: "≈ 9,8 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.45,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cinza Munsell N6.5",
        hex: "#9C9E9F"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0014",
    codigo: "POL-0014",
    familia: "epoxi-anticorrosivo",
    nome: "Epóxi Anticorrosivo Laranja Segurança RAL 2004",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Semibrilho",
    descricao: "Pó epóxi puro com excelente aderência, resistência química e à corrosão. Ideal para peças de uso interno, máquinas, painéis e prateleiras.",
    rendimento: "≈ 9,8 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.45,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Laranja Segurança RAL 2004",
        hex: "#E75B12"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0015",
    codigo: "POL-0015",
    familia: "epoxi-anticorrosivo",
    nome: "Epóxi Anticorrosivo Azul Segurança RAL 5005",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Semibrilho",
    descricao: "Pó epóxi puro com excelente aderência, resistência química e à corrosão. Ideal para peças de uso interno, máquinas, painéis e prateleiras.",
    rendimento: "≈ 9,8 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.45,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Azul Segurança RAL 5005",
        hex: "#1E5AA8"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0016",
    codigo: "POL-0016",
    familia: "epoxi-anticorrosivo",
    nome: "Epóxi Anticorrosivo Preto RAL 9005",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Semibrilho",
    descricao: "Pó epóxi puro com excelente aderência, resistência química e à corrosão. Ideal para peças de uso interno, máquinas, painéis e prateleiras.",
    rendimento: "≈ 9,8 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.45,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Preto RAL 9005",
        hex: "#0E0E10"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0017",
    codigo: "POL-0017",
    familia: "epoxi-painel-eletrico",
    nome: "Epóxi para Painéis Elétricos Cinza RAL 7032",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Texturizado fino",
    descricao: "Desenvolvida para quadros de comando, painéis e gabinetes elétricos. Alta dureza e rigidez dielétrica.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cinza RAL 7032",
        hex: "#B5B0A1"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0018",
    codigo: "POL-0018",
    familia: "epoxi-painel-eletrico",
    nome: "Epóxi para Painéis Elétricos Cinza Claro RAL 7035",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Texturizado fino",
    descricao: "Desenvolvida para quadros de comando, painéis e gabinetes elétricos. Alta dureza e rigidez dielétrica.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cinza Claro RAL 7035",
        hex: "#CBD0CC"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0019",
    codigo: "POL-0019",
    familia: "epoxi-painel-eletrico",
    nome: "Epóxi para Painéis Elétricos Bege RAL 1015",
    categoria: "epoxi",
    linha: "Linha Industrial",
    acabamento: "Texturizado fino",
    descricao: "Desenvolvida para quadros de comando, painéis e gabinetes elétricos. Alta dureza e rigidez dielétrica.",
    rendimento: "≈ 9,5 m²/kg a 70 µm",
    cura: "15 min a 180 °C",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Bege RAL 1015",
        hex: "#E6D2B5"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0020",
    codigo: "POL-0020",
    familia: "hibrida-brilhante",
    nome: "Híbrida Epóxi-Poliéster Brilhante Branco RAL 9003",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Brilhante",
    descricao: "Excelente custo-benefício para eletrodomésticos, móveis de aço, estantes, luminárias e peças de uso interno.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Branco RAL 9003",
        hex: "#F4F4F4"
      }
    ],
    precoCombinar: true,
    destaque: true
  },
  {
    id: "pol-0021",
    codigo: "POL-0021",
    familia: "hibrida-brilhante",
    nome: "Híbrida Epóxi-Poliéster Brilhante Preto RAL 9005",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Brilhante",
    descricao: "Excelente custo-benefício para eletrodomésticos, móveis de aço, estantes, luminárias e peças de uso interno.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Preto RAL 9005",
        hex: "#0E0E10"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0022",
    codigo: "POL-0022",
    familia: "hibrida-brilhante",
    nome: "Híbrida Epóxi-Poliéster Brilhante Cinza Prata RAL 7001",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Brilhante",
    descricao: "Excelente custo-benefício para eletrodomésticos, móveis de aço, estantes, luminárias e peças de uso interno.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cinza Prata RAL 7001",
        hex: "#8A9597"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0023",
    codigo: "POL-0023",
    familia: "hibrida-brilhante",
    nome: "Híbrida Epóxi-Poliéster Brilhante Azul Céu RAL 5015",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Brilhante",
    descricao: "Excelente custo-benefício para eletrodomésticos, móveis de aço, estantes, luminárias e peças de uso interno.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Azul Céu RAL 5015",
        hex: "#2271B3"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0024",
    codigo: "POL-0024",
    familia: "hibrida-brilhante",
    nome: "Híbrida Epóxi-Poliéster Brilhante Verde RAL 6018",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Brilhante",
    descricao: "Excelente custo-benefício para eletrodomésticos, móveis de aço, estantes, luminárias e peças de uso interno.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Verde RAL 6018",
        hex: "#57A639"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0025",
    codigo: "POL-0025",
    familia: "hibrida-acetinada",
    nome: "Híbrida Acetinada Branco RAL 9016",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Acetinado (40–60 GU)",
    descricao: "Acabamento suave e uniforme para móveis de escritório, cadeiras, gôndolas e expositores.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Branco RAL 9016",
        hex: "#F1F0EA"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0026",
    codigo: "POL-0026",
    familia: "hibrida-acetinada",
    nome: "Híbrida Acetinada Grafite RAL 7024",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Acetinado (40–60 GU)",
    descricao: "Acabamento suave e uniforme para móveis de escritório, cadeiras, gôndolas e expositores.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Grafite RAL 7024",
        hex: "#474A50"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0027",
    codigo: "POL-0027",
    familia: "hibrida-acetinada",
    nome: "Híbrida Acetinada Areia RAL 1019",
    categoria: "hibrida",
    linha: "Linha Interior",
    acabamento: "Acetinado (40–60 GU)",
    descricao: "Acabamento suave e uniforme para móveis de escritório, cadeiras, gôndolas e expositores.",
    rendimento: "≈ 10 m²/kg a 70 µm",
    cura: "10 min a 190 °C",
    densidade: 1.42,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Areia RAL 1019",
        hex: "#A08F7A"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0028",
    codigo: "POL-0028",
    familia: "texturizada-rugosa",
    nome: "Texturizada Rugosa Preto RAL 9005",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Texturizado rugoso",
    descricao: "Textura marcante que esconde imperfeições da peça e oferece alta resistência a riscos e abrasão. Ideal para máquinas e gradis.",
    rendimento: "≈ 8 m²/kg a 80 µm",
    cura: "12 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Preto RAL 9005",
        hex: "#1A1A1C"
      }
    ],
    precoCombinar: true,
    destaque: true
  },
  {
    id: "pol-0029",
    codigo: "POL-0029",
    familia: "texturizada-rugosa",
    nome: "Texturizada Rugosa Grafite RAL 7024",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Texturizado rugoso",
    descricao: "Textura marcante que esconde imperfeições da peça e oferece alta resistência a riscos e abrasão. Ideal para máquinas e gradis.",
    rendimento: "≈ 8 m²/kg a 80 µm",
    cura: "12 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Grafite RAL 7024",
        hex: "#474A50"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0030",
    codigo: "POL-0030",
    familia: "texturizada-rugosa",
    nome: "Texturizada Rugosa Marrom RAL 8017",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Texturizado rugoso",
    descricao: "Textura marcante que esconde imperfeições da peça e oferece alta resistência a riscos e abrasão. Ideal para máquinas e gradis.",
    rendimento: "≈ 8 m²/kg a 80 µm",
    cura: "12 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Marrom RAL 8017",
        hex: "#45322E"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0031",
    codigo: "POL-0031",
    familia: "texturizada-rugosa",
    nome: "Texturizada Rugosa Branco RAL 9016",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Texturizado rugoso",
    descricao: "Textura marcante que esconde imperfeições da peça e oferece alta resistência a riscos e abrasão. Ideal para máquinas e gradis.",
    rendimento: "≈ 8 m²/kg a 80 µm",
    cura: "12 min a 200 °C",
    densidade: 1.55,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Branco RAL 9016",
        hex: "#F1F0EA"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0032",
    codigo: "POL-0032",
    familia: "texturizada-martelada",
    nome: "Martelada (Hammertone) Cinza Martelado",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Martelado",
    descricao: "Efeito martelado clássico para ferramentas, máquinas, cofres e equipamentos industriais.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "12 min a 200 °C",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cinza Martelado",
        hex: "#7E8387"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0033",
    codigo: "POL-0033",
    familia: "texturizada-martelada",
    nome: "Martelada (Hammertone) Azul Martelado",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Martelado",
    descricao: "Efeito martelado clássico para ferramentas, máquinas, cofres e equipamentos industriais.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "12 min a 200 °C",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Azul Martelado",
        hex: "#3B5B8A"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0034",
    codigo: "POL-0034",
    familia: "texturizada-martelada",
    nome: "Martelada (Hammertone) Verde Martelado",
    categoria: "texturizada",
    linha: "Linha Textura",
    acabamento: "Martelado",
    descricao: "Efeito martelado clássico para ferramentas, máquinas, cofres e equipamentos industriais.",
    rendimento: "≈ 9 m²/kg a 70 µm",
    cura: "12 min a 200 °C",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Verde Martelado",
        hex: "#3D5E4A"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0035",
    codigo: "POL-0035",
    familia: "metalica-prata",
    nome: "Metálica Efeito Alumínio Prata RAL 9006",
    categoria: "metalica",
    linha: "Linha Efeitos",
    acabamento: "Metálico",
    descricao: "Efeito metalizado brilhante que imita o alumínio. Para rodas, luminárias, móveis e peças decorativas.",
    rendimento: "≈ 10 m²/kg a 60 µm",
    cura: "10 min a 200 °C",
    densidade: 1.4,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Prata RAL 9006",
        hex: "#A5A5A5"
      }
    ],
    precoCombinar: true,
    destaque: true
  },
  {
    id: "pol-0036",
    codigo: "POL-0036",
    familia: "metalica-prata",
    nome: "Metálica Efeito Alumínio Grafite Metálico RAL 9007",
    categoria: "metalica",
    linha: "Linha Efeitos",
    acabamento: "Metálico",
    descricao: "Efeito metalizado brilhante que imita o alumínio. Para rodas, luminárias, móveis e peças decorativas.",
    rendimento: "≈ 10 m²/kg a 60 µm",
    cura: "10 min a 200 °C",
    densidade: 1.4,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Grafite Metálico RAL 9007",
        hex: "#8F8F8C"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0037",
    codigo: "POL-0037",
    familia: "metalica-prata",
    nome: "Metálica Efeito Alumínio Champagne",
    categoria: "metalica",
    linha: "Linha Efeitos",
    acabamento: "Metálico",
    descricao: "Efeito metalizado brilhante que imita o alumínio. Para rodas, luminárias, móveis e peças decorativas.",
    rendimento: "≈ 10 m²/kg a 60 µm",
    cura: "10 min a 200 °C",
    densidade: 1.4,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Champagne",
        hex: "#C9B28A"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0038",
    codigo: "POL-0038",
    familia: "metalica-cobre",
    nome: "Metálica Cobre & Bronze Cobre",
    categoria: "metalica",
    linha: "Linha Efeitos",
    acabamento: "Metálico acetinado",
    descricao: "Tons de cobre, bronze e ouro velho para arquitetura, design de interiores e mobiliário.",
    rendimento: "≈ 10 m²/kg a 60 µm",
    cura: "10 min a 200 °C",
    densidade: 1.4,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cobre",
        hex: "#B06A3B"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0039",
    codigo: "POL-0039",
    familia: "metalica-cobre",
    nome: "Metálica Cobre & Bronze Bronze",
    categoria: "metalica",
    linha: "Linha Efeitos",
    acabamento: "Metálico acetinado",
    descricao: "Tons de cobre, bronze e ouro velho para arquitetura, design de interiores e mobiliário.",
    rendimento: "≈ 10 m²/kg a 60 µm",
    cura: "10 min a 200 °C",
    densidade: 1.4,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Bronze",
        hex: "#8C6A3E"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0040",
    codigo: "POL-0040",
    familia: "metalica-cobre",
    nome: "Metálica Cobre & Bronze Ouro Velho",
    categoria: "metalica",
    linha: "Linha Efeitos",
    acabamento: "Metálico acetinado",
    descricao: "Tons de cobre, bronze e ouro velho para arquitetura, design de interiores e mobiliário.",
    rendimento: "≈ 10 m²/kg a 60 µm",
    cura: "10 min a 200 °C",
    densidade: 1.4,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Ouro Velho",
        hex: "#B08D43"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0041",
    codigo: "POL-0041",
    familia: "primer-zinco",
    nome: "Primer Epóxi Rico em Zinco Cinza Zinco",
    categoria: "especiais",
    linha: "Linha Proteção",
    acabamento: "Fosco",
    descricao: "Fundo em pó com zinco para proteção catódica. Aumenta muito a resistência à corrosão em sistemas de duas camadas.",
    rendimento: "≈ 7 m²/kg a 60 µm",
    cura: "Pré-cura: 5 min a 180 °C",
    densidade: 2.3,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cinza Zinco",
        hex: "#8D9296"
      }
    ],
    precoCombinar: true,
    destaque: true
  },
  {
    id: "pol-0042",
    codigo: "POL-0042",
    familia: "verniz-po",
    nome: "Verniz em Pó Transparente Incolor",
    categoria: "especiais",
    linha: "Linha Proteção",
    acabamento: "Brilhante transparente",
    descricao: "Camada de proteção transparente sobre acabamentos metálicos e peças cromadas. Aumenta a durabilidade e o brilho.",
    rendimento: "≈ 11 m²/kg a 60 µm",
    cura: "10 min a 180 °C",
    densidade: 1.2,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Incolor",
        hex: "#E9EEF3"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0043",
    codigo: "POL-0043",
    familia: "alta-temperatura",
    nome: "Pó Alta Temperatura 400 °C Preto Fosco",
    categoria: "especiais",
    linha: "Linha Funcional",
    acabamento: "Fosco",
    descricao: "Resiste a até 400 °C em serviço contínuo. Para churrasqueiras, fogões, escapamentos e equipamentos térmicos.",
    rendimento: "≈ 9 m²/kg a 60 µm",
    cura: "20 min a 200 °C",
    densidade: 1.6,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Preto Fosco",
        hex: "#1C1C1E"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0044",
    codigo: "POL-0044",
    familia: "alta-temperatura",
    nome: "Pó Alta Temperatura 400 °C Alumínio",
    categoria: "especiais",
    linha: "Linha Funcional",
    acabamento: "Fosco",
    descricao: "Resiste a até 400 °C em serviço contínuo. Para churrasqueiras, fogões, escapamentos e equipamentos térmicos.",
    rendimento: "≈ 9 m²/kg a 60 µm",
    cura: "20 min a 200 °C",
    densidade: 1.6,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Alumínio",
        hex: "#B9BCBE"
      }
    ],
    precoCombinar: true
  },
  {
    id: "pol-0045",
    codigo: "POL-0045",
    familia: "cor-especial",
    nome: "Cor Especial Sob Medida",
    categoria: "especiais",
    linha: "Desenvolvimento",
    acabamento: "Conforme projeto",
    descricao: "Desenvolvemos a cor e o acabamento que o seu projeto precisa, a partir de padrão RAL, Munsell, Pantone ou amostra física.",
    rendimento: "Conforme formulação",
    cura: "Conforme formulação",
    densidade: 1.5,
    embalagens: [
      "Caixa 25 kg",
      "Caixa 20 kg"
    ],
    cores: [
      {
        nome: "Cor a definir",
        hex: "#1558D6"
      }
    ],
    precoCombinar: true
  }
];
