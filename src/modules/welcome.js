(function attachWelcomeModule(global) {
  "use strict";

  function createWelcomeContent({ copy, getElements }) {
    const shareSources = global.JournaWelcomeSources || {
      default: {
        badge: "共享旅行账本",
        icon: "",
        eyebrow: "欢迎加入",
        title: copy.title,
        copy: copy.intro,
      },
    };

    const detectShareSource = shareSources.detectShareSource || (() => ({ key: "default", inviter: "" }));

    function applyShareSourceHero() {
      const elements = getElements();
      const src = detectShareSource();
      const source = shareSources[src.key] || shareSources.default;
      elements.welcomeHeroEyebrow.textContent = (src.inviter && (src.key === "message" || src.key === "email"))
        ? src.inviter + " 邀请你"
        : source.eyebrow;
      elements.welcomeTitle.textContent = source.title;
      elements.welcomeHeroCopy.textContent = source.copy;
      const badge = elements.welcomeSourceBadge;
      if (!badge) return;
      const badgeText = elements.welcomeSourceBadgeText;
      const badgeIcon = badge.querySelector("svg");
      badgeText.textContent = source.badge;
      if (badgeIcon) badgeIcon.innerHTML = source.icon;
      badge.hidden = false;
    }

    return { detectShareSource, applyShareSourceHero };
  }

  global.JournaModules = global.JournaModules || {};
  global.JournaModules.createWelcomeContent = createWelcomeContent;
})(window);
