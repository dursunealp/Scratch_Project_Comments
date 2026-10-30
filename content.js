
(() => {
  "use strict";

  const BUTTON_CLASS = "scp-run-button";
  const PLAYER_CLASS = "scp-player";

  const PROJECT_URL =
    /^https?:\/\/scratch\.mit\.edu\/projects\/(\d+)(?:\/|$)/i;

  function getProjectId(comment) {
    const links = comment.querySelectorAll("a[href]");

    for (const link of links) {
      try {
        const url = new URL(link.href);

        if (url.hostname !== "scratch.mit.edu") continue;

        const match = url.pathname.match(
          /^\/projects\/(\d+)(?:\/|$)/i
        );

        if (match) return match[1];
      } catch {
        // Geçersiz bağlantıyı atla.
      }
    }

    return null;
  }

  function createPlayer(comment, projectId) {
    if (comment.querySelector(`.${BUTTON_CLASS}`)) return;

    const button = document.createElement("button");
    button.className = BUTTON_CLASS;
    button.type = "button";
    button.textContent = "▶ Projeyi Çalıştır";

    const player = document.createElement("div");
    player.className = PLAYER_CLASS;

    button.addEventListener("click", () => {
      if (player.querySelector("iframe")) return;

      button.textContent = "Proje yükleniyor...";

      const iframe = document.createElement("iframe");

      iframe.src =
        `https://scratch.mit.edu/projects/${projectId}/embed`;

      iframe.title = "Scratch proje oynatıcısı";
      iframe.loading = "lazy";
      iframe.allow = "autoplay; fullscreen";
      iframe.allowFullscreen = true;

      iframe.addEventListener("load", () => {
        button.textContent = "✓ Proje açıldı";
      });

      player.appendChild(iframe);
    });

    comment.appendChild(button);
    comment.appendChild(player);
  }

  function scan() {
    // Yalnızca bağlantı içeren metin düğümlerini bul.
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT
    );

    const textNodes = [];

    while (walker.nextNode()) {
      const node = walker.currentNode;

      if (node.parentElement.closest(
        "script, style, textarea, input, button, iframe, " +
        `.${BUTTON_CLASS}, .${PLAYER_CLASS}`
      )) continue;

      if (/scratch\.mit\.edu\/projects\/\d+/i.test(node.textContent)) {
        textNodes.push(node);
      }
    }

    for (const node of textNodes) {
      const parent = node.parentElement;

      if (!parent) continue;

      const projectMatch = node.textContent.match(
        /https?:\/\/scratch\.mit\.edu\/projects\/(\d+)/i
      );

      if (!projectMatch) continue;

      const projectId = projectMatch[1];

      // Bağlantının bulunduğu en yakın olası yorum alanı.
      let comment = parent;

      for (let i = 0; i < 6; i++) {
        if (!comment.parentElement) break;

        const links = comment.querySelectorAll("a[href]");

        const hasProjectLink = [...links].some(link => {
          try {
            return new URL(link.href).pathname.startsWith(
              `/projects/${projectId}`
            );
          } catch {
            return false;
          }
        });

        if (hasProjectLink) break;

        comment = comment.parentElement;
      }

      // Yalnızca gerçek bağlantısı olan bir alanı kabul et.
      const verifiedId = getProjectId(comment);

      if (verifiedId) {
        createPlayer(comment, verifiedId);
      }
    }
  }

  let scheduled = false;

  function scheduleScan() {
    if (scheduled) return;

    scheduled = true;

    requestAnimationFrame(() => {
      scheduled = false;
      scan();
    });
  }

  scan();

  const observer = new MutationObserver(scheduleScan);

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
})();
