/**
 * Teleconsultation PiP Manager
 *
 * Mounts the floating PiP window into its own isolated React root on document.body.
 * Because this root is NOT part of any route-driven component tree, the window
 * survives URL changes, page navigations, and component unmounts.
 */
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import TeleconsultationPip from './teleconsultation-pip.component';

const CONTAINER_ID = 'teleconsultation-pip-root';

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function getOrCreateRoot(): Root {
  if (!container || !document.getElementById(CONTAINER_ID)) {
    // Clean up any stale node first
    closeTeleconsultationPip();

    container = document.createElement('div');
    container.id = CONTAINER_ID;
    document.body.appendChild(container);
    root = createRoot(container);
  }
  return root!;
}

/**
 * Open (or replace) the floating PiP with the given teleconsultation URL.
 * Safe to call multiple times — subsequent calls just update the session.
 */
export function openTeleconsultationPip(url: string, patientName?: string): void {
  const r = getOrCreateRoot();
  r.render(
    React.createElement(TeleconsultationPip, {
      url,
      patientName,
      onClose: closeTeleconsultationPip,
    }),
  );
}

/**
 * Programmatically close and destroy the floating PiP.
 * Also called internally by the PiP's own Close button via onClose.
 */
export function closeTeleconsultationPip(): void {
  if (root) {
    root.unmount();
    root = null;
  }
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    container = null;
  }
}
