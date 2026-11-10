import type { CSSProperties, ReactNode } from 'react';
import { fixtureTitle, issueLabel, shortDate, show } from '@/lib/format';
import type { PageDef } from '@/lib/paginator';
import { SECTION_LAYOUT } from '@/lib/paginator';
import type {
  BackPageData, ContentsData, FixturesData, HeadToHeadData, Issue, LastMatchData, NameValue,
  OwnerStaffData, SeasonStatsData, SponsorsData, SquadData, SquadPlayer, StandingsData, TransfersData, WelcomeData,
} from '@/lib/types';

const TICKETS_URL = process.env.NEXT_PUBLIC_TICKETS_URL || 'https://www.more.com';

type Side = 'left' | 'right';
export interface PageProps {
  issue: Issue;
  page: PageDef;
  toc: { title: string; page: number }[];
  fluid?: boolean;
}

function Frame({ side, ink, fluid, className = '', children, style }: { side: Side; ink?: boolean; fluid?: boolean; className?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className={`kp-page kp-${side} ${ink ? 'kp-ink' : ''} ${fluid ? 'kp-fluid' : ''} ${className}`} style={style} lang="el">
      {children}
      <div className="kp-gut" aria-hidden="true" />
    </div>
  );
}

function Folio({ n, label, side, style }: { n: number; label: string; side: Side; style?: CSSProperties }) {
  return (
    <p className="kp-folio" style={style}>
      {side === 'left' ? (<><b>{n}</b>{label}</>) : (<>{label}<b>{n}</b></>)}
    </p>
  );
}

function Slot({ url, caption, style, children, alt = '' }: { url?: string; caption: string; style?: CSSProperties; children?: ReactNode; alt?: string }) {
  return (
    <div className="kp-slot" style={style}>
      {url ? <img src={url} alt={alt} crossOrigin="anonymous" /> : <span className="kp-cap">{caption}</span>}
      {children}
    </div>
  );
}

const Ph = ({ v, fallback }: { v: string; fallback?: string }) => {
  const text = show(v, fallback);
  return text.includes('[') ? <span className="kp-ph">{text}</span> : <>{text}</>;
};

/* ------------------------------------------------------------------ sections */

function Welcome({ d, issue, n, side, fluid }: { d: WelcomeData; issue: Issue; n: number; side: Side; fluid?: boolean }) {
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in">
        <div className="kp-rh"><span>{issueLabel(issue)}</span><span>{fixtureTitle(issue)}</span></div>
        <img src="/brand/symbol-ink.png" alt="" style={{ height: 96, width: 'auto', alignSelf: 'flex-start', marginTop: 42 }} />
        <h2 className="kp-h2" style={{ fontSize: 56, margin: '30px 0 22px' }}>{show(d.title, 'Καλώς ήρθατε')}</h2>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.55, maxWidth: '38ch', color: '#4f4b4c', whiteSpace: 'pre-line' }}><Ph v={d.message} /></p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 28 }}>
          <Slot url={d.portraitUrl} caption="" style={{ width: 64, height: 64, flex: 'none' }} />
          <div style={{ fontSize: 13 }}><b><Ph v={d.signatureName} /></b><br /><span className="kp-mut">{d.signatureRole}</span></div>
        </div>
        <Folio n={n} side={side} label={SECTION_LAYOUT.welcome.label} />
      </div>
    </Frame>
  );
}

