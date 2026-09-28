/* =========================================================
   Policoating — Registro do pedido
   O pedido feito no site é registrado (Meus pedidos do cliente e aba Pedidos
   do painel) e enviado ao WhatsApp do vendedor. Não há pagamento, frete,
   estoque nem acompanhamento de entrega pelo site.
   - Com Supabase: a função criar_pedido (PARTE L do setup.sql) confere e grava
     os preços no banco. Sem ela, o pedido é gravado do jeito antigo.
   - Sem Supabase (modo demonstração): fica neste navegador.
   ========================================================= */
(function () {
  "use strict";

  const CFG = window.SITE_CONFIG || {};
  const SB = CFG.supabase || {};
  const ONLINE = !!(SB.url && SB.anonKey);
  const ler = (k, p) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? p; } catch (e) { return p; } };
  const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem espaço */ } };
  const CHAVE_PEDIDOS = "policoating_demo_pedidos";

  const kgDaEmbalagem = (e) => { const m = String(e || "").match(/(\d+(?:[.,]\d+)?)\s*kg/i); return m ? parseFloat(m[1].replace(",", ".")) : 0; };
  const kgDoItem = (i) => (i.embalagem === "Sob medida" ? +i.qtd || 0 : (+i.qtd || 0) * kgDaEmbalagem(i.embalagem));
  const r2 = (v) => Math.round(v * 100) / 100;
  function precoEfetivo(p) {
    const preco = +p.preco || 0, promo = +p.precoPromo || 0;
    if (p.precoCombinar || !(preco > 0)) return null;
    const hoje = new Date().toISOString().slice(0, 10);
    return promo > 0 && promo < preco && (!p.promoAte || hoje <= p.promoAte) ? promo : preco;
  }
  const numeroNovo = () => { const d = new Date(); return "PC-" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-" + Math.random().toString(36).slice(2, 7).toUpperCase(); };

  /** Itens do carrinho com código, nome, kg e valores (o mesmo que o banco grava) */
  function montarItens(itens) {
    const produtos = window.PRODUTOS || [];
    return itens.map((i) => {
      const p = produtos.find((x) => x.id === i.id); if (!p) throw new Error("Um dos produtos não está mais disponível. Atualize o carrinho.");
      const kg = kgDoItem(i), preco = precoEfetivo(p);
      return { id: p.id, codigo: p.codigo || p.id.toUpperCase(), nome: p.nome, cor: p.cores[0].nome, embalagem: i.embalagem, qtd: i.qtd, kg,
        preco_kg: preco, subtotal: preco == null ? null : r2(preco * kg), foto: (p.fotos || [])[0] || p.cores[0].foto || null };
    });
  }
  const totais = (itens) => ({ total: r2(itens.reduce((s, i) => s + (+i.subtotal || 0), 0)), total_kg: r2(itens.reduce((s, i) => s + (+i.kg || 0), 0)), tem_combinar: itens.some((i) => i.preco_kg == null) });

  const Loja = {
    kgDoItem, online: ONLINE,

    /** Registra o pedido. itens: [{ id, embalagem, qtd }] -> número do pedido */
    async criarPedido(itens, obs) {
      const u = window.Conta && window.Conta.usuario;
      if (!u) throw new Error("Entre na sua conta para enviar o pedido.");
      const limpos = (itens || []).map((i) => ({ id: i.id, embalagem: i.embalagem, qtd: Math.max(1, parseInt(i.qtd, 10) || 1) }));
      if (!limpos.length) throw new Error("Seu carrinho está vazio.");
      obs = String(obs || "").replace(/\s+/g, " ").trim().slice(0, 500);
      if (!ONLINE) {
        const bl = await window.Conta.meuBloqueio(); if (bl) throw new Error(bl.mensagem);
        const linhas = montarItens(limpos), numero = numeroNovo();
        const t = ler(CHAVE_PEDIDOS, {});
        (t[u.email] = t[u.email] || []).unshift(Object.assign({ numero, criado_em: new Date().toISOString(), itens: linhas, observacoes: obs || null }, totais(linhas)));
        gravar(CHAVE_PEDIDOS, t);
        return numero;
      }
      const sb = await window.Conta.cliente();
      const { data, error } = await sb.rpc("criar_pedido", { p_itens: limpos, p_obs: obs || null });
      if (!error) return data;
      const m = String(error.message || "");
      // banco sem a função (ou com uma versão antiga): grava do jeito antigo
      if (/schema cache|not find the function|does not exist/i.test(m)) {
        const numero = numeroNovo(), linhas = montarItens(limpos);
        await window.Conta.registrarPedido({ numero, itens: linhas, observacoes: obs || null });
        return numero;
      }
      if (/CONTA_BLOQUEADA/.test(m)) { const d = m.match(/até (\d{2}\/\d{2}\/\d{4})/); throw Object.assign(new Error((d ? `Sua conta está suspensa até ${d[1]}.` : "Sua conta está bloqueada.") + " Para resolver, fale com a Policoating pelo WhatsApp."), { bloqueio: true }); }
      throw new Error(m || "Não foi possível registrar o pedido.");
    }
  };

  window.Loja = Loja;
})();
