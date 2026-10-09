import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getMyMatches, getInvites, likeUser, passUser } from '../services/api'
import BottomNav from '../components/BottomNav'
import SearchBar from '../components/SearchBar'

const LS_KEY = 'convSettings'
const GLOBAL_KEY = 'globalMuteSettings'
const DURATIONS = {
  '1h': 60 * 60 * 1000,
  '8h': 8 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  forever: null,
}

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}
function loadGlobalSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(GLOBAL_KEY) || '{}')
    return {
      globalNotifMuted: !!raw.globalNotifMuted,
      globalNotifMuteUntil: raw.globalNotifMuteUntil ?? null,
      globalCallMuted: !!raw.globalCallMuted,
      globalCallMuteUntil: raw.globalCallMuteUntil ?? null,
      sleepEnabled: !!raw.sleepEnabled,
      sleepFrom: raw.sleepFrom || '00:00',
      sleepTo: raw.sleepTo || '08:00',
    }
  } catch {
    return { globalNotifMuted: false, globalNotifMuteUntil: null, globalCallMuted: false, globalCallMuteUntil: null, sleepEnabled: false, sleepFrom: '00:00', sleepTo: '08:00' }
  }
}
function isNotifMuted(s) {
  if (!s?.notifMuted) return false
  if (s.notifMuteUntil == null) return true
  return s.notifMuteUntil > Date.now()
}
function isCallMuted(s) {
  if (!s?.callMuted) return false
  if (s.callMuteUntil == null) return true
  return s.callMuteUntil > Date.now()
}
function isGlobalNotifMuted(g) {
  if (!g?.globalNotifMuted) return false
  if (g.globalNotifMuteUntil == null) return true
  return g.globalNotifMuteUntil > Date.now()
}
function isGlobalCallMuted(g) {
  if (!g?.globalCallMuted) return false
  if (g.globalCallMuteUntil == null) return true
  return g.globalCallMuteUntil > Date.now()
}
function parseHM(hm) {
  const [h, m] = hm.split(':').map(Number)
  return h * 60 + (m || 0)
}
function isSleepActive(g) {
  if (!g?.sleepEnabled) return false
  const now = new Date()
  const cur = now.getHours() * 60 + now.getMinutes()
  const from = parseHM(g.sleepFrom)
  const to = parseHM(g.sleepTo)
  if (from === to) return false
  if (from < to) return cur >= from && cur < to
  return cur >= from || cur < to
}
function formatHM(hm) {
  const [h] = hm.split(':')
  const hour = parseInt(h, 10)
  return `${String(hour).padStart(2, '0')}h`
}
function formatHMFull(hm) {
  return hm
}
function formatRemaining(until) {
  if (until == null) return 'Forever'
  const ms = until - Date.now()
  if (ms <= 0) return 'Expired'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h >= 24) return `${Math.ceil(h / 24)}d left`
  if (h > 0) return `${h}h ${m > 0 ? `${m}m` : ''} left`.trim()
  if (m > 0) return `${m}m left`
  return '<1m left'
}