function Contents({ d, issue, part, n, side, toc, fluid }: { d: ContentsData; issue: Issue; part: number; n: number; side: Side; toc: PageProps['toc']; fluid?: boolean }) {
  if (part === 0) {
    return (
      <Frame side={side} fluid={fluid}>
        <Slot url={d.photoUrl} caption="Φωτογραφία τεύχους · full-bleed" style={{ flex: 1, minHeight: fluid ? 320 : undefined }}>
          <div className="kp-cond" style={{ position: 'absolute', left: 44, top: 44, fontSize: 110, lineHeight: 0.85, color: d.photoUrl ? '#fff' : '#231f20' }}>Τεύχος<br />{String(issue.number).padStart(2, '0')}</div>
        </Slot>
        <Folio n={n} side={side} label="Περιεχόμενα" style={{ position: 'absolute', left: 44, bottom: 34, color: d.photoUrl ? '#fff' : '#4f4b4c' }} />
      </Frame>
    );
  }
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in">
        <div className="kp-rh"><span>Περιεχόμενα</span><span>{issueLabel(issue)}</span></div>
        <h2 className="kp-h2">Περιεχόμενα</h2>
        <nav aria-label="Περιεχόμενα">
          {toc.map((t) => (
            <a key={t.title} href={`#page-${t.page}`} data-page={t.page} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '11px 0', borderBottom: '1px solid #ecebeb', fontSize: 17, color: '#231f20', textDecoration: 'none' }}>
              <span>{t.title}</span>
              <span style={{ fontFamily: 'Manrope', fontWeight: 800, color: '#8a6a2f' }}>{t.page}</span>
            </a>
          ))}
        </nav>
        <Folio n={n} side={side} label="Περιεχόμενα" />
      </div>
    </Frame>
  );
}

function PlayerRows({ list, tight }: { list: SquadPlayer[]; tight?: boolean }) {
  return (
    <>
      {list.map((p, i) => (
        <div key={i} className={`kp-row ${tight ? 'kp-tight' : ''}`}>
          <span className="kp-num">{p.number}</span>
          <span style={{ fontWeight: 600 }}>{p.name}</span>
          <span className="kp-mut">{p.nationality}</span>
          <span className="kp-mut" style={{ textAlign: 'right' }}>{p.birthYear}</span>
        </div>
      ))}
    </>
  );
}

function Squad({ d, issue, part, n, side, fluid }: { d: SquadData; issue: Issue; part: number; n: number; side: Side; fluid?: boolean }) {
  if (part === 0) {
    return (
      <Frame side={side} fluid={fluid}>
        <div className="kp-in">
          <div className="kp-rh"><span>Η αποστολή {issue.season}</span><img src="/brand/symbol-ink.png" alt="" style={{ height: 20 }} /></div>
          <h2 className="kp-h2">Η αποστολή</h2>
          <h3 className="kp-h3"><span>Τερματοφύλακες</span><span style={{ fontWeight: 400, color: '#7b7979' }}>Εθνικότητα · Έτος</span></h3>
          <PlayerRows list={d.goalkeepers} />
          <h3 className="kp-h3" style={{ marginTop: 16 }}>Αμυντικοί</h3>
          <PlayerRows list={d.defenders} />
          <Folio n={n} side={side} label="Η αποστολή" />
        </div>
      </Frame>
    );
  }
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in">
        <div className="kp-rh"><span>Η αποστολή {issue.season}</span><span>{issue.competition}</span></div>
        <h3 className="kp-h3" style={{ marginTop: 18 }}>Μέσοι</h3>
        <PlayerRows list={d.midfielders} tight />
        <h3 className="kp-h3" style={{ marginTop: 14 }}>Επιθετικοί</h3>
        <PlayerRows list={d.forwards} tight />
        <div style={{ marginTop: 14, padding: '10px 0', borderTop: '1px solid #231f20', borderBottom: '1px solid #231f20', display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
          <b>Προπονητής</b><span style={{ fontWeight: 600 }}><Ph v={d.coach} /></span>
        </div>
        <Folio n={n} side={side} label="Η αποστολή" />
      </div>
    </Frame>
  );
}

function Transfers({ d, issue, n, side, fluid }: { d: TransfersData; issue: Issue; n: number; side: Side; fluid?: boolean }) {
  return (
    <Frame side={side} fluid={fluid}>
      <Slot url={d.leadPhotoUrl} caption="Φωτογραφία κεντρικής μεταγραφής · 4:3" style={{ height: 360, flex: 'none', display: 'flex', alignItems: 'flex-end', paddingLeft: 44 }} alt={d.leadName}>
        <h2 className="kp-cond" style={{ position: 'relative', margin: '0 0 -12px', fontSize: 76, lineHeight: 0.86, color: d.leadPhotoUrl ? '#fff' : '#231f20' }}>Μεταγραφές<br />{issue.season}</h2>
      </Slot>
      <div style={{ padding: '30px 40px 0 44px' }}>
        <p style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 800, fontSize: 24, color: '#8a6a2f' }}>{show(d.leadName)}</p>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#4f4b4c' }}><Ph v={d.leadPosition} /> · από <Ph v={d.leadFromClub} /></p>
        <p style={{ margin: '14px 0 0', paddingLeft: 14, borderLeft: '2px solid #231f20', fontSize: 15, lineHeight: 1.45, maxWidth: '40ch' }}>«<Ph v={d.leadQuote} />»</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px', marginTop: 20 }}>
          {d.others.map((o, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 0', borderTop: '1px solid #ecebeb', fontSize: 12 }}>
              <Slot url={o.photoUrl} caption="" style={{ width: 36, height: 36, flex: 'none' }} />
              <span><b><Ph v={o.name} /></b><br /><span className="kp-mut">από <Ph v={o.fromClub} /></span></span>
            </div>
          ))}
        </div>
      </div>
      <Folio n={n} side={side} label="Μεταγραφές" style={{ padding: side === 'left' ? '0 0 34px 44px' : '0 44px 34px 0' }} />
    </Frame>
  );
}

