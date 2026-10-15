import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  CircleUserRound,
  KeyRound,
} from "lucide-react";
import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import styles from "./AccountField.module.css";
interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  onDark?: boolean;
}
export default function AccountField({
  label,
  type = "text",
  onDark,
  ...props
}: Props) {
  const [visible, setVisible] = useState(false);
  const Icon =
    type === "password"
      ? LockKeyhole
      : type === "email"
        ? Mail
        : props.autoComplete === "one-time-code"
          ? KeyRound
          : CircleUserRound;
  return (
    <label className={`${styles.field} ${onDark ? styles.dark : ""}`}>
      <span>{label}</span>
      <div>
        {onDark && (
          <div className={styles.icon}>
            <Icon size={18} />
          </div>
        )}
        <input
          {...props}
          aria-label={label}
          placeholder={onDark ? label : props.placeholder}
          type={type === "password" && visible ? "text" : type}
        />
        {type === "password" && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible(!visible)}
          >
            {visible ? <EyeOff size={17} /> : <Eye size={17} />}
          </button>
        )}
      </div>
    </label>
  );
}