const HOURS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`)

// Temps relatif en français : "à l'instant", "il y a X min", "il y a X h", "il y a X j"
function formatRelativeTime(value) {
  if (value == null || value === '') return "à l'instant"
  const raw = String(value).trim()
  const low = raw.toLowerCase()
  if (low === 'now' || low === "à l'instant") return "à l'instant"
  // anciens formats démo : 2m, 1h, 3h
  const short = low.match(/^(\d+)\s*(m|min|mins|h|d)$/)
  if (short) {
    const n = parseInt(short[1], 10)
    const unit = short[2]
    if (unit.startsWith('m')) return n < 60 ? `il y a ${n} min` : `il y a ${Math.floor(n / 60)} h`
    if (unit === 'h') return `il y a ${n} h`
    return `il y a ${n} j`
  }
  const date = new Date(raw)
  if (isNaN(date.getTime())) return raw
  const diff = Date.now() - date.getTime()
  if (diff < 0) return "à l'instant"
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `il y a ${days} j`
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}

export default function Matches() {
  const navigate = useNavigate()
  const [matches, setMatches] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [invitesLoading, setInvitesLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [picker, setPicker] = useState(null)
  const [convSettings, setConvSettings] = useState(() => loadSettings())
  const [globalSettings, setGlobalSettings] = useState(() => loadGlobalSettings())
  const [globalOpen, setGlobalOpen] = useState(false)
  const [globalPicker, setGlobalPicker] = useState(null)
  const [, setTick] = useState(0)
  const menuRef = useRef(null)
  const globalMenuRef = useRef(null)
  const globalBtnRef = useRef(null)

  useEffect(() => { loadMatches(); loadInvites() }, [])
  useEffect(() => { localStorage.setItem(LS_KEY, JSON.stringify(convSettings)) }, [convSettings])
  useEffect(() => { localStorage.setItem(GLOBAL_KEY, JSON.stringify(globalSettings)) }, [globalSettings])
  useEffect(() => {
    const id = setInterval(() => {
      // auto-expire per-conversation mutes
      setConvSettings(prev => {
        let changed = false
        const next = { ...prev }
        for (const k of Object.keys(next)) {
          const s = next[k]
          if (s.notifMuted && s.notifMuteUntil != null && s.notifMuteUntil <= Date.now()) {
            next[k] = { ...s, notifMuted: false, notifMuteUntil: null }
            changed = true
          }
          if (s.callMuted && s.callMuteUntil != null && s.callMuteUntil <= Date.now()) {
            next[k] = { ...s, callMuted: false, callMuteUntil: null }
            changed = true
          }
        }
        return changed ? next : prev
      })
      // auto-expire global mutes
      setGlobalSettings(prev => {
        let changed = false
        const next = { ...prev }
        if (next.globalNotifMuted && next.globalNotifMuteUntil != null && next.globalNotifMuteUntil <= Date.now()) {
          next.globalNotifMuted = false
          next.globalNotifMuteUntil = null
          changed = true
        }
        if (next.globalCallMuted && next.globalCallMuteUntil != null && next.globalCallMuteUntil <= Date.now()) {
          next.globalCallMuted = false
          next.globalCallMuteUntil = null
          changed = true
        }
        return changed ? next : prev
      })
      setTick(t => t + 1)
      setMatches(m => [...m])
    }, 30000)
    return () => clearInterval(id)
  }, [])
  useEffect(() => {
    const close = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        const isBtn = e.target.closest?.('.match-settings-btn')
        if (!isBtn) { setMenuOpenId(null); setPicker(null) }
      }
      if (globalMenuRef.current && !globalMenuRef.current.contains(e.target) && !globalBtnRef.current?.contains(e.target)) {
        const isGlobalInside = e.target.closest?.('.global-mute-menu')
        if (!isGlobalInside) { setGlobalOpen(false); setGlobalPicker(null) }
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const loadInvites = async () => {
    try {
      const res = await getInvites()
      setInvites(res.data || [])
    } catch {
      setInvites([])
    } finally { setInvitesLoading(false) }
  }

  const handleAccept = async (id) => {
    try {
      const res = await likeUser(id)
      setInvites(prev => prev.filter(i => i.id !== id))
      if (res.data?.matched) loadMatches()
      else {
        // still reload matches in case it became mutual
        loadMatches()
      }
    } catch {}
  }

  const handleDecline = async (id) => {
    try {
      await passUser(id)
      setInvites(prev => prev.filter(i => i.id !== id))
    } catch {}
  }

  const loadMatches = async () => {
    try {
      const res = await getMyMatches()
      setMatches(res.data || [])
    } catch {
      setMatches([
        { id: 1, name: 'Sophie', lastMessage: 'Hey! How are you?', time: '2m' },
        { id: 2, name: 'Maya', lastMessage: 'Coffee this weekend?', time: '1h' },
        { id: 3, name: 'Alex', lastMessage: 'That sounds great! ✨', time: '3h' }
      ])
    } finally { setLoading(false) }
  }

  const getSettings = (id) => {
    const s = convSettings[id] || {}
    return {
      pinned: !!s.pinned,
      notifMuted: !!s.notifMuted,
      notifMuteUntil: s.notifMuteUntil ?? null,
      callMuted: !!s.callMuted,
      callMuteUntil: s.callMuteUntil ?? null,
    }
  }
  const togglePin = (id) => setConvSettings(prev => ({ ...prev, [id]: { ...(prev[id]||{}), pinned: !prev[id]?.pinned } }))
  const handleNotifToggle = (id) => {
    const s = getSettings(id)
    if (isNotifMuted(s)) {
      setConvSettings(prev => ({ ...prev, [id]: { ...(prev[id]||{}), notifMuted: false, notifMuteUntil: null } }))
      setPicker(null)
    } else {
      setPicker(p => (p?.id===id && p?.type==='notif' ? null : {id, type:'notif'}))
    }
  }
  const handleCallToggle = (id) => {
    const s = getSettings(id)
    if (isCallMuted(s)) {
      setConvSettings(prev => ({ ...prev, [id]: { ...(prev[id]||{}), callMuted: false, callMuteUntil: null } }))
      setPicker(null)
    } else {
      setPicker(p => (p?.id===id && p?.type==='call' ? null : {id, type:'call'}))
    }
  }
  const selectNotifDuration = (id, dur) => {
    const ms = DURATIONS[dur]
    setConvSettings(prev => ({ ...prev, [id]: { ...(prev[id]||{}), notifMuted: true, notifMuteUntil: ms==null?null:Date.now()+ms } }))
    setPicker(null)
  }
  const selectCallDuration = (id, dur) => {
    const ms = DURATIONS[dur]
    setConvSettings(prev => ({ ...prev, [id]: { ...(prev[id]||{}), callMuted: true, callMuteUntil: ms==null?null:Date.now()+ms } }))
    setPicker(null)
  }

  // Global handlers
  const globalNotifOn = isGlobalNotifMuted(globalSettings)
  const globalCallOn = isGlobalCallMuted(globalSettings)
  const sleepActive = isSleepActive(globalSettings)
  const anyGlobalMute = globalNotifOn || globalCallOn || sleepActive

  const handleGlobalNotifToggle = () => {
    if (globalNotifOn) {
      setGlobalSettings(prev => ({ ...prev, globalNotifMuted: false, globalNotifMuteUntil: null }))
      setGlobalPicker(null)
    } else {
      setGlobalPicker(p => p === 'notif' ? null : 'notif')
    }
  }
  const handleGlobalCallToggle = () => {
    if (globalCallOn) {
      setGlobalSettings(prev => ({ ...prev, globalCallMuted: false, globalCallMuteUntil: null }))
      setGlobalPicker(null)
    } else {
      setGlobalPicker(p => p === 'call' ? null : 'call')
    }
  }
  const selectGlobalNotifDuration = (dur) => {
    const ms = DURATIONS[dur]
    setGlobalSettings(prev => ({ ...prev, globalNotifMuted: true, globalNotifMuteUntil: ms==null?null:Date.now()+ms }))
    setGlobalPicker(null)
  }
  const selectGlobalCallDuration = (dur) => {
    const ms = DURATIONS[dur]
    setGlobalSettings(prev => ({ ...prev, globalCallMuted: true, globalCallMuteUntil: ms==null?null:Date.now()+ms }))
    setGlobalPicker(null)
  }
  const toggleSleep = () => {
    setGlobalSettings(prev => ({ ...prev, sleepEnabled: !prev.sleepEnabled }))
  }
  const setSleepFrom = (val) => setGlobalSettings(prev => ({ ...prev, sleepFrom: val }))
  const setSleepTo = (val) => setGlobalSettings(prev => ({ ...prev, sleepTo: val }))

  const sorted = useMemo(() => {
    return [...matches].sort((a,b)=>{
      const pa=!!getSettings(a.id).pinned, pb=!!getSettings(b.id).pinned
      if(pa && !pb) return -1
      if(!pa && pb) return 1
      return 0
    })
  }, [matches, convSettings])

  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return sorted
    // prefix matches first ("k" -> khanfous...), then name contains;
    // message text only for 2+ letters (single-letter bio hits are noise)
    const starts = []
    const nameHits = []
    const rest = []
    for (const m of sorted) {
      const name = (m.name || '').toLowerCase()
      const last = (m.lastMessage || '').toLowerCase()
      const prefix = name.startsWith(q) || name.split(/\s+/).some((w) => w.startsWith(q))
      if (prefix) starts.push(m)
      else if (name.includes(q)) nameHits.push(m)
      else if (q.length >= 2 && last && last.includes(q)) rest.push(m)
    }
    return [...starts, ...nameHits, ...rest]
  }, [sorted, searchQuery])

  const renderRow = (match) => {
    const s=getSettings(match.id)
    const notifOn=isNotifMuted(s) || globalNotifOn || sleepActive
    const callOn=isCallMuted(s) || globalCallOn || sleepActive
    const open=menuOpenId===match.id
    const showNotifPicker=picker?.id===match.id && picker?.type==='notif'
    const showCallPicker=picker?.id===match.id && picker?.type==='call'
    return (
      <div key={match.id} className={`match-row ${s.pinned?'pinned':''} ${open?'menu-open':''}`}>
        <Link to={`/chat/${match.id}`} className="match-item" style={{flex:1,minWidth:0}}>
          <div className="match-avatar online">
            {match.name[0]}
            {s.pinned && <span className="match-pin-badge" title="Pinned"><svg width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/></svg></span>}
          </div>
          <div className="match-info">
            <div className="match-name">
              {match.name}
              {notifOn && <span className="match-mute-icon" title={sleepActive ? `Sleep ${formatHM(globalSettings.sleepFrom)}–${formatHM(globalSettings.sleepTo)}` : globalNotifOn ? `All muted ${globalSettings.globalNotifMuteUntil?`• ${formatRemaining(globalSettings.globalNotifMuteUntil)}`:'• Forever'}` : `Muted ${s.notifMuteUntil?`• ${formatRemaining(s.notifMuteUntil)}`:'• Forever'}`}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M2 14a2 2 0 012-2h2l2-2 2 2h2a2 2 0 012 2v2H2z"/><line x1="1" y1="1" x2="23" y2="23"/></svg></span>}
              {callOn && <span className="match-mute-icon" title={sleepActive ? `Sleep ${formatHM(globalSettings.sleepFrom)}–${formatHM(globalSettings.sleepTo)}` : globalCallOn ? `Calls muted ${globalSettings.globalCallMuteUntil?`• ${formatRemaining(globalSettings.globalCallMuteUntil)}`:'• Forever'}` : `Calls muted ${s.callMuteUntil?`• ${formatRemaining(s.callMuteUntil)}`:'• Forever'}`}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 12.81 19.79 19.79 0 010 4.18 2 2 0 012 2h3a2 2 0 012 2 10 10 0 00.5 3 2 2 0 01-.57 1.72l-1.5 1.5a16 16 0 006 6l1.5-1.5A2 2 0 0114.65 15a10 10 0 003 .5 2 2 0 012 2z"/><line x1="23" y1="1" x2="1" y2="23"/></svg></span>}
            </div>
            {match.lastMessage && <div className="match-last-message">{match.lastMessage}</div>}
          </div>
          <div className="match-time" title={match.time && match.time !== 'now' ? new Date(match.time).toLocaleString('fr-FR') : undefined}>{formatRelativeTime(match.time)}</div>
        </Link>
        <button className="match-settings-btn" aria-label="Conversation settings" aria-expanded={open} onClick={(e)=>{e.preventDefault();e.stopPropagation(); if(open){setMenuOpenId(null);setPicker(null)} else setMenuOpenId(match.id)}}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><circle cx="12" cy="12" r="1.8"/><circle cx="19.5" cy="12" r="1.8"/><circle cx="4.5" cy="12" r="1.8"/></svg>
        </button>
        {open && (
          <div className="match-settings-menu" ref={menuRef} onClick={(e)=>e.stopPropagation()}>
            <div className="match-settings-header">
              <span className="match-settings-title">{match.name}</span>
              <button className="match-settings-close" onClick={()=>{setMenuOpenId(null);setPicker(null)}} aria-label="Close">✕</button>
            </div>
            <button className={`match-setting-row ${s.pinned?'active':''}`} onClick={()=>togglePin(match.id)}>
              <span className="match-setting-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24V17z"/></svg></span>
              <span className="match-setting-label">Pin conversation</span>
              <span className={`mini-toggle ${s.pinned?'on':''}`}><span className="mini-toggle-knob"/></span>
            </button>
            <button className={`match-setting-row ${isNotifMuted(s)?'active':''}`} onClick={()=>handleNotifToggle(match.id)}>
              <span className="match-setting-icon">
                {isNotifMuted(s)?(
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M2 14a2 2 0 012-2h2l2-2 2 2h2a2 2 0 012 2v2H2z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ):(
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M18 8A6 6 0 006 8c0 7-6 9-6 9h16s-6-2-6-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                )}
              </span>
              <span className="match-setting-label">Mute conversation{isNotifMuted(s) && <span className="match-setting-sub">{s.notifMuteUntil==null?' • Forever':` • ${formatRemaining(s.notifMuteUntil)}`}</span>}</span>
              <span className={`mini-toggle ${isNotifMuted(s)?'on':''}`}><span className="mini-toggle-knob"/></span>
            </button>
            {showNotifPicker && !isNotifMuted(s) && (
              <div className="mute-timer-picker">
                <span className="mute-timer-label">Mute for</span>
                <div className="mute-timer-grid">
                  {Object.keys(DURATIONS).map(k=>(
                    <button key={k} className="timer-btn" onClick={()=>selectNotifDuration(match.id,k)}>{k==='forever'?'Forever':k}</button>
                  ))}
                </div>
              </div>
            )}
            <button className={`match-setting-row ${isCallMuted(s)?'active':''}`} onClick={()=>handleCallToggle(match.id)}>
              <span className="match-setting-icon">
                {isCallMuted(s)?(
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 12.81 19.79 19.79 0 010 4.18 2 2 0 012 2h3a2 2 0 012 2 10 10 0 00.5 3 2 2 0 01-.57 1.72l-1.5 1.5a16 16 0 006 6l1.5-1.5A2 2 0 0114.65 15a10 10 0 003 .5 2 2 0 012 2z"/><line x1="23" y1="1" x2="1" y2="23"/></svg>
                ):(
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 12.81 19.79 19.79 0 010 4.18 2 2 0 012 2h3a2 2 0 012 2 10 10 0 00.5 3 2 2 0 01-.57 1.72l-1.5 1.5a16 16 0 006 6l1.5-1.5A2 2 0 0114.65 15a10 10 0 003 .5 2 2 0 012 2z"/></svg>
                )}
              </span>
              <span className="match-setting-label">Mute calls{isCallMuted(s) && <span className="match-setting-sub">{s.callMuteUntil==null?' • Forever':` • ${formatRemaining(s.callMuteUntil)}`}</span>}</span>
              <span className={`mini-toggle ${isCallMuted(s)?'on':''}`}><span className="mini-toggle-knob"/></span>
            </button>
            {showCallPicker && !isCallMuted(s) && (
              <div className="mute-timer-picker">
                <span className="mute-timer-label">Mute calls for</span>
                <div className="mute-timer-grid">
                  {Object.keys(DURATIONS).map(k=>(
                    <button key={k} className="timer-btn" onClick={()=>selectCallDuration(match.id,k)}>{k==='forever'?'Forever':k}</button>
                  ))}
                </div>
              </div>
            )}
            <div className="match-settings-hint">
              {s.pinned && 'Pinned • '}{isNotifMuted(s) ? `Conversation muted ${s.notifMuteUntil?`• ${formatRemaining(s.notifMuteUntil)}`:'• Forever'}`:'Conversation on'} • {isCallMuted(s) ? `Calls muted ${s.callMuteUntil?`• ${formatRemaining(s.callMuteUntil)}`:'• Forever'}`:'Calls on'}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="app-container">
      <div className="app-header">
        <div className="header-left">
          <h1><span style={{color:'var(--color-primary)',display:'inline-flex',verticalAlign:'middle'}}><svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4V4c0-1.1-.9-2-2-2z"/></svg></span> Messages</h1>
        </div>
        <div className="header-right">
          <button
            ref={globalBtnRef}
            className={`global-settings-btn ${globalOpen ? 'open' : ''} ${anyGlobalMute ? 'has-mute' : ''}`}
            aria-label="Message settings"
            aria-expanded={globalOpen}
            onClick={()=>{setGlobalOpen(o=>!o); setGlobalPicker(null)}}
            title={anyGlobalMute ? (sleepActive ? `Sleep ${formatHM(globalSettings.sleepFrom)}–${formatHM(globalSettings.sleepTo)}` : globalNotifOn && globalCallOn ? 'All muted' : globalNotifOn ? 'Conversations muted' : 'Calls muted') : 'Settings'}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            {anyGlobalMute && <span className="global-mute-dot" />}
          </button>
        </div>
      </div>
      {globalOpen && (
        <div className="global-mute-overlay" onClick={()=>{setGlobalOpen(false);setGlobalPicker(null)}}>
          <div className="global-mute-menu" ref={globalMenuRef} onClick={(e)=>e.stopPropagation()}>
              <div className="match-settings-header">
                <span className="match-settings-title">Do Not Disturb</span>
                <button className="match-settings-close" onClick={()=>{setGlobalOpen(false);setGlobalPicker(null)}} aria-label="Close">✕</button>
              </div>

              <button className={`match-setting-row ${globalNotifOn?'active':''}`} onClick={handleGlobalNotifToggle}>
                <span className="match-setting-icon">
                  {globalNotifOn ? (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M2 14a2 2 0 012-2h2l2-2 2 2h2a2 2 0 012 2v2H2z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M18 8A6 6 0 006 8c0 7-6 9-6 9h16s-6-2-6-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                  )}
                </span>
                <span className="match-setting-label">Mute all conversations{globalNotifOn && <span className="match-setting-sub">{globalSettings.globalNotifMuteUntil==null?' • Forever':` • ${formatRemaining(globalSettings.globalNotifMuteUntil)}`}</span>}</span>
                <span className={`mini-toggle ${globalNotifOn?'on':''}`}><span className="mini-toggle-knob"/></span>
              </button>
              {globalPicker==='notif' && !globalNotifOn && (
                <div className="mute-timer-picker">
                  <span className="mute-timer-label">Mute conversations for</span>
                  <div className="mute-timer-grid">
                    {Object.keys(DURATIONS).map(k=>(
                      <button key={k} className="timer-btn" onClick={()=>selectGlobalNotifDuration(k)}>{k==='forever'?'Forever':k}</button>
                    ))}
                  </div>
                </div>
              )}

              <button className={`match-setting-row ${globalCallOn?'active':''}`} onClick={handleGlobalCallToggle}>
                <span className="match-setting-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 12.81 19.79 19.79 0 010 4.18 2 2 0 012 2h3a2 2 0 012 2 10 10 0 00.5 3 2 2 0 01-.57 1.72l-1.5 1.5a16 16 0 006 6l1.5-1.5A2 2 0 0114.65 15a10 10 0 003 .5 2 2 0 012 2z"/>{globalCallOn && <line x1="23" y1="1" x2="1" y2="23"/>}</svg>
                </span>
                <span className="match-setting-label">Mute all calls{globalCallOn && <span className="match-setting-sub">{globalSettings.globalCallMuteUntil==null?' • Forever':` • ${formatRemaining(globalSettings.globalCallMuteUntil)}`}</span>}</span>
                <span className={`mini-toggle ${globalCallOn?'on':''}`}><span className="mini-toggle-knob"/></span>
              </button>
              {globalPicker==='call' && !globalCallOn && (
                <div className="mute-timer-picker">
                  <span className="mute-timer-label">Mute calls for</span>
                  <div className="mute-timer-grid">
                    {Object.keys(DURATIONS).map(k=>(
                      <button key={k} className="timer-btn" onClick={()=>selectGlobalCallDuration(k)}>{k==='forever'?'Forever':k}</button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{height:'1px', background:'var(--color-divider)', margin:'4px 0'}} />

              <button className={`match-setting-row sleep-row ${globalSettings.sleepEnabled?'active':''}`} onClick={toggleSleep}>
                <span className="match-setting-icon" style={{background: globalSettings.sleepEnabled ? '#4F46E5' : undefined, color: globalSettings.sleepEnabled ? 'white' : undefined}}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
                </span>
                <span className="match-setting-label">Sleep mode</span>
                <span className={`mini-toggle ${globalSettings.sleepEnabled?'on':''}`}><span className="mini-toggle-knob"/></span>
              </button>

              <div className="match-settings-hint">
                {sleepActive ? `Sleep active • ` : ''}{globalNotifOn ? `All conversations muted ${globalSettings.globalNotifMuteUntil?`• ${formatRemaining(globalSettings.globalNotifMuteUntil)}`:'• Forever'} • ` : 'All conversations on • '}{globalCallOn ? `All calls muted ${globalSettings.globalCallMuteUntil?`• ${formatRemaining(globalSettings.globalCallMuteUntil)}`:'• Forever'}` : 'All calls on'}
              </div>
            </div>
          </div>
          )}

      <div className="matches-top-search">
        <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search conversations..." autoFocus={false} />
      </div>

      {anyGlobalMute && (
        <div className="global-mute-banner">
          <span className="global-mute-banner-icon">
            {sleepActive ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M2 14a2 2 0 012-2h2l2-2 2 2h2a2 2 0 012 2v2H2z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            )}
          </span>
          <span className="global-mute-banner-text">
            {sleepActive ? `Sleep ${formatHM(globalSettings.sleepFrom)}–${formatHM(globalSettings.sleepTo)} • ` : ''}{globalNotifOn ? 'Conversations muted' : ''}{globalNotifOn && globalCallOn ? ' & ' : ''}{globalCallOn ? 'Calls muted' : ''}{!globalNotifOn && !globalCallOn && sleepActive ? 'Messages & calls silenced' : ''}{globalNotifOn && globalSettings.globalNotifMuteUntil ? ` • ${formatRemaining(globalSettings.globalNotifMuteUntil)}` : ''}{globalCallOn && globalSettings.globalCallMuteUntil && globalNotifOn ? '' : globalCallOn && globalSettings.globalCallMuteUntil ? ` • ${formatRemaining(globalSettings.globalCallMuteUntil)}` : ''}
          </span>
        </div>
      )}

      <div className="app-content">
        {!invitesLoading && invites.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <div className="section-header" style={{ marginBottom: '8px' }}>
              <span className="section-title">Invites ({invites.length})</span>
              <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>People who liked you</span>
            </div>
            <div className="match-list">
              {invites.map((inv) => (
                <div key={inv.id} className="match-row invite-row">
                  <div className="match-item" style={{ flex: 1, minWidth: 0 }}>
                    <div className="match-avatar online">{inv.name?.[0]?.toUpperCase() || '?'}</div>
                    <div className="match-info">
                      <div className="match-name">{inv.name} {inv.age ? <span style={{ color: 'var(--color-text-secondary)', fontWeight: 500, fontSize: '13px' }}>{inv.age}</span> : null}</div>
                      {inv.bio && <div className="match-last-message">{inv.bio}</div>}
                    </div>
                  </div>
                  <div className="invite-actions">
                    <button className="invite-btn accept" onClick={() => handleAccept(inv.id)} title={`Accept ${inv.name}`}>Accept</button>
                    <button className="invite-btn pass" onClick={() => handleDecline(inv.id)} title={`Pass ${inv.name}`}>Pass</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: '1px', background: 'var(--color-divider)', margin: '14px 0 4px' }} />
            <div className="section-header" style={{ marginBottom: '8px', marginTop: '8px' }}>
              <span className="section-title">Matches</span>
            </div>
          </div>
        )}
        {loading ? (
          <div className="loading"><div className="loading-spinner"/><div className="loading-text">Loading your matches...</div></div>
        ) : filtered.length===0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg></div>
            <div className="empty-state-title">{searchQuery?'No conversations found':'No matches yet'}</div>
            <div className="empty-state-text">{searchQuery?`Nothing for "${searchQuery}"`:'Keep swiping to find your perfect match!'}</div>
          </div>
        ) : (
          <div className="match-list">{filtered.map(renderRow)}</div>
        )}
      </div>

      <BottomNav onSearchClick={()=>navigate('/browse', { state: { autoSearch: true } })} />
    </div>
  )
}
