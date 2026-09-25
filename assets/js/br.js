/* =========================================================
   Utilidades brasileiras: máscaras, validação de CPF/CNPJ,
   busca de endereço pelo CEP (ViaCEP) e de empresa pelo CNPJ (BrasilAPI)
   ========================================================= */
(function () {
  "use strict";
  const so = (v) => String(v || "").replace(/\D/g, "");

  const mascaras = {
    cpf: (v) => so(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2"),
    cnpj: (v) => so(v).slice(0, 14).replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2"),
    cep: (v) => so(v).slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2"),
    telefone: (v) => {
      const d = so(v).slice(0, 11);
      if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
      return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
    }
  };

  function cpfValido(v) {
    const c = so(v);
    if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false;
    for (let t = 9; t < 11; t++) {
      let soma = 0;
      for (let i = 0; i < t; i++) soma += +c[i] * (t + 1 - i);
      if (((soma * 10) % 11) % 10 !== +c[t]) return false;
    }
    return true;
  }

  function cnpjValido(v) {
    const c = so(v);
    if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false;
    const calc = (n) => {
      let soma = 0, peso = n - 7;
      for (let i = 0; i < n; i++) { soma += +c[i] * peso--; if (peso < 2) peso = 9; }
      const r = soma % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(12) === +c[12] && calc(13) === +c[13];
  }

  async function buscarCep(cep) {
    const c = so(cep);
    if (c.length !== 8) throw new Error("CEP deve ter 8 dígitos.");
    const r = await fetch("https://viacep.com.br/ws/" + c + "/json/");
    if (!r.ok) throw new Error("Não foi possível consultar o CEP agora.");
    const d = await r.json();
    if (d.erro) throw new Error("CEP não encontrado.");
    return { logradouro: d.logradouro, bairro: d.bairro, cidade: d.localidade, uf: d.uf, complemento: d.complemento };
  }

  async function buscarCnpj(cnpj) {
    const c = so(cnpj);
    if (!cnpjValido(c)) throw new Error("CNPJ inválido.");
    const r = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + c);
    if (r.status === 404) throw new Error("CNPJ não encontrado na Receita.");
    if (!r.ok) throw new Error("Não foi possível consultar o CNPJ agora. Preencha manualmente.");
    const d = await r.json();
    return {
      razao_social: d.razao_social, nome_fantasia: d.nome_fantasia, cep: d.cep, logradouro: d.logradouro,
      numero: d.numero, complemento: d.complemento, bairro: d.bairro, cidade: d.municipio, uf: d.uf,
      telefone: d.ddd_telefone_1, situacao: d.descricao_situacao_cadastral
    };
  }

  window.BR = { so, mascaras, cpfValido, cnpjValido, buscarCep, buscarCnpj };
})();
