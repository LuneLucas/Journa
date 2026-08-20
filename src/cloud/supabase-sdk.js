(function attachSupabaseSdkLoader(global) {
  "use strict";

  let loadPromise = null;

  function loadSupabaseSdk(sdkUrl) {
    if (typeof global.supabase !== "undefined") {
      return Promise.resolve(global.supabase);
    }
    if (loadPromise) return loadPromise;

    loadPromise = new Promise((resolve, reject) => {
      const script = global.document.createElement("script");
      script.src = sdkUrl;
      script.async = true;
      script.onload = () => {
        if (typeof global.supabase === "undefined") {
          reject(new Error("Supabase SDK 未暴露全局对象"));
          return;
        }
        resolve(global.supabase);
      };
      script.onerror = () => reject(new Error("Supabase SDK 加载失败"));
      global.document.head.appendChild(script);
    }).catch((error) => {
      loadPromise = null;
      throw error;
    });

    return loadPromise;
  }

  global.JournaCloud = global.JournaCloud || {};
  global.JournaCloud.loadSupabaseSdk = loadSupabaseSdk;
})(window);
