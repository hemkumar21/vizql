import { useCallback, useEffect, useRef, useState } from "react";

interface UseAutoScrollOptions {
  offset?: number;
  smooth?: boolean;
  content?: React.ReactNode;
}

export function useAutoScroll(options: UseAutoScrollOptions = {}) {
  const { offset = 20, smooth = false, content } = options;
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastContentHeight = useRef(0);

  const [state, setState] = useState({ isAtBottom: true, autoScrollEnabled: true });

  const checkIsAtBottom = useCallback((el: HTMLElement) => {
    return Math.abs(el.scrollHeight - el.scrollTop - el.clientHeight) <= offset;
  }, [offset]);

  const scrollToBottom = useCallback((instant?: boolean) => {
    if (!scrollRef.current) return;
    const top = scrollRef.current.scrollHeight - scrollRef.current.clientHeight;
    if (instant) { scrollRef.current.scrollTop = top; }
    else { scrollRef.current.scrollTo({ top, behavior: smooth ? "smooth" : "auto" }); }
    setState({ isAtBottom: true, autoScrollEnabled: true });
  }, [smooth]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const atBottom = checkIsAtBottom(scrollRef.current);
    setState((prev) => ({ isAtBottom: atBottom, autoScrollEnabled: atBottom ? true : prev.autoScrollEnabled }));
  }, [checkIsAtBottom]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const h = el.scrollHeight;
    if (h !== lastContentHeight.current) {
      if (state.autoScrollEnabled) requestAnimationFrame(() => scrollToBottom(lastContentHeight.current === 0));
      lastContentHeight.current = h;
    }
  }, [content, state.autoScrollEnabled, scrollToBottom]);

  const disableAutoScroll = useCallback(() => {
    const atBottom = scrollRef.current ? checkIsAtBottom(scrollRef.current) : false;
    if (!atBottom) setState((prev) => ({ ...prev, autoScrollEnabled: false }));
  }, [checkIsAtBottom]);

  return { scrollRef, isAtBottom: state.isAtBottom, autoScrollEnabled: state.autoScrollEnabled, scrollToBottom: () => scrollToBottom(false), disableAutoScroll };
}
