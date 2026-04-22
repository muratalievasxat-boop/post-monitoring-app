import { type ReactNode } from 'react';

export function Modal({
  title,
  subtitle,
  onClose,
  children,
  small = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  small?: boolean;
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className={`modal ${small ? 'small' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <div className="modal-title">{title}</div>
            {subtitle ? <div className="modal-subtitle">{subtitle}</div> : null}
          </div>
          <button className="modal-close" onClick={onClose}>
            Закрыть
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