function OwnerStaff({ d, n, side, fluid }: { d: OwnerStaffData; n: number; side: Side; fluid?: boolean }) {
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in">
        <div style={{ display: 'grid', gridTemplateColumns: '172px 1fr', gap: 20, alignItems: 'end' }}>
          <Slot url={d.ownerPhotoUrl} caption="" style={{ height: 228 }} alt={d.ownerName}>
            {!d.ownerPhotoUrl && <span className="kp-cap" style={{ left: 10, bottom: 10, fontSize: 10.5 }}>Πορτρέτο · 3:4</span>}
          </Slot>
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, color: '#4f4b4c' }}>{d.ownerRole}</p>
            <h2 style={{ margin: 0, fontFamily: 'Manrope', fontWeight: 800, fontSize: 36, lineHeight: 0.98, letterSpacing: '-0.03em' }}>{show(d.ownerName)}</h2>
          </div>
        </div>
        <p style={{ margin: '22px 0 0', fontSize: 14, lineHeight: 1.55, whiteSpace: 'pre-line' }}><Ph v={d.ownerBio} /></p>
        <h3 className="kp-h3" style={{ marginTop: 26 }}>Τεχνικό επιτελείο</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {d.staff.map((s, i) => (
            <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #ecebeb' }}>
              <div style={{ fontSize: 11, color: '#4f4b4c' }}>{s.role}</div>
              <div style={{ fontSize: 13, fontWeight: 600 }}><Ph v={s.name} /></div>
            </div>
          ))}
        </div>
        <Folio n={n} side={side} label="Ιδιοκτήτης και επιτελείο" />
      </div>
    </Frame>
  );
}

function LastMatch({ d, n, side, fluid }: { d: LastMatchData; n: number; side: Side; fluid?: boolean }) {
  const dim = 'rgba(255,255,255,.7)';
  return (
    <Frame side={side} ink fluid={fluid}>
      <div className="kp-in">
        <div className="kp-rh"><span>Προηγούμενος αγώνας</span><span>{d.label}</span></div>
        <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between', fontFamily: 'Manrope', fontWeight: 800, fontSize: 20 }}>
          <span>{d.homeTeam}</span><span style={{ color: dim }}>{d.awayTeam}</span>
        </div>
        <p aria-label={`${d.homeTeam} ${d.homeScore}, ${d.awayTeam} ${d.awayScore}`} style={{ margin: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', fontFamily: 'Manrope', fontWeight: 800, fontSize: 150, lineHeight: 0.95, letterSpacing: '-0.04em' }}>
          <span aria-hidden="true">{d.homeScore}</span>
          <span aria-hidden="true" style={{ width: 52, height: 6, background: '#d2ab67', margin: '0 16px' }} />
          <span aria-hidden="true" style={{ textAlign: 'right', color: dim }}>{d.awayScore}</span>
        </p>
        <h3 className="kp-h3" style={{ marginTop: 30 }}>Γκολ</h3>
        {d.goals.map((g, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '54px 1fr auto', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.15)', fontSize: 15 }}>
            <span style={{ fontFamily: 'Manrope', fontWeight: 700, color: g.side === 'home' ? '#d2ab67' : dim }}>{g.minute}</span>
            <span style={g.side === 'home' ? { fontWeight: 600 } : { color: dim }}>{g.scorer}</span>
            <span style={{ color: dim }}>{g.score}</span>
          </div>
        ))}
        <h3 className="kp-h3" style={{ marginTop: 22 }}>Αλλαγές</h3>
        {d.subs.map((s, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '54px 1fr', gap: 10, padding: '5px 0', fontSize: 13, color: dim }}>
            <span>{s.minute}</span><span><span style={{ color: '#fff' }}>{s.on}</span> αντί {s.off}</span>
          </div>
        ))}
        <Folio n={n} side={side} label="Προηγούμενος αγώνας" />
      </div>
    </Frame>
  );
}

