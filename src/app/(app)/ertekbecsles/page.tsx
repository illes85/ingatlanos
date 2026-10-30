import { FeatureGate } from "@/components/domain/feature-gate";
import { PhasePlaceholder } from "@/components/domain/phase-placeholder";

export default function Page() {
  return (
    <FeatureGate feature="ai.valuation_report" preview={<PhasePlaceholder section="valuation" />}>
      <PhasePlaceholder section="valuation" />
    </FeatureGate>
  );
}
