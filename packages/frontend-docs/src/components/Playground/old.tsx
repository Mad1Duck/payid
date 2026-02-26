import { useState, useEffect, useRef } from 'react';
import { RuleIcon } from '../RuleIcon';
import { PinBlock } from '../PinBlock';
import { PhysBtn } from '../PhysBtn';
import { Cartridge } from '../Cartridge';
import { LEDDot } from '../LEDDot';

const RULES = [
  {
    id: 'no_cursed',
    label: 'NO 666',
    icon: '👹',
    color: '#E53935',
    bg: '#FFCDD2',
    chip: 'MOD',
    desc: 'Block multiples of 666',
  },
  {
    id: 'min_tx',
    label: 'MIN 10',
    icon: '⚡',
    color: '#1565C0',
    bg: '#BBDEFB',
    chip: 'MIN',
    desc: 'Minimum 10 USDC',
  },
  {
    id: 'daily_cap',
    label: 'DAY CAP',
    icon: '🌅',
    color: '#E65100',
    bg: '#FFE0B2',
    chip: 'CAP',
    desc: 'Max $500 per day',
  },
  {
    id: 'kyc_only',
    label: 'KYC',
    icon: '🔐',
    color: '#6A1B9A',
    bg: '#E1BEE7',
    chip: 'KYC',
    desc: 'Verified wallets only',
  },
  {
    id: 'weekday',
    label: 'WKDAY',
    icon: '🌿',
    color: '#2E7D32',
    bg: '#C8E6C9',
    chip: 'WKD',
    desc: 'Mon–Fri only',
  },
  {
    id: 'no_bots',
    label: 'NO BOTS',
    icon: '🤖',
    color: '#4E342E',
    bg: '#D7CCC8',
    chip: 'BOT',
    desc: 'Block contract callers',
  },
  {
    id: 'timelock',
    label: 'T-LOCK',
    icon: '⏳',
    color: '#00695C',
    bg: '#B2DFDB',
    chip: 'TME',
    desc: '30s cooldown',
  },
  {
    id: 'whitelist',
    label: 'WLIST',
    icon: '✨',
    color: '#880E4F',
    bg: '#FCE4EC',
    chip: 'WLT',
    desc: 'Approved recipients',
  },
];

const WALLETS = [
  {
    id: 'metamask',
    name: 'MetaMask',
    icon: '🦊',
    desc: 'Browser extension',
    color: '#F6851B',
    bg: '#FFF3E0',
  },
  {
    id: 'rainbow',
    name: 'Rainbow',
    icon: '🌈',
    desc: 'Mobile & web wallet',
    color: '#8B5CF6',
    bg: '#EDE9FE',
  },
  {
    id: 'coinbase',
    name: 'Coinbase',
    icon: '🔵',
    desc: 'Coinbase Wallet',
    color: '#0052FF',
    bg: '#EFF6FF',
  },
  {
    id: 'walletconnect',
    name: 'WalletConnect',
    icon: '🔗',
    desc: 'Scan with any wallet',
    color: '#3B99FC',
    bg: '#E8F4FF',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    icon: '👻',
    desc: 'Solana & EVM',
    color: '#AB9FF2',
    bg: '#F3F0FF',
  },
];

const EMOJIS = [
  '👹',
  '⚡',
  '🌅',
  '🔐',
  '🌿',
  '🤖',
  '⏳',
  '✨',
  '🛡️',
  '🎯',
  '💎',
  '🔥',
  '❄️',
  '⚠️',
  '🚫',
  '✅',
  '💰',
  '🌙',
  '⭐',
  '🎮',
];
const COLORS = [
  { color: '#E53935', bg: '#FFCDD2' },
  { color: '#1565C0', bg: '#BBDEFB' },
  { color: '#E65100', bg: '#FFE0B2' },
  { color: '#6A1B9A', bg: '#E1BEE7' },
  { color: '#2E7D32', bg: '#C8E6C9' },
  { color: '#00695C', bg: '#B2DFDB' },
  { color: '#880E4F', bg: '#FCE4EC' },
  { color: '#4E342E', bg: '#D7CCC8' },
  { color: '#0277BD', bg: '#B3E5FC' },
  { color: '#558B2F', bg: '#DCEDC8' },
];
const CHIPS = ['MOD', 'MIN', 'CAP', 'KYC', 'WKD', 'BOT', 'TME', 'WLT', 'MAX', 'SEC'];
export const SAGE = '#5A8A50';

const shortAddr = (a) => (a ? `${a.slice(0, 6)}...${a.slice(-4)}` : '');
const randAddr = () => {
  let a = '0x';
  for (let i = 0; i < 40; i++) a += '0123456789abcdef'[Math.floor(Math.random() * 16)];
  return a;
};

// ─── Field helper ────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div
        style={{
          fontFamily: "'Space Mono',monospace",
          fontSize: '7px',
          color: '#888',
          letterSpacing: '2px',
          marginBottom: '6px',
        }}>
        {label}
      </div>
      {children}
    </div>
  );
}

