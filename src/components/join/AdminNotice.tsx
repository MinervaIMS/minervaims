import { usePermissions } from '@/hooks/usePermissions';

// =====================================================================
// Admin-only warning, in the spirit of PageVisibilityGate's banner but
// placed inline so it names the section it belongs to.
//
// Readers never see it. Workspace accounts see exactly what is missing
// and where to fix it, while the public page carries on rendering its
// designed empty state underneath.
// =====================================================================

interface Props {
  /** Shown verbatim. Written in the same register as the rest of the site. */
  message: string;
}

export function AdminNotice({ message }: Props) {
  const { isFullAccess } = usePermissions();
  if (!isFullAccess) return null;

  return (
    <p
      role="status"
      className="font-body text-sm leading-relaxed mt-6 px-4 py-3 border"
      style={{
        color: '#C3B9E0',
        borderColor: 'rgba(195, 185, 224, 0.4)',
        background: 'rgba(195, 185, 224, 0.07)',
      }}
    >
      <span className="uppercase tracking-[0.18em] text-xs">Workspace only</span>
      <span className="block mt-1" style={{ color: 'rgba(255,255,255,0.86)' }}>
        {message}
      </span>
    </p>
  );
}

export default AdminNotice;
