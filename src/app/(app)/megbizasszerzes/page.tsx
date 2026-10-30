import { FeatureGate } from "@/components/domain/feature-gate";
import { PhasePlaceholder } from "@/components/domain/phase-placeholder";

export default function Page() {
  return (
    <FeatureGate feature="ai.listing_presentation" preview={<PhasePlaceholder section="acquisition" />}>
      <PhasePlaceholder section="acquisition" />
    </FeatureGate>
  );
}
