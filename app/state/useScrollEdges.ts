import { useEffect, useRef } from "react";
export function useScrollEdges<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    function update() {
      if (!element) return;
      element.dataset.scrollBefore = String(element.scrollTop > 1);
      element.dataset.scrollAfter = String(
        element.scrollHeight - element.clientHeight - element.scrollTop > 1,
      );
    }
    const resize = new ResizeObserver(update);
    const observed = new Set<Element>();
    function observeContent() {
      for (const child of observed)
        if (child.parentElement !== element) {
          resize.unobserve(child);
          observed.delete(child);
        }
      for (const child of element?.children ?? [])
        if (!observed.has(child)) {
          resize.observe(child);
          observed.add(child);
        }
      update();
    }
    const mutations = new MutationObserver(observeContent);
    resize.observe(element);
    observeContent();
    mutations.observe(element, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      resize.disconnect();
      mutations.disconnect();
      element.removeEventListener("scroll", update);
    };
  }, []);
  return ref;
}
