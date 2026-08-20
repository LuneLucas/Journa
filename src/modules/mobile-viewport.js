/* Journa mobile viewport coordination: keyboard state and focused-input reveal.
   The module owns browser viewport events; app state is supplied through getters
   so the coordinator does not retain a second copy of ledger state. */
(function attachMobileViewportModule(global) {
  "use strict";

  function createMobileViewportCoordinator({
    getNaturalEntryStageOpen,
    getActiveEntryEditor,
    scrollNaturalEntrySplitInputIntoView,
  }) {
    const KEYBOARD_MIN_OVERLAP = 140;
    const viewport = global.visualViewport;
    const mobileQuery = global.matchMedia("(max-width: 820px)");
    let focusedEl = null;
    let started = false;

    const isTextEntry = (element) =>
      element && (
        element.tagName === "SELECT"
        || element.tagName === "TEXTAREA"
        || (element.tagName === "INPUT" && !["button", "checkbox", "radio", "range", "submit"].includes(element.type))
      );

    const isKeyboardOpen = () => {
      if (!isTextEntry(global.document.activeElement)) return false;
      if (!viewport) return true;
      return global.innerHeight - viewport.height > KEYBOARD_MIN_OVERLAP;
    };

    const syncKeyboardFlag = () => {
      global.document.body.classList.toggle("keyboard-open", isKeyboardOpen());
    };

    const scrollFocusedIntoView = () => {
      if (!focusedEl || global.document.activeElement !== focusedEl) return;
      if (getNaturalEntryStageOpen() && getActiveEntryEditor() === "split" && focusedEl.matches("[data-split-amount]")) {
        scrollNaturalEntrySplitInputIntoView(focusedEl);
        return;
      }
      focusedEl.scrollIntoView({ block: "center", behavior: "auto" });
    };

    function setup() {
      if (started) return;
      started = true;

      global.document.addEventListener("focusin", (event) => {
        syncKeyboardFlag();
        if (!mobileQuery.matches || !isTextEntry(event.target)) return;
        focusedEl = event.target;
        // 等键盘动画基本结束再滚（iOS 约 250-300ms），避免与 resize 抢滚动。
        global.setTimeout(scrollFocusedIntoView, 300);
      });
      global.document.addEventListener("focusout", (event) => {
        if (event.target === focusedEl) focusedEl = null;
        // 延迟一拍，防止焦点在输入间切换时提交栏闪烁。
        global.setTimeout(syncKeyboardFlag, 0);
      });
      viewport?.addEventListener("resize", () => {
        syncKeyboardFlag();
        // 键盘高度变化后再校正一次（含悬浮键盘完全弹起到位）。
        if (focusedEl && global.document.activeElement === focusedEl) {
          global.setTimeout(scrollFocusedIntoView, 50);
        }
      });
    }

    return { setup };
  }

  global.JournaModules = global.JournaModules || {};
  global.JournaModules.createMobileViewportCoordinator = createMobileViewportCoordinator;
})(window);
