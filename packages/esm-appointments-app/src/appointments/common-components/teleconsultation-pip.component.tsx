import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Tag } from '@carbon/react';
import { Maximize, Minimize, Close, Video, Launch } from '@carbon/react/icons';
import styles from './teleconsultation-pip.scss';

interface TeleconsultationPipProps {
  url: string;
  patientName?: string;
  onClose: () => void;
}

// ── Platform detection ─────────────────────────────────────────────────────────
type Platform = 'zoom' | 'jitsi' | 'other';

function detectPlatform(url: string): Platform {
  if (/zoom\.us|zoomgov\.com/i.test(url)) return 'zoom';
  if (/jitsi|meet\.jit\.si/i.test(url)) return 'jitsi';
  return 'other';
}

/**
 * Extract meeting ID and password from a standard Zoom join URL.
 * e.g. https://us05web.zoom.us/j/84879365867?pwd=pbL5eKTmh3hD7RTmGSjR3quk5r8h
 */
function parseZoomUrl(url: string): { meetingId: string | null; pwd: string | null } {
  const meetingMatch = url.match(/\/j\/(\d+)/);
  const pwdMatch = url.match(/[?&]pwd=([^&]+)/);
  return {
    meetingId: meetingMatch ? meetingMatch[1] : null,
    pwd: pwdMatch ? pwdMatch[1] : null,
  };
}

// ── PiP sizing constants ───────────────────────────────────────────────────────
const MIN_W = 320;
const MIN_H = 240;
const WIDTH_FRACTION = 0.35; // 1/4 of viewport width

// Compute the "default" full-height / quarter-width box for the current viewport
function getResponsiveSize() {
  const w = Math.max(MIN_W, Math.round(window.innerWidth * WIDTH_FRACTION));
  const h = window.innerHeight;
  return { w, h };
}

function getResponsivePos(w: number) {
  return { x: window.innerWidth - w, y: 0 };
}

