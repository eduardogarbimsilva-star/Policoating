/*
 * TIPOS DE TINTA (linhas) usados no catálogo, no guia "Qual pó usar?" e no carrossel "Tipos de tinta".
 * Os PRODUTOS são cadastrados no Painel da empresa (admin.html): cada produto é uma cor, com código gerado
 * pelo sistema, marca, tipo, no mínimo 3 fotos, descrição, embalagens e preço.
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

// Os produtos são cadastrados no Painel da empresa (admin.html). Esta lista fica vazia de propósito:
// o site mostra só o que foi cadastrado, e o que for excluído no painel não volta.
window.PRODUTOS = [];

// Classificação do produto (definida pela Policoating):
// Classe = resina · Textura = superfície · Acabamento = nível de brilho
window.CLASSES = ["poliester", "hibrida", "epoxi"];
window.TEXTURAS = ["Liso", "Texturizado", "Microtextura", "Craqueado"];
window.ACABAMENTOS = ["Ultra Brilhante", "Brilhante", "Semi Brilho", "Semi Fosco", "Fosco", "Ultra Fosca"];
// Nome padrão de um valor antigo/digitado ("Brilhante (> 85 GU)" → "Brilhante", "Lisa" → "Liso")
window.padraoClassificacao = function (valor, lista) {
  const n = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[-\s]+/g, " ").trim();
  const v = n(valor); if (!v) return "";
  const apelidos = { lisa: "Liso", liso: "Liso", "semibrilho": "Semi Brilho", "semi brilhante": "Semi Brilho", acetinado: "Semi Brilho", "semifosco": "Semi Fosco", "ultra fosco": "Ultra Fosca", "texturizada": "Texturizado", "micro textura": "Microtextura", "microtexturizado": "Microtextura", craquelado: "Craqueado", craquelada: "Craqueado" };
  const porTamanho = lista.slice().sort((a, b) => b.length - a.length);
  const achado = porTamanho.find((o) => v === n(o) || v.startsWith(n(o) + " ") || v.startsWith(n(o) + "("));
  if (achado) return achado;
  const ap = Object.keys(apelidos).sort((a, b) => b.length - a.length).find((k) => v === k || v.startsWith(k + " "));
  return ap && lista.includes(apelidos[ap]) ? apelidos[ap] : "";
};