function StatBlock({ title, list, chip, pad = 5 }: { title: string; list: NameValue[]; chip?: string; pad?: number }) {
  return (
    <section>
      <h3 className="kp-h3-lg">{chip && <span aria-hidden="true" style={{ width: 10, height: 14, background: chip }} />}{title}</h3>
      {list.map((r, i) => (<div key={i} className="kp-st" style={{ padding: `${pad}px 0` }}><span>{r.name}</span><b>{r.value}</b></div>))}
    </section>
  );
}

function SeasonStats({ d, n, side, fluid }: { d: SeasonStatsData; n: number; side: Side; fluid?: boolean }) {
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in">
        <div className="kp-rh"><span>Στατιστικά σεζόν</span><span>{d.afterLabel}</span></div>
        <h2 className="kp-h2">Στατιστικά σεζόν</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '26px 24px', alignItems: 'start' }}>
          <StatBlock title="Σκόρερ" list={d.scorers} />
          <StatBlock title="Ασίστ" list={d.assists} />
          <StatBlock title="Κίτρινες κάρτες" list={d.yellow} chip="#f2c200" pad={d.yellow.length > 8 ? 3.5 : 5} />
          <StatBlock title="Κόκκινες κάρτες" list={d.red} chip="#d6332a" />
        </div>
        <Folio n={n} side={side} label="Στατιστικά σεζόν" />
      </div>
    </Frame>
  );
}

const isKalamata = (t: string) => /καλαμ[άα]τα/i.test(t);

function Fixtures({ d, issue, n, side, fluid }: { d: FixturesData; issue: Issue; n: number; side: Side; fluid?: boolean }) {
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in">
        <div className="kp-rh"><span>{issue.competition}</span><span>Πρόγραμμα</span></div>
        <h2 className="kp-cond" style={{ margin: '26px 0', fontSize: 84, lineHeight: 0.88, whiteSpace: 'pre-line' }}>{d.title.replace(' ', '\n')}</h2>
        {d.fixtures.map((f, i) => {
          const hl = isKalamata(f.home) || isKalamata(f.away);
          return (
            <div key={i} className={hl ? 'kp-hl' : ''} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 14px 1fr', gap: 8, alignItems: 'center', padding: hl ? '11px 10px' : '11px 0', margin: hl ? '0 -10px' : 0, borderBottom: hl ? 'none' : '1px solid #ecebeb', fontSize: 14 }}>
              <span style={{ fontSize: 11.5, lineHeight: 1.3, color: hl ? 'rgba(255,255,255,.7)' : '#7b7979' }}><Ph v={f.when} fallback="[Ημ. · ώρα]" /></span>
              <span style={{ fontWeight: hl ? 700 : 400 }}><Ph v={f.home} /></span>
              <span style={{ color: hl ? '#fff' : '#7b7979' }}>–</span>
              <span style={{ fontWeight: hl ? 700 : 400 }}><Ph v={f.away} /></span>
            </div>
          );
        })}
        <Folio n={n} side={side} label="Αγωνιστική" />
      </div>
    </Frame>
  );
}

