(function attachMotionCore(global) {
  "use strict";

  const MOTION_DELAYS = Object.freeze({
    ledgerSettle: 1783,
    ledgerClearBase: 580,
    ledgerClearMax: 1159,
    ledgerClearStagger: 63,
    settlementStagger: 58,
    categoryEnter: 1560,
    categoryExit: 280,
    payerActivate: 760,
    categoryActivate: 760,
    choiceRelease: 550,
    splitSwitch: 260,
    mobilePanelOut: 80,
    mobilePanelIn: 360,
    mobilePanelIndicator: 420,
    barMorph: 500,
    addCelebrate: 1560,
    totalAbsorb: 1320,
    tokenFlight: 680,
    totalBloom: 460,
    catchPulse: 420,
    naturalEntryStageOpen: 560,
    naturalEntryStageClose: 504,
    naturalEntryStageMorph: 320,
    naturalEntryStageTextTravelStart: 80,
    naturalEntryStageTextHandoff: 414,
    naturalEntryStageOpenTextHandoff: 360,
    naturalEntryStageNoteOptionalHandoff: 180,
    naturalEntryStageNoteValueHandoff: 220,
    naturalEntryStageContentExit: 120,
    naturalEntryStageLensStart: 390,
    naturalEntryStageLensDuration: 160,
    naturalEntryStageFamilyStart: 0,
    naturalEntryStageFamilyDuration: 460,
    naturalEntryStageShellDissolveStart: 460,
    naturalEntryStageShellDissolveDuration: 90,
    naturalEntryStageCloseCleanup: 590,
    naturalEntryStageContentInStart: 360,
    naturalEntryStageContentInDuration: 180,
    naturalEntryStageSwap: 420,
    naturalEntryFamilyTint: 360,
    naturalEntryLensEntry: 260,
    naturalEntryLensStagger: 0,
    naturalEntryLensSettle: 260,
    toast: 2600,
    toastWithAction: 5200,
  });

  const MOTION_ROLE_PROFILES = Object.freeze({
    text: { base: 160, factor: 18, min: 180, max: 260 },
    control: { base: 200, factor: 20, min: 240, max: 360 },
    card: { base: 280, factor: 22, min: 360, max: 520 },
    structure: { base: 340, factor: 20, min: 440, max: 620 },
  });

  function resolveMotionDuration({ distancePx = 0, role = "control", direction = "enter" } = {}) {
    const profile = MOTION_ROLE_PROFILES[role] || MOTION_ROLE_PROFILES.control;
    const distance = Math.max(0, Number(distancePx) || 0);
    const raw = profile.base + profile.factor * Math.sqrt(distance);
    const directional = direction === "exit" ? raw * 0.85 : raw;
    return Math.round(Math.min(profile.max, Math.max(profile.min, directional)));
  }

  const SPRING_BAR_COLLAPSE = Object.freeze({ duration: 460, monotonic: true });
  const SPRING_BAR_EXPAND = Object.freeze({ duration: 500, monotonic: true });
  const SPRING_CATEGORY_ADD_OPEN = Object.freeze({ stiffness: 280, damping: 24, mass: 1 });
  const SPRING_CATEGORY_ADD_CLOSE = Object.freeze({ stiffness: 320, damping: 28, mass: 1 });
  const SPRING_LANDING_TAIL_MS = 64;

  function springSamples({ stiffness, damping, mass = 1, duration: monotonicDuration = 0 }, epsilon = 0.005) {
    if (monotonicDuration) {
      const duration = monotonicDuration;
      const count = Math.max(24, Math.min(96, Math.round(duration / 8)));
      const settleRate = 6 / duration;
      const rawResponseAt = (time) => 1 - Math.exp(-settleRate * time) * (1 + settleRate * time);
      const finalResponse = rawResponseAt(duration);
      const terminalVelocity = Math.exp(-settleRate * duration)
        * settleRate
        * settleRate
        * duration
        / finalResponse;
      const values = [];
      for (let i = 0; i <= count; i++) {
        const time = (duration * i) / count;
        const progress = time / duration;
        const baseResponse = rawResponseAt(time) / finalResponse;
        const terminalEase = terminalVelocity * progress ** 2 * (1 - progress);
        values.push(Math.min(1, Math.max(0, baseResponse + terminalEase)));
      }
      return { values, duration };
    }
    const w0 = Math.sqrt(stiffness / mass);
    const zeta = damping / (2 * Math.sqrt(stiffness * mass));
    const settle = Math.log(1 / epsilon) / (zeta * w0);
    const duration = Math.min(900, Math.max(250, settle * 1000));
    const landingTail = Math.min(SPRING_LANDING_TAIL_MS, duration * 0.18);
    const landingStart = duration - landingTail;
    const count = Math.max(24, Math.min(96, Math.round(duration / 8)));
    const values = [];

    const springStateAt = (time) => {
      if (zeta < 1) {
        const wd = w0 * Math.sqrt(1 - zeta * zeta);
        const envelope = Math.exp(-zeta * w0 * time);
        const angle = wd * time;
        const position = 1 - envelope * (Math.cos(angle) + ((zeta * w0) / wd) * Math.sin(angle));
        const velocity = envelope * (w0 * w0 / wd) * Math.sin(angle);
        return { position, velocity };
      }

      const envelope = Math.exp(-w0 * time);
      return { position: 1 - envelope, velocity: w0 * envelope };
    };

    const landingStateAt = (time, startState) => {
      const tailSeconds = landingTail / 1000;
      const u = Math.min(1, Math.max(0, (time - landingStart) / landingTail));
      if (u >= 1) return 1;
      const u2 = u * u;
      const u3 = u2 * u;
      const h00 = 2 * u3 - 3 * u2 + 1;
      const h10 = u3 - 2 * u2 + u;
      const h01 = -2 * u3 + 3 * u2;
      return h00 * startState.position + h10 * tailSeconds * startState.velocity + h01;
    };

    const landingStartState = springStateAt(landingStart / 1000);
    for (let i = 0; i <= count; i++) {
      const time = (duration * i) / count;
      values.push(time < landingStart
        ? springStateAt(time / 1000).position
        : landingStateAt(time, landingStartState));
    }
    return { values, duration };
  }

  function cubicHermite(value0, value1, velocity0, velocity1, span, localOffset) {
    const u = Math.min(1, Math.max(0, localOffset));
    const u2 = u * u;
    const u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1;
    const h10 = u3 - 2 * u2 + u;
    const h01 = -2 * u3 + 3 * u2;
    const h11 = u3 - u2;
    return h00 * value0 + h10 * velocity0 * span + h01 * value1 + h11 * velocity1 * span;
  }

  function sampleHermitePath(anchors, count) {
    const values = [];
    for (let index = 0; index <= count; index++) {
      const offset = index / count;
      let segment = anchors.length - 2;
      for (let anchorIndex = 0; anchorIndex < anchors.length - 1; anchorIndex++) {
        if (offset <= anchors[anchorIndex + 1].offset) {
          segment = anchorIndex;
          break;
        }
      }
      const start = anchors[segment];
      const end = anchors[segment + 1];
      const span = end.offset - start.offset;
      values.push(cubicHermite(
        start.value,
        end.value,
        start.velocity,
        end.velocity,
        span,
        (offset - start.offset) / span,
      ));
    }
    return values;
  }

  function barMotionSamples({ duration }) {
    const count = Math.max(32, Math.min(96, Math.round(duration / 8)));
    const progress = sampleHermitePath([
      { offset: 0, value: 0, velocity: 0 },
      { offset: 0.28, value: 0.50, velocity: 1.35 },
      { offset: 0.68, value: 0.97, velocity: 0.34 },
      { offset: 0.80, value: 1.01, velocity: 0 },
      { offset: 1, value: 1, velocity: 0 },
    ], count);
    const lift = sampleHermitePath([
      { offset: 0, value: 0, velocity: 0 },
      { offset: 0.55, value: -3, velocity: 0 },
      { offset: 1, value: 0, velocity: 0 },
    ], count);
    return { values: progress, lifts: lift, duration };
  }

  function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
  }

  global.JournaCore = global.JournaCore || {};
  global.JournaCore.motion = Object.freeze({
    MOTION_DELAYS,
    MOTION_ROLE_PROFILES,
    resolveMotionDuration,
    SPRING_BAR_COLLAPSE,
    SPRING_BAR_EXPAND,
    SPRING_CATEGORY_ADD_OPEN,
    SPRING_CATEGORY_ADD_CLOSE,
    springSamples,
    barMotionSamples,
    easeOutCubic,
  });
})(window);
