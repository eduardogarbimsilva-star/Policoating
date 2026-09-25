/*
 * CONFIGURAÇÃO GERAL DO SITE
 * Altere aqui os dados da empresa e o número de WhatsApp do vendedor.
 * O número deve estar no formato internacional, apenas dígitos:
 *   55 (Brasil) + DDD + número  ->  ex.: 5516992708155
 */
window.SITE_CONFIG = {
  empresa: "Policoating",
  descricao: "Tinta eletrostática em pó",
  slogan: "Tecnologia que reveste, qualidade que permanece.",
  whatsapp: "5516992708155",
  telefone: "(16) 99270-8155",
  email: "contato@policoating.com.br",
  endereco: "Atendimento para todo o Brasil",
  horario: "Seg a Sex, 8h às 18h",
  // Exigir que o cliente entre na conta antes de enviar o pedido pelo WhatsApp
  exigirLogin: true,

  // Login com código por e-mail (Supabase). Enquanto vazio, o site funciona em
  // "modo demonstração" (o código aparece na tela). Veja o passo a passo no README.
  supabase: {
    url: "",      // ex.: "https://abcdefgh.supabase.co"
    anonKey: ""   // chave pública "anon"/"publishable" do projeto
  },

  redes: {
    instagram: "#",
    facebook: "#",
    linkedin: "#",
    youtube: "#"
  }
};
