import { useState } from "react";
import AccountField from "../account/AccountField";
import PillButton from "../controls/PillButton";
import styles from "./ImportLinkForm.module.css";

export default function ImportLinkForm({
  onImport,
}: {
  onImport: (url: string, name: string) => boolean;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (url.trim()) onImport(url, name);
      }}
    >
      <AccountField
        label="Link"
        type="url"
        required
        placeholder="https://"
        autoFocus
        value={url}
        onChange={(event) => setUrl(event.target.value)}
      />
      <AccountField
        label="Name (optional)"
        value={name}
        maxLength={255}
        onChange={(event) => setName(event.target.value)}
      />
      <div className={styles.actions}>
        <PillButton type="submit" disabled={!url.trim()}>
          Import
        </PillButton>
      </div>
    </form>
  );
}
