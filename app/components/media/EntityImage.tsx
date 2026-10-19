import { canResolveEntityImage } from "../../lib/entityImage";
import ResolvedEntityImage from "./ResolvedEntityImage";

export interface EntityImageProps {
  src?: string;
  entityId?: string;
  label: string;
  className?: string;
  priority?: boolean;
  fit?: "cover" | "contain";
}

export default function EntityImage(props: EntityImageProps) {
  const entityId = canResolveEntityImage(props.entityId) ? props.entityId : undefined;
  if (!props.src && !entityId) return null;
  return <ResolvedEntityImage key={`${props.src ?? ""}:${entityId ?? ""}`} {...props} entityId={entityId} />;
}
