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
    url: "https://miakoeajctykqdjkkczo.supabase.co",
    // Chave pública (publishable). É feita para ficar no site; a segurança vem das regras (RLS) do banco.
    // Nunca coloque aqui a chave secreta (sb_secret_... / service_role).
    anonKey: "sb_publishable_K5qH5wJJ4mLbQAInGiUqZw_i2AFC1y9"
  },
  // Quantos dígitos tem o código que chega no e-mail (Supabase: Authentication → Email → "Email OTP Length").
  tamanhoCodigo: 8,

  // Assistente de compras. Funciona sem configuração (entende os pedidos no próprio site).
  // Para usar IA de verdade (Claude), publique a função supabase/functions/assistente e
  // coloque o endereço dela aqui, ex.: "https://miakoeajctykqdjkkczo.supabase.co/functions/v1/assistente"
  assistente: {
    endpoint: ""
  },

  // Redes sociais e lojas. Deixe vazio ("") para esconder. Também dá para editar tudo
  // pelo Painel da empresa → "Contato e links" (o que for salvo lá vale mais que este arquivo).
  // Ex.: instagram: "https://www.instagram.com/policoating"
  redes: {
    instagram: "",
    facebook: "",
    whatsappBusiness: "",   // link do catálogo do WhatsApp Business, ex.: https://wa.me/c/5516992708155
    linkedin: "",
    youtube: "",
    tiktok: ""
  },
  lojas: {
    mercadolivre: "",
    shopee: "",
    aliexpress: "",
    amazon: "",
    magalu: ""
  }
};
