export type EvidencePackagePayload = Record<string, unknown>;

export function downloadEvidencePackage(claimId: string, payload: EvidencePackagePayload) {
  if (typeof window === 'undefined') return;
  const documentPayload = {
    manifest: {
      format: 'fraud-copilot-oig-evidence-demo-v1',
      generated_at: new Date().toISOString(),
      claim_id: claimId,
      read_only_export: true,
      note: 'Synthetic demonstration export. Not an official OIG file specification.',
    },
    ...payload,
  };
  const blob = new Blob([JSON.stringify(documentPayload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${claimId}-evidence-package.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
