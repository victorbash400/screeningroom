import { Plus } from "lucide-react";
import type { MediaWorkflow } from "../../lib/mediaWorkflows";
import { mediaWorkflows } from "../../lib/mediaWorkflows";
import SimilarMediaIllustration from "./SimilarMediaIllustration";
import CompareMediaIllustration from "./CompareMediaIllustration";
import styles from "./MediaWorkflowStarter.module.css";

const illustrations = { similar: SimilarMediaIllustration, compare: CompareMediaIllustration };
export default function MediaWorkflowStarter({ workflow, onSelect }: { workflow: MediaWorkflow; onSelect: () => void }) {
  const Illustration = illustrations[workflow];
  return <div className={styles.starter}><Illustration /><strong>{mediaWorkflows.find((item) => item.channel === workflow)?.action}</strong>
    <button type="button" onClick={onSelect}><Plus size={16} />Select media</button>
  </div>;
}
