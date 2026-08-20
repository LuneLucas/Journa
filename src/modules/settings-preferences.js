(function attachSettingsPreferencesModule(global) {
  "use strict";

  function createSettingsPreferences({
    themePresets,
    legacyThemeIdMap,
    themeStorageKey,
    getElements,
    escapeHtml,
  }) {
    function normalizeThemeId(value) {
      const mapped = legacyThemeIdMap[String(value || "")] || String(value || "");
      return themePresets.some((preset) => preset.id === mapped) ? mapped : themePresets[0].id;
    }

    function getActiveThemeId() {
      const root = global.document.documentElement;
      const current = root.dataset.theme;
      const normalized = normalizeThemeId(current);
      if (current !== normalized) root.dataset.theme = normalized;
      return normalized;
    }

    function migrateThemePreference() {
      const root = global.document.documentElement;
      const current = root.dataset.theme;
      const normalized = normalizeThemeId(current);
      root.dataset.theme = normalized;
      if (current !== normalized) {
        try {
          global.localStorage.setItem(themeStorageKey, normalized);
        } catch (error) {
          /* 私密模式等场景存不了就只在本次会话生效 */
        }
      }
      return normalized;
    }

    function syncThemeColorMeta() {
      const bg = global.getComputedStyle(global.document.documentElement).getPropertyValue("--bg").trim();
      if (!bg) return;
      const isDark = global.matchMedia?.("(prefers-color-scheme: dark)").matches;
      const meta = global.document.querySelector(`meta[name="theme-color"][media*="${isDark ? "dark" : "light"}"]`);
      meta?.setAttribute("content", bg);
    }

    function renderThemePresetList() {
      const elements = getElements();
      if (!elements.settingsThemeList) return;
      const activeThemeId = getActiveThemeId();
      elements.settingsThemeList.innerHTML = themePresets
        .map((preset) => {
          const isSelected = preset.id === activeThemeId;
          return `
        <button class="theme-choice${isSelected ? " is-selected" : ""}" type="button" role="radio" data-theme-id="${escapeHtml(preset.id)}" aria-checked="${isSelected}">
          <span class="theme-choice-preview" aria-hidden="true">
            <span class="theme-preview-glow"></span>
            <span class="theme-preview-surface"></span>
            <span class="theme-preview-accent"></span>
          </span>
          <span class="theme-choice-copy">
            <strong>${escapeHtml(preset.name)}</strong>
            <small>${escapeHtml(preset.description)}</small>
          </span>
          <span class="theme-choice-check" aria-hidden="true">✓</span>
        </button>
      `;
        })
        .join("");
    }

    return {
      normalizeThemeId,
      getActiveThemeId,
      migrateThemePreference,
      syncThemeColorMeta,
      renderThemePresetList,
    };
  }

  global.JournaModules = global.JournaModules || {};
  global.JournaModules.createSettingsPreferences = createSettingsPreferences;
})(window);
