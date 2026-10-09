import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { getMessages, sendMessage, getMyMatches, getUserById, editMessage, deleteMessage } from '../services/api'
import BottomNav from '../components/BottomNav'

const EMOJIS = ['😊','😂','❤️','😍','🥰','😘','😅','😎','🤔','😴','🥳','😭','😡','🤗','🤩','😇','🥺','😋','🤣','😁','🙈','🙉','🙊','💋','💕','💓','💞','💗','🔥','✨','🎉','💯','🫶','👋','👍','👏','🙏','😌','🤤','🥹','😏','🤭','🤫','🤯','🥶']

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
const msgTime = (m) => m.time || (m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '')

export default function Chat() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const [partner, setPartner] = useState(null)
  const [showOptions, setShowOptions] = useState(false)
  const [toast, setToast] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const [openMenuId, setOpenMenuId] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [editText, setEditText] = useState('')
  const messagesEnd = useRef(null)
  const inputRef = useRef(null)
  const messagesRef = useRef(null)
  const toastTimer = useRef(null)

  const showToast = (msg) => {
    setToast(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2200)
  }

  useEffect(() => { loadMessages(); loadPartner() }, [matchId])
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, showEmoji])

  useEffect(() => {
    const vp = window.visualViewport
    if (!vp) return
    const onResize = () => {
      messagesEnd.current?.scrollIntoView({ behavior: 'smooth' })
      document.documentElement.style.setProperty('--keyboard-height', `${Math.max(0, window.innerHeight - vp.height)}px`)
    }
    vp.addEventListener('resize', onResize)
    vp.addEventListener('scroll', onResize)
    return () => { vp.removeEventListener('resize', onResize); vp.removeEventListener('scroll', onResize) }
  }, [])

  // close options on outside click
  useEffect(() => {
    const close = (e) => {
      if (!e.target.closest('.chat-options-menu') && !e.target.closest('.chat-options-btn')) setShowOptions(false)
    }
    if (showOptions) document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [showOptions])

  const loadPartner = async () => {
    const demo = [
      { id: 1, name: 'Sophie', age: 25 },
      { id: 2, name: 'Maya', age: 24 },
      { id: 3, name: 'Alex', age: 28 },
    ]
    try {
      // try matches first
      const res = await getMyMatches()
      const list = res.data || []
      const found = list.find(m => String(m.id) === String(matchId) || String(m.userId) === String(matchId))
      if (found) {
        setPartner({ name: found.name || found.userName || `User ${matchId}`, id: matchId })
        return
      }
      // try user by id
      try {
        const u = await getUserById(matchId)
        if (u?.data) { setPartner({ name: u.data.name || u.data.username || `User ${matchId}` }); return }
      } catch {}
      const d = demo.find(d => String(d.id) === String(matchId))
      setPartner(d || { name: `User ${matchId}` })
    } catch {
      const d = demo.find(d => String(d.id) === String(matchId))
      setPartner(d || { name: `Chat` })
    }
  }

  const loadMessages = async () => {
    try {
      const res = await getMessages(matchId)
      const list = (res.data || []).map((m, i) => ({ ...m, time: m.time || msgTime(m) || nowTime() }))
      setMessages(list)
    } catch {
      setMessages([
        { id: 1, content: 'Hey! Nice to match with you 😊', sentByMe: false, time: '09:41' },
        { id: 2, content: 'Hi! How are you?', sentByMe: true, time: '09:42', status: 'read' }
      ])
    }
  }

  const insertAtCursor = (text) => {
    const el = inputRef.current
    if (!el) { setNewMessage(prev => prev + text); return }
    const start = el.selectionStart ?? newMessage.length
    const end = el.selectionEnd ?? newMessage.length
    const before = newMessage.slice(0, start)
    const after = newMessage.slice(end)
    const next = before + text + after
    setNewMessage(next)
    requestAnimationFrame(() => {
      el.focus()
      const pos = start + text.length
      el.setSelectionRange(pos, pos)
    })
  }

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    const text = newMessage
    const tempMsg = { id: `temp-${Date.now()}`, content: text, sentByMe: true, time: nowTime(), status: 'sent' }
    setMessages((prev) => [...prev, tempMsg])
    setNewMessage('')
    setShowEmoji(false)
    try {
      const res = await sendMessage(matchId, text)
      const saved = res.data
      if (saved?.id) {
        setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? { ...saved, time: msgTime(saved) || nowTime(), status: 'sent' } : m)))
        setTimeout(() => {
          setMessages((prev) => prev.map((m) => (m.id === saved.id ? { ...m, status: 'read' } : m)))
        }, 900)
        return
      }
    } catch {}
    // mark as read after a beat (pro feel, no fake replies)
    setTimeout(() => {
      setMessages((prev) => prev.map((m) => (m.id === tempMsg.id ? { ...m, status: 'read' } : m)))
    }, 900)
  }

  const startEdit = (msg) => {
    setEditingId(msg.id)
    setEditText(msg.content)
    setOpenMenuId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditText('')
  }

  const saveEdit = async (id) => {
    const text = editText.trim()
    if (!text) return
    try {
      const res = await editMessage(id, text)
      const updated = res.data
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: updated?.content ?? text, edited: true, updatedAt: updated?.updatedAt } : m)))
      showToast('Message edited')
    } catch {
      // optimistic fallback for demo messages without backend id
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: text, edited: true } : m)))
    } finally {
      cancelEdit()
    }
  }

  const handleDelete = async (id) => {
    const prev = messages
    setMessages((p) => p.filter((m) => m.id !== id))
    setOpenMenuId(null)
    if (editingId === id) cancelEdit()
    try {
      await deleteMessage(id)
      showToast('Message deleted')
    } catch {
      // if backend delete failed (demo fallback msg), keep it removed locally
      if (String(id).startsWith('temp-') || typeof id !== 'number') {
        showToast('Message deleted')
      } else {
        setMessages(prev)
        showToast('Could not delete message')
      }
    }
  }

  const onEmojiClick = (emoji) => insertAtCursor(emoji)

  return (
    <div className="app-container chat-page">
      <div className="app-header chat-header chat-header-pro">
        <div className="header-left">
          <Link to="/matches" className="header-back chat-back" aria-label="Back">←</Link>
          <div className="chat-avatar-wrap" onClick={() => navigate(`/profile`) } title={partner?.name}>
            <div className="chat-header-avatar">
              {partner?.name ? partner.name[0].toUpperCase() : '?'}
            </div>
            <span className="chat-online-dot" />
          </div>
          <div className="chat-header-info" onClick={() => navigate(`/profile`) } style={{ cursor: 'pointer' }}>
            <span className="chat-header-name">
              {partner?.name || 'Chat'}
              <svg className="chat-verified" width="14" height="14" viewBox="0 0 24 24" fill="var(--color-info)"><path d="M12 2l2.4 2.4 3.4-.5 1 3.3 3.2 1.2-1.2 3.2 1.2 3.2-3.2 1.2-1 3.3-3.4-.5L12 22l-2.4-2.4-3.4.5-1-3.3-3.2-1.2L3.2 12 2 8.8l3.2-1.2 1-3.3 3.4.5z"/><path d="M10.5 13.5l-2-2 1.4-1.4 1.1 1.1 3.6-3.6 1.4 1.4z" fill="white"/></svg>
            </span>
            <span className="chat-header-status"><span className="chat-status-pulse" />Active now</span>
          </div>
        </div>
        <div className="header-right chat-header-actions">
          <button className="header-btn header-btn-icon chat-call-btn" title="Voice call" aria-label="Voice call" onClick={() => showToast(`Calling ${partner?.name || 'user'}...`)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 12.81 19.79 19.79 0 010 4.18 2 2 0 012 2h3a2 2 0 012 2 10 10 0 00.5 3 2 2 0 01-.57 1.72l-1.5 1.5a16 16 0 006 6l1.5-1.5A2 2 0 0114.65 15a10 10 0 003 .5 2 2 0 012 2z"/><circle cx="15" cy="8" r="1" fill="currentColor" stroke="none"/></svg>
          </button>
          <button className="header-btn header-btn-icon chat-call-btn video" title="Video call" aria-label="Video call" onClick={() => showToast(`Video calling ${partner?.name || 'user'}...`)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="5" width="15" height="14" rx="2.5" ry="2.5"/><path d="M16 8l5-3v14l-5-3z"/><circle cx="8.5" cy="12" r="1.5" fill="currentColor" stroke="none" opacity="0.9"/></svg>
          </button>
          <button className="header-btn header-btn-icon chat-options-btn" title="Options" aria-label="Options" onClick={() => setShowOptions(o=>!o)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="1.8"/><circle cx="19.5" cy="12" r="1.8"/><circle cx="4.5" cy="12" r="1.8"/></svg>
          </button>
          {showOptions && (
            <div className="chat-options-menu">
              <button className="chat-option-row" onClick={() => { setShowOptions(false); navigate('/profile') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                View profile
              </button>
              <button className="chat-option-row" onClick={() => { setShowOptions(false); showToast('Media, links and docs — coming soon') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>
                Media, links and docs
              </button>
              <button className="chat-option-row" onClick={() => { setShowOptions(false); showToast('Search in conversation — coming soon') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Search
              </button>
              <button className="chat-option-row" onClick={() => { setShowOptions(false); showToast('Conversation muted') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13.73 21a2 2 0 01-3.46 0"/><path d="M2 14a2 2 0 012-2h2l2-2 2 2h2a2 2 0 012 2v2H2z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                Mute
              </button>
              <button className="chat-option-row" onClick={() => { setShowOptions(false); showToast('Disappearing messages: 7 days') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Disappearing messages
              </button>
              <button className="chat-option-row" onClick={() => { setShowOptions(false); showToast('User blocked') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                Block
              </button>
              <button className="chat-option-row" onClick={() => { setShowOptions(false); showToast('Thanks — report received') }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
                Report
              </button>
              <div className="settings-divider" style={{margin:'4px 0'}} />
              <button className="chat-option-row danger" onClick={() => {
                if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 3000); return }
                setMessages([]); setConfirmClear(false); setShowOptions(false); showToast('Chat cleared')
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                {confirmClear ? 'Tap again to confirm' : 'Clear chat'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="chat-messages chat-messages-pro" ref={messagesRef} onClick={() => { setShowEmoji(false); setOpenMenuId(null) }}>
        <div className="chat-date-pill">Today</div>
        <div className="chat-encrypted-note">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          Messages are end-to-end encrypted
        </div>
        {messages.map((msg) => (
          <div key={msg.id} className={`message ${msg.sentByMe ? 'sent' : 'received'}`}>
            {editingId === msg.id ? (
              <div style={{ width: '100%' }}>
                <span className="message-text">{msg.content}</span>
                <div className="message-edit-row">
                  <input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(msg.id); if (e.key === 'Escape') cancelEdit() }}
                    autoFocus
                  />
                  <button onClick={(e) => { e.stopPropagation(); saveEdit(msg.id) }}>Save</button>
                  <button onClick={(e) => { e.stopPropagation(); cancelEdit() }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <span className="message-text">{msg.content}</span>
                {msg.edited && <span className="message-edited">(edited)</span>}
              </>
            )}
            <span className="message-meta">
              <span className="message-clock">{msgTime(msg)}</span>
              {msg.sentByMe && (
                <svg className={`ticks ${msg.status === 'read' ? 'read' : ''}`} width="16" height="11" viewBox="0 0 16 11" fill="none">
                  <path d="M11.07.65l-5.5 5.5L3.4 4 2 5.4l3.57 3.57 6.9-6.9z" fill="currentColor" opacity="0.7"/>
                  <path d="M15.07.65l-5.5 5.5-1.1-1.1-.05 1.35 1.15 1.15 1.42 1.42 4.48-4.47z" fill="currentColor"/>
                </svg>
              )}
              {msg.sentByMe && editingId !== msg.id && (
                <button
                  className="message-menu-btn"
                  aria-label="Message options"
                  title="Edit / Delete"
                  onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === msg.id ? null : msg.id) }}
                >
                  ⋯
                </button>
              )}
            </span>
            {openMenuId === msg.id && (
              <div className="message-menu" onClick={(e) => e.stopPropagation()}>
                <button onClick={() => startEdit(msg)}>✏️ Edit</button>
                <button className="danger" onClick={() => handleDelete(msg.id)}>🗑 Delete</button>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEnd} />
      </div>

      {showEmoji && (
        <div className="emoji-picker">
          <div className="emoji-picker-tabs">
            <span className="emoji-tab active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
              Emojis
            </span>
            <button className="emoji-close" onClick={()=>setShowEmoji(false)} type="button" aria-label="Close">✕</button>
          </div>
          <div className="emoji-grid">
            {EMOJIS.map((e, i) => (
              <button key={i} className="emoji-btn" type="button" onClick={()=> onEmojiClick(e)}>
                <span>{e}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSend} className="chat-input-container chat-input-pro">
        <button type="button" className={`chat-emoji-btn ${showEmoji?'active':''}`} onClick={()=>setShowEmoji(v=>!v)} aria-label="Emojis" title="Emojis">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
        </button>
        <input ref={inputRef} type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onFocus={()=>{ setTimeout(()=>messagesEnd.current?.scrollIntoView({behavior:'smooth'}), 100)}} placeholder={`Message ${partner?.name || ''}...`} autoComplete="off" />
        <button type="submit" className={`chat-send-btn ${newMessage.trim() ? 'ready' : ''}`} disabled={!newMessage.trim()} aria-label="Send">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.5-8.4L3.4 3.6l-.01 6.53L14 12 3.39 13.87z"/></svg>
        </button>
      </form>

      {toast && (
        <div className="chat-toast" role="status">{toast}</div>
      )}

      <BottomNav />
    </div>
  )
}