function Standings({ d, n, side, fluid }: { d: StandingsData; n: number; side: Side; fluid?: boolean }) {
  const v = (x: string) => (x === '' ? '–' : x);
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in">
        <div className="kp-rh"><span>Stoiximan Super League</span><span>{d.afterLabel}</span></div>
        <h2 className="kp-h2">Βαθμολογία</h2>
        <div style={{ overflowX: fluid ? 'auto' : 'visible' }}>
          <table className="kp-t">
            <thead>
              <tr style={{ borderBottom: '2px solid #231f20', fontSize: 11, color: '#4f4b4c' }}>
                <th className="l" style={{ width: 22 }} scope="col">#</th>
                <th className="l" scope="col">Ομάδα</th>
                <th scope="col" title="Αγώνες">Αγ</th><th scope="col" title="Νίκες">Ν</th><th scope="col" title="Ισοπαλίες">Ι</th><th scope="col" title="Ήττες">Η</th>
                <th scope="col">Γκολ</th><th scope="col" title="Διαφορά τερμάτων">Δ.Γ.</th><th scope="col" title="Βαθμοί" style={{ color: '#231f20' }}>Β</th>
              </tr>
            </thead>
            <tbody>
              {d.rows.map((r, i) => {
                const hl = isKalamata(r.team);
                const gd = r.goalsFor !== '' && r.goalsAgainst !== '' ? Number(r.goalsFor) - Number(r.goalsAgainst) : null;
                return (
                  <tr key={i} className={hl ? 'kp-hl' : ''} style={{ borderBottom: hl ? 'none' : '1px solid #ecebeb' }}>
                    <td className="l">{i + 1}</td>
                    <th className="l" scope="row" style={{ fontWeight: hl ? 700 : 400 }}><Ph v={r.team} fallback="[Ομάδα]" /></th>
                    <td>{v(r.played)}</td><td>{v(r.won)}</td><td>{v(r.drawn)}</td><td>{v(r.lost)}</td>
                    <td>{r.goalsFor !== '' && r.goalsAgainst !== '' ? `${r.goalsFor}–${r.goalsAgainst}` : '–'}</td>
                    <td>{gd === null ? '–' : gd > 0 ? `+${gd}` : String(gd)}</td>
                    <td><b>{v(r.points)}</b></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Folio n={n} side={side} label="Βαθμολογία" />
      </div>
    </Frame>
  );
}

export function h2hSummary(d: HeadToHeadData) {
  let w = 0, dr = 0, l = 0, gf = 0, ga = 0;
  const rows = d.games.map((g) => {
    const h = Number(g.homeGoals) || 0, a = Number(g.awayGoals) || 0;
    const k = g.kalamataHome ? h : a, o = g.kalamataHome ? a : h;
    gf += k; ga += o;
    const r = k > o ? 'Ν' : k === o ? 'Ι' : 'Η';
    if (r === 'Ν') w++; else if (r === 'Ι') dr++; else l++;
    return { ...g, result: r };
  });
  return { w, d: dr, l, gf, ga, rows };
}

function HeadToHead({ d, issue, part, n, side, fluid }: { d: HeadToHeadData; issue: Issue; part: number; n: number; side: Side; fluid?: boolean }) {
  const s = h2hSummary(d);
  if (part === 0) {
    return (
      <Frame side={side} fluid={fluid}>
        <Slot url={d.photoUrl} caption="Αρχειακή φωτογραφία αναμέτρησης · full-bleed" style={{ height: 300, flex: 'none' }} />
        <div style={{ padding: '30px 40px 0 44px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#4f4b4c' }}>{d.rangeLabel}</p>
          <h2 className="kp-cond" style={{ margin: 0, fontSize: 64, lineHeight: 0.9 }}>Καλαμάτα<br />{issue.opponent}</h2>
          <dl style={{ margin: '30px 0 0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', borderTop: '2px solid #231f20' }}>
            {([['Νίκες', s.w, '#8a6a2f'], ['Ισοπαλίες', s.d, '#231f20'], ['Ήττες', s.l, '#231f20']] as const).map(([lab, val, c], i) => (
              <div key={lab} style={{ padding: `12px 0 0 ${i ? 16 : 0}px`, borderLeft: i ? '1px solid #ecebeb' : 'none' }}>
                <dt style={{ fontSize: 12, color: '#4f4b4c' }}>{lab}</dt>
                <dd style={{ margin: '2px 0 0', fontFamily: 'Manrope', fontWeight: 800, fontSize: 56, lineHeight: 1, letterSpacing: '-0.03em', color: c }}>{val}</dd>
              </div>
            ))}
          </dl>
          <p style={{ margin: '14px 0 0', fontSize: 13, color: '#4f4b4c' }}>{d.games.length} αγώνες · γκολ Καλαμάτας {s.gf}, {issue.opponent} {s.ga}</p>
        </div>
        <Folio n={n} side={side} label="Αναμετρήσεις" style={{ padding: '0 0 34px 44px' }} />
      </Frame>
    );
  }
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in">
        <div className="kp-rh"><span>Αναμετρήσεις</span><span>Ν νίκη · Ι ισοπαλία · Η ήττα της Καλαμάτας</span></div>
        <table className="kp-t" style={{ marginTop: 14, fontSize: d.games.length > 16 ? 11.5 : 13 }}>
          <thead>
            <tr style={{ fontSize: 11, color: '#4f4b4c', borderBottom: '2px solid #231f20' }}>
              <th className="l" style={{ padding: '6px 0', width: 64 }} scope="col">Σεζόν</th>
              <th className="l" style={{ padding: '6px 0' }} scope="col">Αγώνας</th>
              <th style={{ padding: '6px 0', width: 44 }} scope="col">Σκορ</th>
              <th style={{ padding: '6px 0', width: 40 }} scope="col">Αποτ.</th>
            </tr>
          </thead>
          <tbody>
            {s.rows.map((g, i) => {
              const sameSeasonNext = s.rows[i + 1]?.season === g.season;
              const firstOfSeason = s.rows[i - 1]?.season !== g.season;
              const pad = d.games.length > 16 ? '6px 0' : '8.5px 0';
              return (
                <tr key={i} style={{ borderBottom: `1px solid ${sameSeasonNext ? '#ecebeb' : '#231f20'}` }}>
                  <td className="l" style={{ padding: pad, color: '#4f4b4c' }}>{firstOfSeason ? g.season : ''}</td>
                  <td className="l" style={{ padding: pad }}>{g.kalamataHome ? `Καλαμάτα – ${issue.opponent}` : `${issue.opponent} – Καλαμάτα`}</td>
                  <td style={{ padding: pad, fontWeight: 700, color: g.result === 'Ν' ? '#8a6a2f' : '#231f20' }}>{g.homeGoals}–{g.awayGoals}</td>
                  <td style={{ padding: pad }}>
                    <span className="kp-chip" style={{ background: g.result === 'Ν' ? '#231f20' : 'transparent', color: g.result === 'Ν' ? '#d2ab67' : g.result === 'Ι' ? '#231f20' : '#7b7979' }}>{g.result}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Folio n={n} side={side} label="Αναμετρήσεις" />
      </div>
    </Frame>
  );
}

function Sponsors({ d, n, side, fluid }: { d: SponsorsData; n: number; side: Side; fluid?: boolean }) {
  const body = d.adImageUrl ? (
    <img src={d.adImageUrl} alt={show(d.sponsorName, 'Χορηγός')} crossOrigin="anonymous" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  ) : (
    <div className="kp-slot" style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center' }}>
      <span style={{ fontFamily: 'Manrope', fontWeight: 800, fontSize: 28, color: '#4f4b4c' }}>{show(d.sponsorName, '[Κύριος χορηγός]').replace('[ΣΥΜΠΛΗΡΩΣΤΕ]', '[Κύριος χορηγός]')}</span>
      <span style={{ fontSize: 12, color: '#4f4b4c' }}>Ολοσέλιδη καταχώριση · 495 × 700</span>
    </div>
  );
  return (
    <Frame side={side} fluid={fluid} style={fluid ? { minHeight: 420 } : undefined}>
      <div style={{ flex: 1, position: 'relative' }}>
        {d.link ? <a href={d.link} target="_blank" rel="noopener noreferrer" style={{ display: 'block', height: '100%' }}>{body}</a> : body}
      </div>
      <Folio n={n} side={side} label="Χορηγοί" style={{ position: 'absolute', [side === 'left' ? 'left' : 'right']: 44, bottom: 34, color: d.adImageUrl ? '#fff' : '#4f4b4c' }} />
    </Frame>
  );
}

function BackPage({ d, issue, n, side, fluid }: { d: BackPageData; issue: Issue; n: number; side: Side; fluid?: boolean }) {
  return (
    <Frame side={side} fluid={fluid}>
      <div className="kp-in" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="kp-rh" style={{ width: '100%' }}><span>{issueLabel(issue)}</span><span>Επόμενος αγώνας</span></div>
        <img src="/brand/symbol-ink.png" alt="" style={{ height: 110, marginTop: 70 }} />
        <h2 className="kp-h2" style={{ fontSize: 42, margin: '34px 0 14px' }}>Ραντεβού στον επόμενο αγώνα</h2>
        <p style={{ margin: 0, fontSize: 15, color: '#4f4b4c' }}>
          <Ph v={d.nextOpponent} fallback="[Αντίπαλος]" /> · <Ph v={d.nextDate} fallback="[Ημερομηνία]" /> · <Ph v={d.nextTime} fallback="[Ώρα]" /> · <Ph v={d.nextStadium} fallback="[Γήπεδο]" />
        </p>
        <a href={TICKETS_URL} target="_blank" rel="noopener noreferrer" data-link="tickets" style={{ marginTop: 30, background: '#231f20', color: '#fff', fontWeight: 600, fontSize: 15, padding: '15px 28px', textDecoration: 'none' }}>Αγορά εισιτηρίων</a>
        <a href="#page-1" data-page={1} style={{ marginTop: 14, fontSize: 14, color: '#231f20', textUnderlineOffset: 4, padding: '6px 0' }}>Πίσω στην αρχή</a>
        <Folio n={n} side={side} label="Ραντεβού" style={{ width: '100%' }} />
      </div>
    </Frame>
  );
}

function Filler({ issue, n, side, fluid }: { issue: Issue; n: number; side: Side; fluid?: boolean }) {
  return (
    <Frame side={side} fluid={fluid}>
      <Slot url={issue.cover_photo_url} caption="Φωτογραφία τεύχους" style={{ flex: 1, minHeight: fluid ? 300 : undefined }} />
      <Folio n={n} side={side} label="" style={{ position: 'absolute', [side === 'left' ? 'left' : 'right']: 44, bottom: 34 }} />
    </Frame>
  );
}

/* ------------------------------------------------------------------ public */

export function PageView({ issue, page, toc, fluid }: PageProps) {
  const side: Side = page.number % 2 === 0 ? 'left' : 'right';
  const n = page.number;
  if (page.kind === 'endpaper') return <div className={`kp-page kp-stripes ${fluid ? 'kp-fluid' : ''}`} style={fluid ? { height: 120 } : undefined} aria-hidden="true" />;
  if (page.kind === 'filler') return <Filler issue={issue} n={n} side={side} fluid={fluid} />;
  const sec = issue.sections.find((s) => s.type === page.section);
  if (!sec) return null;
  const common = { n, side, fluid };
  switch (sec.type) {
    case 'welcome': return <Welcome d={sec.data} issue={issue} {...common} />;
    case 'contents': return <Contents d={sec.data} issue={issue} part={page.part} toc={toc} {...common} />;
    case 'squad': return <Squad d={sec.data} issue={issue} part={page.part} {...common} />;
    case 'transfers': return <Transfers d={sec.data} issue={issue} {...common} />;
    case 'owner_staff': return <OwnerStaff d={sec.data} {...common} />;
    case 'last_match': return <LastMatch d={sec.data} {...common} />;
    case 'season_stats': return <SeasonStats d={sec.data} {...common} />;
    case 'fixtures': return <Fixtures d={sec.data} issue={issue} {...common} />;
    case 'standings': return <Standings d={sec.data} {...common} />;
    case 'head_to_head': return <HeadToHead d={sec.data} issue={issue} part={page.part} {...common} />;
    case 'sponsors': return <Sponsors d={sec.data} {...common} />;
    case 'back_page': return <BackPage d={sec.data} issue={issue} {...common} />;
  }
}

/* ------------------------------------------------------------------ covers */

export function CoverFront({ issue, mask }: { issue: Issue; mask?: boolean }) {
  const photo = issue.cover_tone === 'photo' && issue.cover_photo_url;
  const white = issue.cover_tone === 'white';
  const bg = white ? '#ffffff' : '#231f20';
  const fg = white ? '#231f20' : '#ffffff';
  const sub = white ? '#4f4b4c' : 'rgba(255,255,255,.7)';
  const gold = white ? '#8a6a2f' : '#d2ab67';
  return (
    <div className={`kp-page ${mask ? 'kp-mask' : ''}`} style={{ background: bg }} lang="el">
      <div style={{ position: 'absolute', inset: 0, background: bg }} />
      {photo && <img src={issue.cover_photo_url} alt="" crossOrigin="anonymous" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
      <div className="kp-gold" style={{ position: 'absolute', inset: 22, border: `1.5px solid ${gold}` }} />
      <div className="kp-gold" style={{ position: 'absolute', inset: 29, border: `1px solid ${gold}` }} />
      <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 50px 54px', textAlign: 'center', background: 'transparent' }}>
        <div className="kp-gold" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: 12, letterSpacing: '.06em', color: gold, background: 'transparent' }}>
          <span>{issueLabel(issue)}</span><span>{shortDate(issue.kickoff_at)}</span>
        </div>
        {!photo && <img src="/brand/crest.png" alt="" style={{ height: 190, marginTop: 46 }} />}
        <div className="kp-gold" style={{ marginTop: photo ? 30 : 34, fontFamily: 'Manrope', fontWeight: 800, fontSize: 62, lineHeight: 0.88, letterSpacing: '-0.025em', color: gold, background: 'transparent', position: 'relative', zIndex: 1 }}>MATCH<br />PROGRAMME</div>
        {photo && issue.cover_cutout_url && (
          <img src={issue.cover_cutout_url} alt="" crossOrigin="anonymous" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, width: '100%', height: '82%', objectFit: 'contain', objectPosition: 'bottom', zIndex: 2 }} />
        )}
        <div className="kp-goldbg" style={{ width: 44, height: 2, background: gold, margin: photo ? 'auto 0 22px' : '26px 0 22px', position: 'relative', zIndex: 3 }} />
        <div className="kp-cond" style={{ fontSize: 46, lineHeight: 0.92, color: fg, background: 'transparent', position: 'relative', zIndex: 3 }}>
          {issue.cover_lines.slice(0, 4).map((l, i) => (
            <div key={i} className={l.gold ? 'kp-gold' : ''} style={{ color: l.gold ? gold : i === 0 ? fg : sub, background: 'transparent' }}>{l.text}</div>
          ))}
        </div>
        <div style={{ marginTop: photo ? 18 : 'auto', fontSize: 13, color: sub, background: 'transparent', position: 'relative', zIndex: 3 }}>{issue.matchday}η αγωνιστική · {issue.competition}</div>
      </div>
      <div className="kp-gold" style={{ position: 'absolute', right: 44, bottom: 44, fontSize: 11, padding: '4px 8px', border: `1px solid ${gold}`, color: gold, background: 'transparent', zIndex: 3 }}>Δωρεάν</div>
    </div>
  );
}

export function BackCover() {
  return (
    <div className="kp-page kp-ink">
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, paddingBottom: 64 }}>
        <img src="/brand/symbol-white.png" alt="" style={{ height: 92 }} />
        <img src="/brand/wordmark-white.png" alt="FC Kalamata" style={{ height: 20 }} />
      </div>
      <div className="kp-stripes" style={{ height: 110 }} />
      <div style={{ height: 6, background: '#d2ab67' }} />
    </div>
  );
}

export function Endpaper() {
  return <div className="kp-page kp-stripes" />;
}
