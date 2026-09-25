'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';

export interface RowActionItem {
  key?: string;
  label: string;
  /** For a one-shot action. Ignored if `href` is set. */
  onClick?: () => void;
  /** For a navigation item — rendered as a Link instead of a button. */
  href?: string;
  disabled?: boolean;
  danger?: boolean;
}

/**
 * Per-row "⋮" actions menu shared by admin tables (students, colleges, …) —
 * replaces a row of crammed text links with one compact trigger.
 *
 * Fixed-positioned (computed from the button) so it isn't clipped by a
 * scrollable table card, and portaled to <body> — rendered inline it would
 * sit inside the admin/student shell's page-transition wrapper ((admin) or
 * (student) template.tsx, an animated div), which turns `position: fixed`
 * into "fixed to that ancestor's box" instead of the real viewport. Keep
 * this the one place that logic lives, rather than copy-pasting it per page.
 */
export function RowActionsMenu({
  items,
  label = 'Row actions',
  width = 192,
}: {
  items: RowActionItem[];
  label?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    }
    function close() {
      setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  function toggle() {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.right - width });
    setOpen((o) => !o);
  }

  const itemCls = (danger?: boolean, disabled?: boolean) =>
    `block w-full px-3 py-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-50 ${
      disabled ? '' : 'hover:bg-app'
    } ${danger ? 'text-danger' : 'text-body'}`;

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        aria-label={label}
        aria-haspopup="menu"
        className="rounded-md p-1.5 text-subtle transition hover:bg-app hover:text-strong"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="12" cy="5" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="12" cy="19" r="1.6" />
        </svg>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: 'fixed', top: pos.top, left: pos.left, width }}
            className="z-50 overflow-hidden rounded-md border border-border bg-white py-1 shadow-card"
          >
            {items.map((item) =>
              item.href ? (
                <Link
                  key={item.key ?? item.label}
                  href={item.href}
                  className={itemCls(item.danger)}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ) : (
                <button
                  key={item.key ?? item.label}
                  onClick={() => {
                    setOpen(false);
                    item.onClick?.();
                  }}
                  disabled={item.disabled}
                  className={itemCls(item.danger, item.disabled)}
                  role="menuitem"
                >
                  {item.label}
                </button>
              ),
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