// ─── WalletModal ─────────────────────────────────────────────────
function WalletModal({ onClose, onConnect }) {
  const [connecting, setConnecting] = useState(null);
  const [connected, setConnected] = useState(null);

  const tryConnect = (w) => {
    setConnecting(w.id);
    setTimeout(() => {
      setConnecting(null);
      setConnected({ ...w, address: randAddr() });
    }, 1400);
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(6px)',
        padding: '20px',
      }}>
      <div
        style={{
          background: 'linear-gradient(160deg,#ECECF0,#E0E0E4)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 24px 60px #00000045,0 4px 0 #C0C0C4,inset 0 1px 0 #F8F8FC',
          overflow: 'hidden',
          animation: 'slidein .22s ease-out',
        }}>
        <div
          style={{
            background: 'linear-gradient(90deg,#1A237E,#283593)',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
          <span
            style={{
              fontFamily: "'Orbitron',monospace",
              fontWeight: 900,
              fontSize: '11px',
              color: '#FFF',
              letterSpacing: '2px',
            }}>
            🔌 CONNECT WALLET
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.15)',
              border: 'none',
              color: '#FFF',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}>
            ✕
          </button>
        </div>
        <div style={{ padding: '18px' }}>
          {connected ? (
            <div style={{ animation: 'slidein .3s ease-out' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>{connected.icon}</div>
                <div
                  style={{
                    fontFamily: "'Orbitron',monospace",
                    fontWeight: 900,
                    fontSize: '13px',
                    color: '#2E7D32',
                    letterSpacing: '2px',
                  }}>
                  CONNECTED ✓
                </div>
              </div>
              <div
                style={{
                  background: 'linear-gradient(135deg,#E8F5E9,#F1F8E9)',
                  border: '2px solid #4CAF5055',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '16px',
                }}>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: '7px',
                    color: '#888',
                    letterSpacing: '2px',
                    marginBottom: '8px',
                  }}>
                  WALLET ADDRESS
                </div>
                <div
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: '10px',
                    color: '#1A237E',
                    fontWeight: 700,
                    wordBreak: 'break-all',
                    lineHeight: 1.6,
                  }}>
                  {connected.address}
                </div>
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  {[
                    ['NETWORK', 'LISK'],
                    ['CHAIN ID', '4202'],
                    ['STATUS', 'LIVE'],
                  ].map(([l, v]) => (
                    <div
                      key={l}
                      style={{
                        flex: 1,
                        background: '#E8F5E9',
                        border: '1px solid #A5D6A7',
                        borderRadius: '6px',
                        padding: '5px 8px',
                        textAlign: 'center',
                      }}>
                      <div
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: '6.5px',
                          color: '#888',
                        }}>
                        {l}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Orbitron',monospace",
                          fontSize: '8px',
                          color: '#2E7D32',
                          fontWeight: 700,
                          marginTop: '2px',
                        }}>
                        {v}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <button
                onClick={() => {
                  onConnect(connected);
                  onClose();
                }}
                style={{
                  width: '100%',
                  height: '46px',
                  background: 'linear-gradient(180deg,#43A047,#2E7D32)',
                  border: 'none',
                  borderRadius: '12px',
                  fontFamily: "'Orbitron',monospace",
                  fontWeight: 900,
                  fontSize: '10px',
                  color: '#FFF',
                  letterSpacing: '2px',
                  cursor: 'pointer',
                  boxShadow: '0 5px 0 #1B5E20,inset 0 1px 0 rgba(255,255,255,.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}>
                ✓ CONFIRM CONNECTION
              </button>
            </div>
          ) : (
            <>
              <div
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: '7.5px',
                  color: '#888',
                  letterSpacing: '2px',
                  marginBottom: '12px',
                  textAlign: 'center',
                }}>
                SELECT A WALLET TO CONNECT
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  marginBottom: '16px',
                }}>
                {WALLETS.map((w) => (
                  <button
                    key={w.id}
                    onClick={() => tryConnect(w)}
                    disabled={!!connecting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      background: connecting === w.id ? w.bg : `${w.bg}80`,
                      border: `2px solid ${w.color}${connecting === w.id ? 'FF' : '44'}`,
                      borderRadius: '12px',
                      cursor: connecting ? 'wait' : 'pointer',
                      transition: 'all .2s',
                      width: '100%',
                      textAlign: 'left',
                    }}>
                    <div
                      style={{
                        width: '38px',
                        height: '38px',
                        background: w.bg,
                        border: `2px solid ${w.color}55`,
                        borderRadius: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '20px',
                        flexShrink: 0,
                      }}>
                      {connecting === w.id ? (
                        <span style={{ animation: 'blink .5s infinite', fontSize: '14px' }}>
                          ⚙️
                        </span>
                      ) : (
                        w.icon
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: "'Orbitron',monospace",
                          fontWeight: 700,
                          fontSize: '10px',
                          color: w.color,
                          letterSpacing: '1px',
                        }}>
                        {w.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: '7.5px',
                          color: '#888',
                          marginTop: '2px',
                        }}>
                        {connecting === w.id ? 'Connecting...' : w.desc}
                      </div>
                    </div>
                    <span style={{ color: '#CCC', fontSize: '12px' }}>›</span>
                  </button>
                ))}
              </div>
              <div
                style={{
                  textAlign: 'center',
                  fontFamily: "'Space Mono',monospace",
                  fontSize: '7px',
                  color: '#BBB',
                  lineHeight: 1.7,
                }}>
                By connecting you agree to the{' '}
                <span style={{ color: SAGE, cursor: 'pointer' }}>PAY.ID Terms</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CreateModal ─────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [label, setLabel] = useState('');
  const [desc, setDesc] = useState('');
  const [ico, setIco] = useState('🎯');
  const [imgSrc, setImgSrc] = useState(null);
  const [useImg, setUseImg] = useState(false);
  const [ci, setCi] = useState(0);
  const [chip, setChip] = useState('MOD');
  const fileRef = useRef(null);
  const c = COLORS[ci];
  const activeIcon = useImg && imgSrc ? imgSrc : ico;
  const prev = {
    label: label || 'MY RULE',
    desc: desc || 'Custom rule',
    icon: activeIcon,
    color: c.color,
    bg: c.bg,
    chip,
    id: 'prev',
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      setImgSrc(ev.target.result);
      setUseImg(true);
    };
    r.readAsDataURL(f);
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,.38)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(5px)',
        padding: '20px',
      }}>
      <div
        style={{
          background: 'linear-gradient(160deg,#ECECF0,#E0E0E4)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '380px',
          boxShadow: '0 24px 60px #00000045,0 4px 0 #C0C0C4',
          overflow: 'hidden',
          animation: 'slidein .22s ease-out',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}>
        <div
          style={{
            background: `linear-gradient(90deg,${SAGE},#4A7A42)`,
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}>
          <span
            style={{
              fontFamily: "'Orbitron',monospace",
              fontWeight: 900,
              fontSize: '11px',
              color: '#FFF',
              letterSpacing: '2px',
            }}>
            ✦ CREATE RULE
          </span>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(0,0,0,.2)',
              border: 'none',
              color: '#FFF',
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '12px',
            }}>
            ✕
          </button>
        </div>
        <div style={{ padding: '18px' }}>
          <Field label="PREVIEW">
            <Cartridge rule={prev} plugged onDragStart={undefined} onDragEnd={undefined} />
          </Field>

          <Field label="RULE NAME">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value.toUpperCase().slice(0, 10))}
              placeholder="e.g. MAX 1000"
              style={{
                width: '100%',
                padding: '10px 14px',
                background: '#D8D8DC',
                border: '1.5px solid #C0C0C4',
                borderRadius: '8px',
                fontFamily: "'Orbitron',monospace",
                fontWeight: 700,
                fontSize: '12px',
                color: '#333',
                letterSpacing: '2px',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px #00000015',
              }}
            />
          </Field>

          <Field label="DESCRIPTION">
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value.slice(0, 40))}
              placeholder="Short description..."
              style={{
                width: '100%',
                padding: '9px 14px',
                background: '#D8D8DC',
                border: '1.5px solid #C0C0C4',
                borderRadius: '8px',
                fontFamily: "'Space Mono',monospace",
                fontSize: '10px',
                color: '#555',
                outline: 'none',
                boxShadow: 'inset 0 2px 4px #00000015',
              }}
            />
          </Field>

          <Field label="ICON">
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              {[
                ['EMOJI', '🙂'],
                ['UPLOAD', '📁'],
              ].map(([t, e]) => {
                const active = (!useImg && t === 'EMOJI') || (useImg && t === 'UPLOAD');
                return (
                  <button
                    key={t}
                    onClick={() => {
                      if (t === 'UPLOAD' && !imgSrc) fileRef.current?.click();
                      setUseImg(t === 'UPLOAD');
                    }}
                    style={{
                      flex: 1,
                      height: '32px',
                      fontFamily: "'Space Mono',monospace",
                      fontSize: '8px',
                      fontWeight: 700,
                      letterSpacing: '1px',
                      border: `2px solid ${active ? c.color : '#C8C8CC'}`,
                      background: active ? `${c.bg}60` : '#D0D0D4',
                      color: active ? c.color : '#888',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                    }}>
                    <span>{e}</span>
                    {t}
                  </button>
                );
              })}
            </div>
            {useImg ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    height: '80px',
                    border: `2px dashed ${c.color}66`,
                    borderRadius: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    background: `${c.bg}15`,
                  }}>
                  {imgSrc ? (
                    <img
                      src={imgSrc}
                      style={{
                        width: '52px',
                        height: '52px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                      }}
                      alt=""
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: '24px' }}>⬆️</span>
                      <span
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: '8px',
                          color: c.color,
                          letterSpacing: '1px',
                        }}>
                        CLICK TO UPLOAD
                      </span>
                      <span
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: '7px',
                          color: '#AAA',
                        }}>
                        PNG, JPG, SVG, WEBP
                      </span>
                    </>
                  )}
                </div>
                {imgSrc && (
                  <button
                    onClick={() => {
                      setImgSrc(null);
                      setUseImg(false);
                    }}
                    style={{
                      fontFamily: "'Space Mono',monospace",
                      fontSize: '8px',
                      color: '#E53935',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                    }}>
                    ✕ Remove
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onFile}
                  style={{ display: 'none' }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setIco(e)}
                    style={{
                      width: '34px',
                      height: '34px',
                      fontSize: '17px',
                      background: ico === e ? c.bg : '#D0D0D4',
                      border: `2px solid ${ico === e ? c.color : 'transparent'}`,
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: ico === e ? `0 2px 8px ${c.color}44` : 'none',
                    }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <Field label="COLOR">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
              {COLORS.map((col, idx) => (
                <button
                  key={idx}
                  onClick={() => setCi(idx)}
                  style={{
                    width: '28px',
                    height: '28px',
                    background: `radial-gradient(circle at 35% 35%,${col.bg},${col.color})`,
                    border: `3px solid ${ci === idx ? col.color : 'transparent'}`,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    boxShadow: ci === idx ? `0 0 8px ${col.color}88` : '0 2px 4px #00000020',
                    outline: ci === idx ? '2px solid white' : 'none',
                    outlineOffset: '-3px',
                  }}
                />
              ))}
            </div>
          </Field>

          <Field label="BADGE">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
              {CHIPS.map((ch) => (
                <button
                  key={ch}
                  onClick={() => setChip(ch)}
                  style={{
                    padding: '4px 10px',
                    fontFamily: "'Space Mono',monospace",
                    fontWeight: 700,
                    fontSize: '8px',
                    color: chip === ch ? c.color : '#888',
                    background: chip === ch ? `${c.bg}80` : '#D0D0D4',
                    border: `2px solid ${chip === ch ? c.color : 'transparent'}`,
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}>
                  {ch}
                </button>
              ))}
            </div>
          </Field>

          <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
            <button
              onClick={onClose}
              style={{
                flex: 1,
                height: '42px',
                background: '#C8C8CC',
                border: 'none',
                borderRadius: '10px',
                fontFamily: "'Space Mono',monospace",
                fontSize: '9px',
                color: '#666',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #A8A8AC',
              }}>
              CANCEL
            </button>
            <button
              onClick={() => {
                if (!label.trim()) return;
                onCreate({ ...prev, id: 'c' + Date.now() });
                onClose();
              }}
              disabled={!label.trim()}
              style={{
                flex: 2,
                height: '42px',
                background: !label.trim()
                  ? '#D0D0D4'
                  : `linear-gradient(180deg,${c.bg},${c.color}CC)`,
                border: `2px solid ${c.color}`,
                borderRadius: '10px',
                fontFamily: "'Orbitron',monospace",
                fontWeight: 900,
                fontSize: '10px',
                color: !label.trim() ? '#AAA' : '#FFF',
                cursor: !label.trim() ? 'not-allowed' : 'pointer',
                boxShadow: !label.trim() ? 'none' : `0 4px 0 ${c.color}AA`,
                letterSpacing: '1px',
              }}>
              + CREATE RULE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PAYIDConsole() {
  const [allRules, setAllRules] = useState(RULES);
  const [slots, setSlots] = useState([RULES[0], RULES[1], RULES[2], null, null, null]);
  const [drag, setDrag] = useState(null);
  const [overSlot, setOverSlot] = useState(null);
  const [amt, setAmt] = useState('150');
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showWallet, setShowWallet] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [plugged, setPlugged] = useState(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((p) => p + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const active = slots.filter(Boolean);
  const freeRules = allRules.filter((r) => !slots.find((s) => s?.id === r.id));

  const dropSlot = (e, i) => {
    e.preventDefault();
    if (!drag) return;
    const s = [...slots];
    if (drag.src.type === 'slot') s[drag.src.i] = null;
    s[i] = drag.rule;
    setSlots(s);
    setPlugged(i);
    setTimeout(() => setPlugged(null), 500);
    setDrag(null);
    setOverSlot(null);
    setResult(null);
  };
  const dropLib = (e) => {
    e.preventDefault();
    if (drag?.src.type !== 'slot') return;
    const s = [...slots];
    s[drag.src.i] = null;
    setSlots(s);
    setDrag(null);
    setOverSlot(null);
  };
  const eject = (i) => {
    const s = [...slots];
    s[i] = null;
    setSlots(s);
    setResult(null);
  };

  const runTest = () => {
    if (!active.length || testing) return;
    setTesting(true);
    setResult(null);
    setTimeout(() => {
      const n = parseFloat(amt) || 0;
      let fail = null;
      for (const r of active) {
        if (r.id === 'no_cursed' && n > 0 && n % 666 === 0) {
          fail = r;
          break;
        }
        if (r.id === 'min_tx' && n < 10) {
          fail = r;
          break;
        }
        if (r.id === 'daily_cap' && n > 500) {
          fail = r;
          break;
        }
      }
      setResult({ allow: !fail, failedRule: fail, amount: n, ts: new Date().toISOString() });
      setTesting(false);
    }, 1100);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'radial-gradient(ellipse at 50% 30%,#F0EEE8,#E0DED8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        fontFamily: "'Space Mono',monospace",
      }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        ::-webkit-scrollbar{height:3px;width:3px} ::-webkit-scrollbar-track{background:#D8D8DC} ::-webkit-scrollbar-thumb{background:#B0B0B4;border-radius:2px}
        @keyframes ledpulse{0%,100%{opacity:1}50%{opacity:.6}}
        @keyframes ledring{0%{transform:scale(1);opacity:.45}100%{transform:scale(2.8);opacity:0}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.1}}
        @keyframes slidein{0%{opacity:0;transform:translateY(7px)}100%{opacity:1;transform:translateY(0)}}
        @keyframes screenon{0%{opacity:0;filter:brightness(3)}100%{opacity:1;filter:brightness(1)}}
        @keyframes wpulse{0%,100%{box-shadow:0 5px 0 #0D47A1,0 6px 10px #00000020}50%{box-shadow:0 5px 0 #0D47A1,0 6px 20px #1565C044}}
        input:focus{outline:none} input::placeholder{color:#B8B8BC}
      `}</style>

      <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
        <div
          style={{
            position: 'absolute',
            bottom: '-18px',
            left: '8%',
            right: '8%',
            height: '20px',
            background: 'radial-gradient(ellipse,#00000028,transparent 70%)',
            filter: 'blur(10px)',
          }}
        />

        {/* SHELL */}
        <div
          style={{
            background: 'linear-gradient(160deg,#E8E8EC,#D0D0D4 40%,#C8C8CC)',
            borderRadius: '22px 22px 28px 28px',
            boxShadow:
              '0 1px 0 #F8F8FC,0 8px 0 #B8B8BC,0 9px 0 #A8A8AC,0 12px 40px #00000030,inset 0 2px 0 #F0F0F4,inset 2px 0 0 #E0E0E4,inset -2px 0 0 #C0C0C4',
          }}>
          {/* TABS */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '36px',
              padding: '0 48px',
              zIndex: 2,
            }}>
            {[0, 1].map((i) => (
              <div
                key={i}
                style={{
                  width: '52px',
                  height: '20px',
                  background: `linear-gradient(180deg,#7AAE6A,${SAGE} 50%,#3A6030)`,
                  borderRadius: '8px 8px 0 0',
                  boxShadow: 'inset 0 2px 0 #9ACA88,inset 2px 0 0 #6A9E58,inset -2px 0 0 #4A7A40',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '4px',
                }}>
                <div
                  style={{
                    width: '30px',
                    height: '5px',
                    background: '#2A5020',
                    borderRadius: '2px',
                    boxShadow: 'inset 0 2px 3px #00000040',
                  }}
                />
              </div>
            ))}
          </div>

          <div style={{ padding: '14px 18px 22px' }}>
            {/* TOPBAR */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
                gap: '8px',
              }}>
              <div
                style={{
                  fontFamily: "'Orbitron',monospace",
                  fontWeight: 900,
                  fontSize: '12px',
                  letterSpacing: '3px',
                  color: '#444',
                  flexShrink: 0,
                }}>
                PAY<span style={{ color: SAGE }}>.</span>ID
              </div>

              {wallet ? (
                <button
                  onClick={() => setShowWallet(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(180deg,#E3F2FD,#BBDEFB)',
                    border: '2px solid #1565C0AA',
                    borderRadius: '20px',
                    padding: '4px 10px 4px 6px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 0 #0D47A1,inset 0 1px 0 rgba(255,255,255,.7)',
                    flex: 1,
                    maxWidth: '160px',
                  }}>
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%,${wallet.bg},${wallet.color})`,
                      border: `2px solid ${wallet.color}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      flexShrink: 0,
                    }}>
                    {wallet.icon}
                  </div>
                  <div
                    style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: '8px',
                      color: '#1565C0',
                      fontWeight: 700,
                      flex: 1,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                    {shortAddr(wallet.address)}
                  </div>
                  <div
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      background: '#4CAF50',
                      boxShadow: '0 0 4px #4CAF50',
                      flexShrink: 0,
                    }}
                  />
                </button>
              ) : (
                <button
                  onClick={() => setShowWallet(true)}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'translateY(3px)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'linear-gradient(180deg,#1976D2,#1565C0)',
                    border: 'none',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    fontFamily: "'Orbitron',monospace",
                    fontWeight: 700,
                    fontSize: '7.5px',
                    color: '#FFF',
                    letterSpacing: '1.5px',
                    boxShadow: '0 4px 0 #0D47A1,inset 0 1px 0 rgba(255,255,255,.3)',
                    animation: 'wpulse 3s infinite',
                    flex: 1,
                    maxWidth: '160px',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                  }}>
                  <span style={{ fontSize: '11px' }}>🔌</span> CONNECT
                </button>
              )}

              <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                <LEDDot color={wallet ? '#4CAF50' : '#9E9E9E'} pulse={!!wallet} />
                <span
                  style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: '9px',
                    color: '#888',
                    letterSpacing: '1px',
                  }}>
                  {ts}
                </span>
              </div>
            </div>

            {/* SCREEN BEZEL */}
            <div
              style={{
                background: 'linear-gradient(170deg,#C8C8CC,#B8B8BC)',
                borderRadius: '14px',
                padding: '8px',
                marginBottom: '14px',
                boxShadow: 'inset 0 4px 12px #00000030,inset 0 -2px 4px #D8D8DC,0 2px 0 #D0D0D4',
              }}>
              <div style={{ display: 'flex', gap: '3px', marginBottom: '6px', padding: '0 4px' }}>
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '2px',
                      background: i % 3 === 0 ? '#A0A0A4' : '#ACACB0',
                      borderRadius: '1px',
                    }}
                  />
                ))}
              </div>

              {/* SCREEN */}
              <div
                style={{
                  background: 'linear-gradient(160deg,#E8F0E0,#DCE8D4)',
                  borderRadius: '9px',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 2px 10px #00000020,inset 0 0 0 1.5px #C0CCB8',
                  position: 'relative',
                  animation: 'screenon .5s ease-out',
                }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    pointerEvents: 'none',
                    zIndex: 10,
                    background:
                      'repeating-linear-gradient(0deg,transparent,transparent 2px,#00000008 2px,#00000008 3px)',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '45%',
                    background: 'linear-gradient(180deg,rgba(255,255,255,.18),transparent)',
                    borderRadius: '9px 9px 0 0',
                    pointerEvents: 'none',
                    zIndex: 11,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '5px',
                    right: '10px',
                    width: '30px',
                    height: '10px',
                    background: 'rgba(255,255,255,.25)',
                    borderRadius: '50%',
                    transform: 'rotate(-20deg)',
                    pointerEvents: 'none',
                    zIndex: 11,
                    filter: 'blur(3px)',
                  }}
                />

                {/* screen topbar */}
                <div
                  style={{
                    background: 'linear-gradient(90deg,#B8C8B0,#C8D8C0)',
                    borderBottom: '1px solid #B0C0A8',
                    padding: '6px 12px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    position: 'relative',
                    zIndex: 12,
                  }}>
                  <span
                    style={{ fontSize: '7px', color: SAGE, letterSpacing: '2px', fontWeight: 700 }}>
                    ● POLICY DEVICE
                  </span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[...Array(6)].map((_, i) => (
                      <div
                        key={i}
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: slots[i]
                            ? `radial-gradient(circle at 35% 35%,${slots[i].bg},${slots[i].color})`
                            : '#C8D0C0',
                          boxShadow: slots[i]
                            ? `0 0 4px ${slots[i].color}88`
                            : 'inset 0 1px 0 #D8E0D0',
                          transition: 'all .3s cubic-bezier(0.34,1.56,0.64,1)',
                          transform: plugged === i ? 'scale(1.4)' : 'scale(1)',
                        }}
                      />
                    ))}
                  </div>
                  <span style={{ fontSize: '7px', color: '#8A9A88' }}>{active.length}/6</span>
                </div>

                {/* screen body */}
                <div
                  style={{ padding: '12px', minHeight: '200px', position: 'relative', zIndex: 12 }}>
                  {!wallet && (
                    <div
                      style={{
                        background: '#FFF8E1',
                        border: '1.5px solid #FFD54F',
                        borderLeft: '3px solid #FFC107',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        marginBottom: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                      }}>
                      <span style={{ fontSize: '14px' }}>⚠️</span>
                      <div>
                        <div
                          style={{
                            fontFamily: "'Orbitron',monospace",
                            fontSize: '8px',
                            fontWeight: 700,
                            color: '#F57F17',
                            letterSpacing: '1px',
                          }}>
                          NO WALLET
                        </div>
                        <div
                          style={{
                            fontFamily: "'Space Mono',monospace",
                            fontSize: '7px',
                            color: '#888',
                            marginTop: '1px',
                          }}>
                          Connect wallet to deploy rules
                        </div>
                      </div>
                    </div>
                  )}

                  {testing ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '140px',
                        gap: '12px',
                      }}>
                      <div style={{ fontSize: '32px', animation: 'blink .6s infinite' }}>⚙️</div>
                      <div
                        style={{
                          fontFamily: "'Orbitron',monospace",
                          fontSize: '9px',
                          color: SAGE,
                          letterSpacing: '3px',
                        }}>
                        EVALUATING
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: SAGE,
                              animation: `blink 1s infinite ${i * 0.2}s`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  ) : result ? (
                    <div style={{ animation: 'slidein .3s ease-out' }}>
                      <div
                        style={{
                          background: result.allow
                            ? 'linear-gradient(135deg,#E8F5E8,#F0FAF0)'
                            : 'linear-gradient(135deg,#FDEAEA,#FEF0F0)',
                          border: `2px solid ${result.allow ? '#4CAF50' : '#F44336'}44`,
                          borderLeft: `4px solid ${result.allow ? '#4CAF50' : '#F44336'}`,
                          borderRadius: '10px',
                          padding: '12px 14px',
                        }}>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '10px',
                          }}>
                          <span style={{ fontSize: '28px' }}>{result.allow ? '✅' : '❌'}</span>
                          <div>
                            <div
                              style={{
                                fontFamily: "'Orbitron',monospace",
                                fontWeight: 900,
                                fontSize: '20px',
                                color: result.allow ? '#2E7D32' : '#C62828',
                                lineHeight: 1,
                              }}>
                              {result.allow ? 'ALLOW' : 'REJECT'}
                            </div>
                            <div
                              style={{
                                fontFamily: "'Space Mono',monospace",
                                fontSize: '7px',
                                color: '#778',
                                marginTop: '3px',
                              }}>
                              {result.allow
                                ? `All ${active.length} rules passed`
                                : `Blocked: ${result.failedRule?.label}`}
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            borderTop: '1px solid #C8D0C0',
                            paddingTop: '8px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '4px',
                          }}>
                          {active.map((r, idx) => {
                            const fail = result.failedRule?.id === r.id;
                            return (
                              <div
                                key={r.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  animation: `slidein .3s ease-out ${idx * 0.08}s both`,
                                }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <RuleIcon icon={r.icon} size={12} />
                                  <span
                                    style={{
                                      fontFamily: "'Orbitron',monospace",
                                      fontWeight: 700,
                                      fontSize: '8px',
                                      color: r.color,
                                      letterSpacing: '1px',
                                    }}>
                                    {r.label}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    fontFamily: "'Space Mono',monospace",
                                    fontWeight: 700,
                                    fontSize: '8px',
                                    color: fail ? '#C62828' : '#2E7D32',
                                    background: fail ? '#FFEBEE' : '#E8F5E9',
                                    border: `1px solid ${fail ? '#EF9A9A' : '#A5D6A7'}`,
                                    padding: '1px 6px',
                                    borderRadius: '3px',
                                  }}>
                                  {fail ? 'FAIL' : 'PASS'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div
                          style={{
                            marginTop: '8px',
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: '6.5px',
                            color: '#AAA',
                          }}>
                          {result.amount} USDC · {result.ts.split('T')[1].substring(0, 8)} UTC
                        </div>
                      </div>
                    </div>
                  ) : active.length === 0 ? (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '150px',
                        gap: '10px',
                      }}>
                      <div style={{ fontSize: '36px', opacity: 0.2 }}>🎮</div>
                      <div
                        style={{
                          fontFamily: "'Orbitron',monospace",
                          fontSize: '8px',
                          color: '#B0B8A8',
                          letterSpacing: '2px',
                          textAlign: 'center',
                          lineHeight: 1.8,
                        }}>
                        NO CARTRIDGES LOADED
                        <br />
                        <span
                          style={{
                            fontFamily: "'Space Mono',monospace",
                            fontSize: '7px',
                            color: '#C8D0C0',
                            fontWeight: 400,
                          }}>
                          DRAG RULES TO SLOTS BELOW
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '7px',
                        animation: 'slidein .3s ease-out',
                      }}>
                      <div
                        style={{
                          fontFamily: "'Space Mono',monospace",
                          fontSize: '7px',
                          color: '#8A9A88',
                          letterSpacing: '2.5px',
                          marginBottom: '2px',
                        }}>
                        ACTIVE RULES
                      </div>
                      {active.map((r, idx) => (
                        <div
                          key={r.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: `linear-gradient(90deg,${r.bg}20,${r.bg}08)`,
                            border: `1px solid ${r.color}30`,
                            borderLeft: `3px solid ${r.color}`,
                            borderRadius: '7px',
                            padding: '6px 10px',
                            animation: `slidein .3s ease-out ${idx * 0.07}s both`,
                          }}>
                          <PinBlock color={r.color} lit small />
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '6px',
                              background: `${r.bg}50`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              border: `1px solid ${r.color}25`,
                              overflow: 'hidden',
                              flexShrink: 0,
                            }}>
                            <RuleIcon icon={r.icon} size={14} />
                          </div>
                          <div style={{ flex: 1 }}>
                            <div
                              style={{
                                fontFamily: "'Space Mono',monospace",
                                fontSize: '8.5px',
                                fontWeight: 700,
                                color: r.color,
                                letterSpacing: '1px',
                              }}>
                              {r.label}
                            </div>
                            <div
                              style={{
                                fontFamily: "'Space Mono',monospace",
                                fontSize: '6.5px',
                                color: '#8A9A88',
                                marginTop: '1px',
                              }}>
                              {r.desc}
                            </div>
                          </div>
                          <LEDDot color={r.color} pulse />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '3px', marginTop: '6px', padding: '0 4px' }}>
                {[...Array(12)].map((_, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: '2px',
                      background: i % 3 === 0 ? '#A0A0A4' : '#ACACB0',
                      borderRadius: '1px',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* AMOUNT + BUTTONS */}
            <div
              style={{ display: 'flex', gap: '10px', alignItems: 'stretch', marginBottom: '14px' }}>
              <div
                style={{
                  flex: 1,
                  background: 'linear-gradient(160deg,#D8D8DC,#C8C8CC)',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  boxShadow: 'inset 0 3px 6px #00000018,0 1px 0 #E8E8EC',
                }}>
                <div
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: '6.5px',
                    color: '#999',
                    letterSpacing: '2px',
                    marginBottom: '4px',
                  }}>
                  AMOUNT
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    value={amt}
                    onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontWeight: 700,
                      fontSize: '22px',
                      color: '#333',
                      width: '80px',
                    }}
                  />
                  <div
                    style={{
                      fontFamily: "'Space Mono',monospace",
                      fontSize: '8px',
                      fontWeight: 700,
                      color: SAGE,
                      border: `1.5px solid ${SAGE}88`,
                      background: `${SAGE}15`,
                      padding: '2px 8px',
                      borderRadius: '5px',
                      letterSpacing: '1px',
                    }}>
                    USDC
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <PhysBtn
                  label="CLEAR"
                  small
                  onClick={() => setResult(null)}
                  primary={undefined}
                  danger={undefined}
                  disabled={undefined}
                  icon={undefined}
                  full={undefined}
                />
                <PhysBtn
                  label={testing ? 'WAIT…' : '▶ RUN'}
                  small
                  primary
                  onClick={runTest}
                  disabled={!active.length || testing}
                  danger={undefined}
                  icon={undefined}
                  full={undefined}
                />
              </div>
            </div>

            {/* SLOTS */}
            <div
              style={{
                background: 'linear-gradient(180deg,#C4C4C8,#BCBCC0)',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '14px',
                boxShadow: 'inset 0 3px 8px #00000020,0 2px 0 #D4D4D8',
              }}>
              <div
                style={{
                  background: 'linear-gradient(90deg,#B8B8BC,#C4C4C8)',
                  borderBottom: '1px solid #B0B0B4',
                  padding: '7px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '2px',
                      background: SAGE,
                      boxShadow: `0 0 4px ${SAGE}88`,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "'Orbitron',monospace",
                      fontSize: '8px',
                      color: '#555',
                      letterSpacing: '2px',
                    }}>
                    POLICY DEVICE
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'Space Mono',monospace",
                    fontSize: '6.5px',
                    color: '#AAA',
                  }}>
                  DRAG TO LOAD
                </span>
              </div>

              {slots.map((rule, i) => (
                <div
                  key={i}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOverSlot(i);
                  }}
                  onDrop={(e) => dropSlot(e, i)}
                  onDragLeave={() => setOverSlot(null)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    height: '54px',
                    borderBottom: i < 5 ? '1px solid #B4B4B8' : 'none',
                    background:
                      plugged === i
                        ? `${rule?.color}18`
                        : overSlot === i
                          ? `${rule?.color || SAGE}10`
                          : i % 2 === 0
                            ? '#C4C4C8'
                            : '#C0C0C4',
                    outline: overSlot === i ? `2px dashed ${rule?.color || SAGE}66` : 'none',
                    outlineOffset: '-4px',
                    transition: 'all .15s',
                  }}>
                  <div
                    style={{
                      width: '32px',
                      height: '100%',
                      background: 'linear-gradient(90deg,#B8B8BC,#C0C0C4)',
                      borderRight: '1px solid #B0B0B4',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                    <span
                      style={{
                        fontFamily: "'Orbitron',monospace",
                        fontSize: '9px',
                        fontWeight: 700,
                        color: rule ? rule.color : '#C8C8CC',
                      }}>
                      {i + 1}
                    </span>
                  </div>
                  <div
                    style={{
                      width: '20px',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRight: '1px solid #B8B8BC',
                      flexShrink: 0,
                    }}>
                    <PinBlock color={rule?.color || SAGE} lit={!!rule} small />
                  </div>
                  <div style={{ flex: 1, padding: '0 8px' }}>
                    {rule ? (
                      <Cartridge
                        rule={rule}
                        mini
                        plugged
                        onDragStart={(e) => {
                          setDrag({ rule, src: { type: 'slot', i } });
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => setDrag(null)}
                      />
                    ) : (
                      <div
                        style={{
                          height: '36px',
                          border: '1.5px dashed #B8B8BC',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'Space Mono',monospace",
                          fontSize: '6.5px',
                          color: '#C0C0C4',
                          letterSpacing: '2px',
                        }}>
                        — SLOT {i + 1} —
                      </div>
                    )}
                  </div>
                  {rule && (
                    <button
                      onClick={() => eject(i)}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#FF5252')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#BBBBBC')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        color: '#BBBBBC',
                        fontSize: '11px',
                        padding: '0 12px',
                        height: '100%',
                        flexShrink: 0,
                        transition: 'color .15s',
                      }}>
                      ⏏
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* LIBRARY */}
            <div onDragOver={(e) => e.preventDefault()} onDrop={dropLib}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px',
                }}>
                <div>
                  <span
                    style={{
                      fontFamily: "'Space Mono',monospace",
                      fontSize: '7px',
                      color: '#888',
                      letterSpacing: '2.5px',
                    }}>
                    CARTRIDGE LIBRARY
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Mono',monospace",
                      fontSize: '7px',
                      color: '#BBB',
                      marginLeft: '8px',
                    }}>
                    {freeRules.length} avail
                  </span>
                </div>
                <PhysBtn
                  label="+ NEW RULE"
                  small
                  icon="🛠️"
                  onClick={() => setShowCreate(true)}
                  primary={undefined}
                  danger={undefined}
                  disabled={undefined}
                  full={undefined}
                />
              </div>
              <div style={{ display: 'flex', gap: '7px', overflowX: 'auto', paddingBottom: '6px' }}>
                {freeRules.length > 0 ? (
                  freeRules.map((rule) => (
                    <div key={rule.id} style={{ flexShrink: 0, width: '160px' }}>
                      <Cartridge
                        rule={rule}
                        dragging={drag?.rule.id === rule.id && drag?.src.type === 'library'}
                        onDragStart={(e) => {
                          setDrag({ rule, src: { type: 'library' } });
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        onDragEnd={() => setDrag(null)}
                      />
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      fontFamily: "'Space Mono',monospace",
                      fontSize: '8px',
                      color: '#C0C0C4',
                      letterSpacing: '1px',
                      padding: '12px 0',
                    }}>
                    ALL CARTRIDGES LOADED ✓
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* STATUS BAR */}
          <div
            style={{
              background: 'linear-gradient(90deg,#B4B4B8,#BCBCC0,#B4B4B8)',
              borderTop: '1px solid #A8A8AC',
              borderRadius: '0 0 28px 28px',
              padding: '8px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
            <span
              style={{
                fontFamily: "'Space Mono',monospace",
                fontSize: '6.5px',
                color: '#888',
                letterSpacing: '1.5px',
              }}>
              LISK · 4202
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <LEDDot color={wallet ? '#4CAF50' : '#9E9E9E'} pulse={!!wallet} />
              <span
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: '6px',
                  color: '#999',
                  letterSpacing: '1px',
                }}>
                {wallet ? 'CONNECTED' : 'OFFLINE'}
              </span>
            </div>
            <span
              style={{
                fontFamily: "'Space Mono',monospace",
                fontSize: '6.5px',
                color: '#888',
                letterSpacing: '1.5px',
              }}>
              EIP-712
            </span>
          </div>
        </div>
      </div>

      {showWallet && (
        <WalletModal onClose={() => setShowWallet(false)} onConnect={(w) => setWallet(w)} />
      )}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreate={(r) => setAllRules((p) => [...p, r])}
        />
      )}
    </div>
  );
}
