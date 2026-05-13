// ── RIGHT CLICK: COPY IF SELECTION / PASTE IF NO SELECTION ────────────

const termContainer = document.getElementById('term-container');

termContainer.addEventListener('mousedown', async (e) => {

  // right click only
  if (e.button !== 2) return;

  e.preventDefault();

  requestAnimationFrame(async () => {

    const selection = window.term?.getSelection();

    // COPY
    if (selection && selection.trim()) {

      try {
        await navigator.clipboard.writeText(selection);

        // optional clear selection
        window.term.clearSelection();

      } catch (err) {
        console.error(err);
      }

      return;
    }

    // PASTE
    try {

      const text = await navigator.clipboard.readText();

      if (text) {
        window.electronAPI?.sendInput(text);
      }

    } catch (err) {
      console.error(err);
    }

    window.term?.focus();

  });

});

// disable native menu
termContainer.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});