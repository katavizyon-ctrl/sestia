'use client';

import { useState } from 'react';
import { FeedbackIcon, CloseIcon } from '@/components/icons';

export default function FeedbackButton({ screen }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const clean = message.trim();
    if (!clean || sending) return;
    setSending(true);
    setError(null);
    try {
      // fetch 401/500'de throw etmez — res.ok kontrol edilmezse sunucu
      // kaydetmediği hâlde "Gönderildi" gösterilir.
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: clean, screen }),
      });
      if (!res.ok) throw new Error('feedback_failed');
      setSent(true);
      setMessage('');
      setTimeout(() => {
        setSent(false);
        setOpen(false);
      }, 1200);
    } catch {
      // Mesaj textarea'da kalıyor, kullanıcı tekrar deneyebilir.
      setError('Mesajın gönderilemedi. Tekrar dener misin?');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button className="feedback-fab" aria-label="Geri bildirim gönder" onClick={() => setOpen(true)}>
        <FeedbackIcon style={{ width: 20, height: 20 }} />
      </button>

      {open && (
        <div className="feedback-sheet-backdrop" onClick={() => !sending && setOpen(false)}>
          <form className="feedback-sheet" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <div className="topbar" style={{ justifyContent: 'space-between' }}>
              <div style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600 }}>Geri Bildirim</div>
              <button type="button" className="iconbtn" style={{ width: 30, height: 30 }} onClick={() => setOpen(false)} aria-label="Kapat">
                <CloseIcon style={{ width: 14, height: 14 }} />
              </button>
            </div>
            <div className="muted">Bir şey mi tuhaf geldi, bir fikrin mi var? Yaz, direkt bize ulaşsın.</div>
            <textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Aklından ne geçiyor?"
              maxLength={2000}
              disabled={sending}
            />
            {error && <div role="alert" className="errbox">{error}</div>}
            <button className="btn-primary" type="submit" disabled={!message.trim() || sending}>
              {sent ? 'Gönderildi, teşekkürler!' : sending ? 'Gönderiliyor...' : 'Gönder'}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
