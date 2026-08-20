/* Shared invitation-source copy used by the production welcome view and the
   standalone share-welcome prototype. */
(function exposeWelcomeSources(global) {
  const validKeys = ["qr", "email", "social", "message"];

  function detectShareSource({ search = global.location?.search || "", hash = global.location?.hash || "", referrer = global.document?.referrer || "" } = {}) {
    const params = new URLSearchParams(search);
    let from = params.get("from");
    if (!from) {
      const hashMatch = String(hash || "").match(/[?&]from=([^&]+)/);
      if (hashMatch) from = hashMatch[1];
    }
    if (from && validKeys.includes(from)) {
      return { key: from, inviter: params.get("inviter") || "" };
    }
    if (referrer) {
      if (/mail|email|outlook|gmail/i.test(referrer)) return { key: "email", inviter: "" };
      if (/weibo|twitter|facebook|instagram|t\.me|line\.me|reddit|douban/i.test(referrer)) return { key: "social", inviter: "" };
      if (/im\.qq|wx\.qq|message|wetransfer|dingtalk|feishu/i.test(referrer)) return { key: "message", inviter: "" };
    }
    return { key: "default", inviter: "" };
  }

  const sources = {
    default: {
      badge: "共享旅行账本",
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4l3 2"/>',
      eyebrow: "欢迎加入",
      title: "三个家庭，一本账",
      copy: "这是你们三家的共享旅行账本。打开就能看到每个人记下的账，也能随手记一笔。",
    },
    qr: {
      badge: "扫码加入",
      icon: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h3v3H8zM13 8h3v3h-3zM8 13h3v3H8zM14 14h2M16 16h.01"/>',
      eyebrow: "扫码加入",
      title: "账本，就在你手边",
      copy: "扫一下就能加入。这是家人共享的旅行账本，谁花了多少，打开就能看见。",
    },
    email: {
      badge: "邮件邀请",
      icon: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M4 7l8 6 8-6"/>',
      eyebrow: "来自一封邀请邮件",
      title: "家人邀请你一起记",
      copy: "点开链接就能加入。之后你记下的每一笔，都会实时同步给其他两家。",
    },
    social: {
      badge: "社交分享",
      icon: '<path d="M4 12a8 8 0 0 1 8-8 8 8 0 0 1 0 16c-1.4 0-2.5-.4-3.6-1l-3 1 1-3c-.6-1-2.1-1-3.4-1z"/>',
      eyebrow: "来自社交分享",
      title: "朋友分享了一个共享账本",
      copy: "三家同行，账单一目了然。选好家庭，旅程花销就能一起记清楚。",
    },
    message: {
      badge: "私信邀请",
      icon: '<path d="M21 11.5a8.4 8.4 0 0 1-12 7.5L3 21l2-6a8.4 8.4 0 1 1 16-3.5z"/>',
      eyebrow: "家人邀请你",
      title: "一起算清这趟旅行",
      copy: "选好你的家庭，之后每笔账都会带上你的家庭署名。",
    },
  };
  sources.detectShareSource = detectShareSource;
  global.JournaWelcomeSources = Object.freeze(sources);
})(window);
