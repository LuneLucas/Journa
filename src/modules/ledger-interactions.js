(function attachLedgerInteractionsModule(global) {
  "use strict";

  function createLedgerInteractionHelpers({
    getElements,
    getActiveMobilePanel,
    getMobileSubmitBarLedgerHidden,
    setMobileSubmitBarLedgerHidden,
    prefersReducedMotion,
    uiIconHtml,
    syncLedgerItemNoteState,
  }) {
    function canAnimateLedgerMorph() {
      const elements = getElements();
      return Boolean(
        elements.ledgerList
          && !prefersReducedMotion()
          && typeof global.Element?.prototype?.animate === "function",
      );
    }

    function syncLedgerMobileSubmitBar(isExpanded) {
      const mobileSubmitBar = getElements().mobileSubmitBar;
      if (!mobileSubmitBar) return;
      const suppressForExpandedLedger = getActiveMobilePanel() === "data" && Boolean(isExpanded);
      const visibilityChanged = getMobileSubmitBarLedgerHidden() !== suppressForExpandedLedger;
      setMobileSubmitBarLedgerHidden(suppressForExpandedLedger);
      if (visibilityChanged) {
        if (suppressForExpandedLedger) {
          mobileSubmitBar.style.removeProperty("transition");
          mobileSubmitBar.style.removeProperty("opacity");
          mobileSubmitBar.classList.add("is-ledger-expanded-hidden");
          mobileSubmitBar.style.opacity = "0";
        } else {
          mobileSubmitBar.style.setProperty("transition", "none", "important");
          mobileSubmitBar.classList.remove("is-ledger-expanded-hidden");
          mobileSubmitBar.style.setProperty("opacity", "1", "important");
          void mobileSubmitBar.offsetWidth;
          global.requestAnimationFrame(() => {
            if (!mobileSubmitBar.classList.contains("is-ledger-expanded-hidden")) {
              mobileSubmitBar.style.removeProperty("opacity");
              mobileSubmitBar.style.removeProperty("transition");
            }
          });
        }
      } else {
        mobileSubmitBar.classList.toggle("is-ledger-expanded-hidden", suppressForExpandedLedger);
      }
      mobileSubmitBar.setAttribute("aria-hidden", String(suppressForExpandedLedger));
      mobileSubmitBar.toggleAttribute("inert", suppressForExpandedLedger);
    }

    function cancelLedgerItemAnimations(item) {
      item?._heightAnimation?.cancel();
      item?._ledgerDetailsAnimation?.cancel();
      item?._ledgerActionsAnimation?.cancel();
      item?._ledgerRailAnimation?.cancel();
      if (!item) return;
      item._heightAnimation = null;
      item._ledgerDetailsAnimation = null;
      item._ledgerActionsAnimation = null;
      item._ledgerRailAnimation = null;
    }

    function syncLedgerItemExpandedState(item, isExpanded, { deferHide = false } = {}) {
      if (!item) return;
      item.classList.toggle("is-expanded", isExpanded);
      item.classList.remove("is-ledger-expanding", "is-ledger-collapsing");
      const summaryToggle = item.querySelector(".ledger-summary-toggle");
      const content = item.querySelector(".ledger-expanded-content");
      summaryToggle?.setAttribute("aria-expanded", String(isExpanded));
      summaryToggle?.setAttribute("aria-controls", content?.id || "");
      if (summaryToggle) {
        const suffix = isExpanded ? "收起详情" : "展开详情";
        const baseLabel = summaryToggle.getAttribute("aria-label") || "这笔账单";
        summaryToggle.setAttribute("aria-label", baseLabel.replace(/，(?:收起详情|展开详情)$/, `，${suffix}`));
      }

      const cue = item.querySelector(".ledger-expand-cue");
      if (cue) cue.innerHTML = uiIconHtml(isExpanded ? "chevron-up" : "chevron-down");

      if (content) {
        content.toggleAttribute("inert", !isExpanded);
        content.setAttribute("aria-hidden", String(!isExpanded));
        if (isExpanded) content.hidden = false;
        else if (!deferHide) content.hidden = true;
      }

      const actions = item.querySelector(".ledger-item-actions");
      actions?.querySelectorAll("button").forEach((button) => {
        button.tabIndex = isExpanded ? 0 : -1;
      });
      syncLedgerItemNoteState(item);

      if (!isExpanded && item.contains(global.document.activeElement)) {
        summaryToggle?.focus({ preventScroll: true });
      }
    }

    function finalizeLedgerItemState(item, isExpanded) {
      const content = item.querySelector(".ledger-expanded-content");
      if (content) {
        content.hidden = !isExpanded;
        content.toggleAttribute("inert", !isExpanded);
        content.setAttribute("aria-hidden", String(!isExpanded));
      }
      item.style.height = "";
      item.style.minHeight = "";
      item.style.maxHeight = "";
      item.classList.remove("is-ledger-expanding", "is-ledger-collapsing");
      syncLedgerItemNoteState(item);
    }

    return {
      canAnimateLedgerMorph,
      syncLedgerMobileSubmitBar,
      cancelLedgerItemAnimations,
      syncLedgerItemExpandedState,
      finalizeLedgerItemState,
    };
  }

  global.JournaModules = global.JournaModules || {};
  global.JournaModules.createLedgerInteractionHelpers = createLedgerInteractionHelpers;
})(window);
