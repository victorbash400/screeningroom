import { useRef, useState } from "react";
import styles from "./VerificationCodeInput.module.css";

export default function VerificationCodeInput({
  disabled,
  onChange,
}: {
  disabled: boolean;
  onChange: (code: string) => void;
}) {
  const [values, setValues] = useState<string[]>(Array(6).fill(""));
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  function focus(index: number) {
    inputs.current[index]?.focus();
    inputs.current[index]?.select();
  }
  function change(index: number, value: string) {
    const digits = Array.from(value).filter(
      (char) => char >= "0" && char <= "9",
    );
    const next = [...values];
    if (!digits.length) next[index] = "";
    else {
      const start = digits.length >= 6 ? 0 : index;
      for (
        let offset = 0;
        offset < digits.length && start + offset < 6;
        offset++
      )
        next[start + offset] = digits[offset];
      focus(Math.min(start + digits.length, 5));
    }
    setValues(next);
    onChange(next.join(""));
  }
  return (
    <div className={styles.fields} role="group" aria-label="Verification code">
      {values.map((value, index) => (
        <input
          key={index}
          ref={(element) => {
            inputs.current[index] = element;
          }}
          aria-label={`Code digit ${index + 1} of 6`}
          value={value}
          disabled={disabled}
          autoFocus={index === 0}
          autoComplete={index === 0 ? "one-time-code" : "off"}
          inputMode="numeric"
          spellCheck={false}
          placeholder="—"
          required
          onFocus={(event) => event.target.select()}
          onChange={(event) => change(index, event.target.value)}
          onPaste={(event) => {
            event.preventDefault();
            change(index, event.clipboardData.getData("text"));
          }}
          onKeyDown={(event) => {
            if (event.key === "Backspace" && !value && index > 0) {
              event.preventDefault();
              const next = [...values];
              next[index - 1] = "";
              setValues(next);
              onChange(next.join(""));
              focus(index - 1);
            }
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.preventDefault();
              focus(
                Math.max(
                  0,
                  Math.min(5, index + (event.key === "ArrowLeft" ? -1 : 1)),
                ),
              );
            }
          }}
        />
      ))}
    </div>
  );
}
