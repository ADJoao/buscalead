import { Gem, Radar, Waves } from 'lucide-react'
import { useState } from 'react'
import { money } from '../lib/format'
import { NICHES, PACKAGES, PRICE_TABLE, bestNiches } from '../lib/niches'

export function Niches() {
  const [lagos, setLagos] = useState(true)
  const ranked = bestNiches(lagos)
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow"><Gem size={13} /> Inteligência comercial</div>
          <h1 className="page-title">Nichos TOP</h1>
          <p className="page-sub">Os 6 nichos escolhidos pela pesquisa: precisam de verdade, cada cliente vale muito e não existe plataforma gigante resolvendo.</p>
        </div>
        <button className={`chip ${lagos ? 'on' : ''}`} onClick={() => setLagos((v) => !v)}><Waves size={14} /> Peso Região dos Lagos</button>
      </div>

      <div className="grid g-2">
        {ranked.map((n, i) => {
          const [a, b, c, d] = PRICE_TABLE.BR[n.package]
          return (
            <div key={n.id} className={`glass pad ${i < 3 ? 'glow' : ''}`}>
              <div className="row spread" style={{ alignItems: 'flex-start' }}>
                <div className="row" style={{ gap: 12 }}>
                  <span className="mono dim" style={{ fontSize: 22, fontWeight: 700, width: 30 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span style={{ fontSize: 26 }}>{n.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 650, fontSize: 15.5 }}>{n.label}</div>
                    <div className="row wrap" style={{ gap: 6, marginTop: 4 }}>
                      <span className="tier-top">TOP</span>
                      <span className="tag">{PACKAGES[n.package].short}</span>
                      {n.lagos && <span className="tag green"><Waves size={11} /> Lagos</span>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{ fontWeight: 650 }}>{money(a)}–{money(b)}</div>
                  <div className="mono accent" style={{ fontSize: 12.5 }}>+{money(c)}–{money(d)}/mês</div>
                </div>
              </div>
              <p className="muted" style={{ fontSize: 13.5, margin: '14px 0 10px' }}>{n.why}</p>
              <div className="block" style={{ padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Sistema que justifica a mensalidade</div>
                <div className="muted" style={{ fontSize: 13.5 }}>{n.system}</div>
              </div>
              <div className="block" style={{ padding: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Toque na ferida</div>
                <ul className="bullets red">{n.pains.map((p) => <li key={p}>{p}</li>)}</ul>
              </div>
              <div className="dim" style={{ fontSize: 12.5, marginTop: 10 }}>
                Gancho: <span className="muted">"{n.hook}"</span>
              </div>
              {n.compliance && <div className="tag amber mt-s" style={{ height: 'auto', padding: '6px 10px', whiteSpace: 'normal' }}>⚠ {n.compliance}</div>}
            </div>
          )
        })}
      </div>
      <p className="dim mt" style={{ fontSize: 12.5 }}>
        <Radar size={12} style={{ verticalAlign: -2 }} /> Para minerar esses nichos, use "Minerar os melhores" em Buscar leads. Tabela de preços dos EUA e de Portugal aparece em cada lead. Total de {NICHES.length} nichos.
      </p>
    </>
  )
}
