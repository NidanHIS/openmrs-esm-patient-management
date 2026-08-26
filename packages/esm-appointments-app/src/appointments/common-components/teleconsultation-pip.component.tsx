import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@carbon/react';
import { Maximize, Minimize, Close, Video } from '@carbon/react/icons';
import styles from './teleconsultation-pip.scss';

interface TeleconsultationPipProps {
  url: string;
  patientName?: string;
  onClose: () => void;
}

const MIN_W = 320;
const MIN_H = 240;
const DEFAULT_W = 480;
const DEFAULT_H = 320;

const TeleconsultationPip: React.FC<TeleconsultationPipProps> = ({ url, patientName, onClose }) => {
  const { t } = useTranslation();

  // Position & size state
  const [pos, setPos] = useState({ x: window.innerWidth - DEFAULT_W - 24, y: window.innerHeight - DEFAULT_H - 64 });
  const [size, setSize] = useState({ w: DEFAULT_W, h: DEFAULT_H });
  const [expanded, setExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Dragging ──────────────────────────────────────────────────────────────
  const onMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag via the header bar
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  }, [pos]);

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

  // ── Resizing ──────────────────────────────────────────────────────────────
  const resizeStart = useRef<{ mx: number; my: number; w: number; h: number } | null>(null);

  const onResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    resizeStart.current = { mx: e.clientX, my: e.clientY, w: size.w, h: size.h };
    const onMove = (ev: MouseEvent) => {
      if (!resizeStart.current) return;
      const newW = Math.max(MIN_W, resizeStart.current.w + (ev.clientX - resizeStart.current.mx));
      const newH = Math.max(MIN_H, resizeStart.current.h + (ev.clientY - resizeStart.current.my));
      setSize({ w: newW, h: newH });
    };
    const onUp = () => {
      resizeStart.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [size]);

  // ── Toggle expanded (full-screen-ish) ────────────────────────────────────
  const toggleExpand = () => setExpanded((v) => !v);

  const pipStyle: React.CSSProperties = expanded
    ? {}
    : {
        left: pos.x,
        top: pos.y,
        width: size.w,
        height: size.h,
      };

  return (
    <div
      ref={containerRef}
      className={`${styles.pipContainer} ${expanded ? styles.pipExpanded : ''} ${isDragging ? styles.dragging : ''}`}
      style={pipStyle}
      role="dialog"
      aria-label={t('teleconsultationPip', 'Teleconsultation')}
    >
      {/* Header / drag handle */}
      <div className={styles.pipHeader} onMouseDown={onMouseDown}>
        <span className={styles.pipTitle}>
          <Video size={16} className={styles.pipTitleIcon} />
          {patientName
            ? t('teleconsultationWith', 'Teleconsultation – {{name}}', { name: patientName })
            : t('teleconsultation', 'Teleconsultation')}
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

      {/* Video iframe */}
      <iframe
        src={url}
        className={styles.pipIframe}
        allow="camera; microphone; display-capture; autoplay; fullscreen"
        allowFullScreen
        title={t('teleconsultationSession', 'Teleconsultation session')}
      />

      {/* Resize handle (bottom-right corner) */}
      {!expanded && (
        <div className={styles.resizeHandle} onMouseDown={onResizeMouseDown} aria-hidden="true" />
      )}
    </div>
  );
};

export default TeleconsultationPip;
