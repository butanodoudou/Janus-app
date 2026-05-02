import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

const MAX_CHARS = 150

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (m < 1) return "à l'instant"
  if (m < 60) return `il y a ${m}min`
  if (h < 24) return `il y a ${h}h`
  return `il y a ${d}j`
}

export default function Comments({ questionId, userChoice, categoryColor, userId }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [replyTo, setReplyTo] = useState(null) // { id, choice, preview }
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadComments()
  }, [questionId])

  async function loadComments() {
    const { data } = await supabase
      .from('comments')
      .select('*')
      .eq('question_id', questionId)
      .order('created_at', { ascending: true })

    if (data) {
      const roots = []
      const map = {}
      data.forEach(c => { map[c.id] = { ...c, replies: [] } })
      data.forEach(c => {
        if (c.parent_id && map[c.parent_id]) {
          map[c.parent_id].replies.push(map[c.id])
        } else {
          roots.push(map[c.id])
        }
      })
      setComments(roots)
    }
  }

  async function submit() {
    if (!text.trim() || submitting) return
    setSubmitting(true)

    const { data, error } = await supabase.from('comments').insert({
      question_id: questionId,
      user_id: userId,
      choice: userChoice,
      text: text.trim(),
      parent_id: replyTo?.id || null,
    }).select().single()

    if (!error && data) {
      const newComment = { ...data, replies: [] }
      if (replyTo) {
        setComments(prev => prev.map(c =>
          c.id === replyTo.id
            ? { ...c, replies: [...c.replies, newComment] }
            : c
        ))
      } else {
        setComments(prev => [...prev, newComment])
      }
      setText('')
      setReplyTo(null)
    }

    setSubmitting(false)
  }

  const choiceColor = (choice) => choice === userChoice ? categoryColor : '#888'

  return (
    <div style={styles.container}>
      <p style={styles.heading}>
        Réactions{comments.length > 0 ? ` · ${comments.length + comments.reduce((acc, c) => acc + c.replies.length, 0)}` : ''}
      </p>

      {/* Liste des commentaires */}
      {comments.length > 0 && (
        <div style={styles.list}>
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              choiceColor={choiceColor}
              onReply={() => setReplyTo({ id: comment.id, choice: comment.choice, preview: comment.text })}
              isReplyTarget={replyTo?.id === comment.id}
            />
          ))}
        </div>
      )}

      {/* Formulaire */}
      <div style={styles.form}>
        {replyTo && (
          <div style={styles.replyBanner}>
            <span style={{ color: choiceColor(replyTo.choice), fontWeight: 700 }}>
              {replyTo.choice}
            </span>
            <span style={styles.replyPreview}>
              {replyTo.preview.slice(0, 50)}{replyTo.preview.length > 50 ? '…' : ''}
            </span>
            <button style={styles.cancelReply} onClick={() => setReplyTo(null)}>✕</button>
          </div>
        )}

        <div style={styles.inputRow}>
          <div style={{ ...styles.choiceDot, background: categoryColor }}>
            {userChoice}
          </div>
          <textarea
            style={styles.input}
            placeholder={replyTo ? 'Ta réponse…' : 'Dis ce que tu penses…'}
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
            rows={2}
          />
        </div>

        <div style={styles.inputFooter}>
          <span style={{
            ...styles.charCount,
            color: text.length > 130 ? '#e53e3e' : '#ccc',
          }}>
            {text.length}/{MAX_CHARS}
          </span>
          <button
            style={{
              ...styles.sendBtn,
              opacity: text.trim() && !submitting ? 1 : 0.4,
              background: categoryColor,
            }}
            onClick={submit}
            disabled={!text.trim() || submitting}
          >
            {submitting ? '…' : 'Envoyer'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CommentItem({ comment, choiceColor, onReply, isReplyTarget }) {
  const color = choiceColor(comment.choice)

  return (
    <div style={styles.commentBlock}>
      <div style={{
        ...styles.comment,
        borderLeft: `3px solid ${color}`,
        background: isReplyTarget ? '#f8f8ff' : '#fff',
      }}>
        <div style={styles.commentHeader}>
          <span style={{ ...styles.commentChoice, color, borderColor: color }}>
            {comment.choice}
          </span>
          <span style={styles.commentTime}>{timeAgo(comment.created_at)}</span>
        </div>
        <p style={styles.commentText}>{comment.text}</p>
        <button style={styles.replyBtn} onClick={onReply}>
          ↩ Répondre
        </button>
      </div>

      {/* Réponses imbriquées */}
      {comment.replies.length > 0 && (
        <div style={styles.replies}>
          {comment.replies.map(reply => (
            <div key={reply.id} style={{
              ...styles.comment,
              borderLeft: `3px solid ${choiceColor(reply.choice)}`,
            }}>
              <div style={styles.commentHeader}>
                <span style={{
                  ...styles.commentChoice,
                  color: choiceColor(reply.choice),
                  borderColor: choiceColor(reply.choice),
                }}>
                  {reply.choice}
                </span>
                <span style={styles.commentTime}>{timeAgo(reply.created_at)}</span>
              </div>
              <p style={styles.commentText}>{reply.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    paddingTop: '4px',
    borderTop: '1px solid #eee',
    marginTop: '4px',
  },
  heading: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '320px',
    overflowY: 'auto',
  },
  commentBlock: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  comment: {
    padding: '10px 12px',
    borderRadius: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    border: '1px solid #f0f0f0',
  },
  commentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  commentChoice: {
    fontSize: '11px',
    fontWeight: 800,
    padding: '1px 7px',
    borderRadius: '20px',
    border: '1.5px solid',
  },
  commentTime: {
    fontSize: '11px',
    color: '#bbb',
  },
  commentText: {
    fontSize: '14px',
    color: '#333',
    lineHeight: 1.45,
  },
  replyBtn: {
    alignSelf: 'flex-start',
    fontSize: '12px',
    color: '#aaa',
    fontWeight: 600,
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontFamily: 'inherit',
    padding: 0,
  },
  replies: {
    marginLeft: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  replyBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    background: '#f5f5ff',
    borderRadius: '8px',
    fontSize: '12px',
  },
  replyPreview: {
    flex: 1,
    color: '#888',
    fontStyle: 'italic',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cancelReply: {
    background: 'none',
    border: 'none',
    color: '#aaa',
    cursor: 'pointer',
    fontSize: '13px',
    fontFamily: 'inherit',
    padding: 0,
  },
  inputRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  choiceDot: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: '4px',
  },
  input: {
    flex: 1,
    padding: '10px 12px',
    fontSize: '14px',
    fontFamily: 'inherit',
    border: '2px solid #e5e5e5',
    borderRadius: '10px',
    resize: 'none',
    outline: 'none',
    background: '#fff',
    color: '#111',
    lineHeight: 1.4,
  },
  inputFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: '36px',
  },
  charCount: {
    fontSize: '11px',
    transition: 'color 0.15s',
  },
  sendBtn: {
    padding: '8px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit',
    transition: 'opacity 0.15s',
  },
}