// ── Zoom Panel (popup-based) ───────────────────────────────────────────────────
const ZoomPanel: React.FC<{ url: string; patientName?: string }> = ({ url, patientName }) => {
  const { t } = useTranslation();
  const popupRef = useRef<Window | null>(null);
  const [popupOpen, setPopupOpen] = useState(false);
  const { meetingId } = parseZoomUrl(url);

  const openOrFocusPopup = useCallback(() => {
    if (popupRef.current && !popupRef.current.closed) {
      popupRef.current.focus();
      return;
    }
    // Open a properly sized popup — Zoom works fine here, unlike iframe
    const w = 1200;
    const h = 720;
    const left = Math.round(window.screen.width / 2 - w / 2);
    const top = Math.round(window.screen.height / 2 - h / 2);
    popupRef.current = window.open(
      url,
      'zoom-teleconsultation',
      `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes,toolbar=no,menubar=no`,
    );
    if (popupRef.current) {
      setPopupOpen(true);
      // Detect when popup is closed
      const interval = setInterval(() => {
        if (popupRef.current?.closed) {
          setPopupOpen(false);
          popupRef.current = null;
          clearInterval(interval);
        }
      }, 800);
    }
  }, [url]);

  // Auto-open popup on first render
  useEffect(() => {
    openOrFocusPopup();
    return () => {
      // Do NOT close the popup on PiP unmount — let the doctor keep the call
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={styles.zoomPanel}>
      {/* Zoom logo area */}
      <div className={styles.zoomLogo}>
        <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
          <rect width="48" height="48" rx="10" fill="#2D8CFF" />
          <path
            d="M8 16.5C8 15.12 9.12 14 10.5 14H28C29.38 14 30.5 15.12 30.5 16.5V26.5C30.5 27.88 29.38 29 28 29H10.5C9.12 29 8 27.88 8 26.5V16.5Z"
            fill="white"
          />
          <path d="M32 19.5L40 15V28L32 23.5V19.5Z" fill="white" />
        </svg>
      </div>

      <div className={styles.zoomInfo}>
        {meetingId && (
          <p className={styles.zoomMeetingId}>
            {t('meetingId', 'Meeting ID')}: <strong>{meetingId}</strong>
          </p>
        )}
        {patientName && (
          <p className={styles.zoomPatient}>
            {t('patient', 'Patient')}: <strong>{patientName}</strong>
          </p>
        )}
        <Tag type={popupOpen ? 'green' : 'gray'} size="sm">
          {popupOpen ? t('sessionActive', 'Session active') : t('sessionEnded', 'Session ended')}
        </Tag>
      </div>

      <div className={styles.zoomActions}>
        <Button
          kind="primary"
          size="md"
          renderIcon={Launch}
          onClick={openOrFocusPopup}>
          {popupOpen
            ? t('focusZoom', 'Focus Zoom window')
            : t('reopenZoom', 'Reopen Zoom')}
        </Button>
        <p className={styles.zoomNote}>
          {t(
            'zoomIframeNote',
            'Zoom runs in a separate window due to browser security restrictions.',
          )}
        </p>
      </div>
    </div>
  );
};

// ── Main PiP component ─────────────────────────────────────────────────────────
const TeleconsultationPip: React.FC<TeleconsultationPipProps> = ({ url, patientName, onClose }) => {
  const { t } = useTranslation();
  const platform = detectPlatform(url);

  // Position & size state — default to full page height, 1/4 viewport width
  const [size, setSize] = useState(() => getResponsiveSize());
  const [pos, setPos] = useState(() => getResponsivePos(getResponsiveSize().w));
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Track whether the user has manually resized/dragged — once they have,
  // we stop forcing the quarter-width/full-height box on window resize.
  const userAdjusted = useRef(false);

  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Responsive: keep full height / 1/4 width in sync with the viewport ──────
  useEffect(() => {
    const onWindowResize = () => {
      if (expanded) return;

      if (!userAdjusted.current) {
        // Still on defaults — recompute full height / quarter width
        const next = getResponsiveSize();
        setSize(next);
        setPos(getResponsivePos(next.w));
      } else {
        // User has customized size/pos — just clamp back into the viewport
        setSize((prevSize) => {
          const w = Math.min(prevSize.w, Math.max(MIN_W, window.innerWidth));
          const h = Math.min(prevSize.h, Math.max(MIN_H, window.innerHeight));
          setPos((prevPos) => ({
            x: Math.max(0, Math.min(window.innerWidth - w, prevPos.x)),
            y: Math.max(0, Math.min(window.innerHeight - h, prevPos.y)),
          }));
          return { w, h };
        });
      }
    };

    window.addEventListener('resize', onWindowResize);
    return () => window.removeEventListener('resize', onWindowResize);
  }, [expanded]);

  // ── Dragging ─────────────────────────────────────────────────────────────────
  const onMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest('button')) return;
      userAdjusted.current = true;
      setIsDragging(true);
      dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const x = Math.max(0, Math.min(window.innerWidth - size.w, e.clientX - dragOffset.current.x));
      const y = Math.max(0, Math.min(window.innerHeight - size.h, e.clientY - dragOffset.current.y));
      setPos({ x, y });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, size]);

  // ── Resizing from edges and corners ───────────────────────────────────────────
  const resizeStart = useRef<{ 
    mx: number; 
    my: number; 
    w: number; 
    h: number; 
    x: number; 
    y: number; 
    edge: string 
  } | null>(null);

  const onResizeMouseDown = useCallback(
    (edge: string) => (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      userAdjusted.current = true;
      resizeStart.current = { 
        mx: e.clientX, 
        my: e.clientY, 
        w: size.w, 
        h: size.h,
        x: pos.x,
        y: pos.y,
        edge 
      };
      
      const onMove = (ev: MouseEvent) => {
        if (!resizeStart.current) return;
        
        const deltaX = ev.clientX - resizeStart.current.mx;
        const deltaY = ev.clientY - resizeStart.current.my;
        
        let newW = resizeStart.current.w;
        let newH = resizeStart.current.h;
        let newX = resizeStart.current.x;
        let newY = resizeStart.current.y;
        
        // Handle horizontal resizing
        if (resizeStart.current.edge.includes('right')) {
          newW = Math.max(MIN_W, resizeStart.current.w + deltaX);
        } else if (resizeStart.current.edge.includes('left')) {
          const proposedW = resizeStart.current.w - deltaX;
          if (proposedW >= MIN_W) {
            newW = proposedW;
            newX = resizeStart.current.x + deltaX;
          }
        }
        
        // Handle vertical resizing
        if (resizeStart.current.edge.includes('bottom')) {
          newH = Math.max(MIN_H, resizeStart.current.h + deltaY);
        } else if (resizeStart.current.edge.includes('top')) {
          const proposedH = resizeStart.current.h - deltaY;
          if (proposedH >= MIN_H) {
            newH = proposedH;
            newY = resizeStart.current.y + deltaY;
          }
        }
        
        // Ensure window stays within viewport
        newX = Math.max(0, Math.min(window.innerWidth - newW, newX));
        newY = Math.max(0, Math.min(window.innerHeight - newH, newY));
        
        setSize({ w: newW, h: newH });
        setPos({ x: newX, y: newY });
      };
      
      const onUp = () => {
        resizeStart.current = null;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    },
    [size, pos],
  );

  const toggleExpand = () => setExpanded((v) => !v);

  const pipStyle: React.CSSProperties = expanded
    ? {}
    : { left: pos.x, top: pos.y, width: size.w, height: size.h };

  // Platform label shown in header
  const platformLabel =
    platform === 'zoom' ? 'Zoom' : platform === 'jitsi' ? 'Jitsi' : t('teleconsultation', 'Teleconsultation');

  return (
    <div
      ref={containerRef}
      className={`${styles.pipContainer} ${expanded ? styles.pipExpanded : ''} ${isDragging ? styles.dragging : ''}`}
      style={pipStyle}
      role="dialog"
      aria-label={t('teleconsultationPip', 'Teleconsultation')}>
      {/* Header / drag handle */}
      <div className={styles.pipHeader} onMouseDown={onMouseDown}>
        <span className={styles.pipTitle}>
          <Video size={16} className={styles.pipTitleIcon} />
          {patientName ? `${platformLabel} – ${patientName}` : platformLabel}
        </span>
        <div className={styles.pipControls}>
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={expanded ? Minimize : Maximize}
            iconDescription={expanded ? t('minimize', 'Minimize') : t('expand', 'Expand')}
            tooltipPosition="left"
            onClick={toggleExpand}
          />
          <Button
            kind="ghost"
            size="sm"
            hasIconOnly
            renderIcon={Close}
            iconDescription={t('close', 'Close')}
            tooltipPosition="left"
            onClick={onClose}
          />
        </div>
      </div>

      {/* Body: Zoom gets popup panel, others get iframe */}
      {platform === 'zoom' ? (
        <ZoomPanel url={url} patientName={patientName} />
      ) : (
        <iframe
          src={url}
          className={styles.pipIframe}
          allow="camera; microphone; display-capture; autoplay; fullscreen"
          allowFullScreen
          title={t('teleconsultationSession', 'Teleconsultation session')}
        />
      )}

      {/* Resize handles for edges and corners */}
      {!expanded && (
        <>
          {/* Corners */}
          <div className={`${styles.resizeHandle} ${styles.resizeTopLeft}`} onMouseDown={onResizeMouseDown('top-left')} aria-hidden="true" />
          <div className={`${styles.resizeHandle} ${styles.resizeTopRight}`} onMouseDown={onResizeMouseDown('top-right')} aria-hidden="true" />
          <div className={`${styles.resizeHandle} ${styles.resizeBottomLeft}`} onMouseDown={onResizeMouseDown('bottom-left')} aria-hidden="true" />
          <div className={`${styles.resizeHandle} ${styles.resizeBottomRight}`} onMouseDown={onResizeMouseDown('bottom-right')} aria-hidden="true" />
          
          {/* Edges */}
          <div className={`${styles.resizeHandle} ${styles.resizeTop}`} onMouseDown={onResizeMouseDown('top')} aria-hidden="true" />
          <div className={`${styles.resizeHandle} ${styles.resizeRight}`} onMouseDown={onResizeMouseDown('right')} aria-hidden="true" />
          <div className={`${styles.resizeHandle} ${styles.resizeBottom}`} onMouseDown={onResizeMouseDown('bottom')} aria-hidden="true" />
          <div className={`${styles.resizeHandle} ${styles.resizeLeft}`} onMouseDown={onResizeMouseDown('left')} aria-hidden="true" />
        </>
      )}
    </div>
  );
};

export default TeleconsultationPip;