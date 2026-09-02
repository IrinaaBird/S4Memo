/* animals-module.js
 - Keresztbe kompatibilis megoldás a meglévő UI-hoz:
   - Megkeresi a .parents-select-container elemet és beszúr egy "Állatok" szekciót.
   - Lekéri a már létező simeket (globális SIMS tömb vagy .sim-select-card elemek).
   - Kiválasztás után meghív egy felületi callback-et (ha van), illetve DOM-at állít be.
*/

(function AnimalsModule(){
  const MODULE_ID = 'animals-module';
  let injected = false;
  let currentEditingSimId = null; // ha van egy szerkesztett sim-id a appban, ezt oda lehet kötni

  function collectSims(){
    // 1) Ha van globális adatszerkezet (pl. window.SIMS vagy window.appData.sims)
    if (window.SIMS && Array.isArray(window.SIMS)) {
      return window.SIMS.map(s => ({ id: s.id?.toString() ?? s.uuid ?? s.name, name: s.name ?? s.displayName ?? 'Ismeretlen', avatar: s.avatar ?? s.image ?? '' }));
    }
    if (window.appData && Array.isArray(window.appData.sims)) {
      return window.appData.sims.map(s => ({ id: s.id?.toString(), name: s.name, avatar: s.avatar || '' }));
    }

    // 2) Ha nincs, gyűjtsük össze a DOM-ból (sim-select-card)
    const list = [];
    document.querySelectorAll('.sim-select-card').forEach(card => {
      const id = card.dataset.simId || card.getAttribute('data-sim-id') || card.id || null;
      const name = (card.querySelector('.sim-select-name')?.textContent || card.dataset.name || '').trim() || 'Ismeretlen';
      let avatar = '';
      const av = card.querySelector('.sim-select-avatar');
      if (av) {
        const bg = av.style.backgroundImage;
        if (bg && bg !== 'none') avatar = bg.replace(/url\((['"]?)(.*)\1\)/, '$2');
      }
      list.push({ id: id ? id.toString() : name, name, avatar, element: card });
    });
    return list;
  }

  function createAnimalsSection(container){
    if (!container || injected) return;
    injected = true;

    const section = document.createElement('div');
    section.className = 'parents-section-box animals-section';
    section.id = MODULE_ID;

    const header = document.createElement('div');
    header.className = 'parents-section-title';
    header.innerHTML = '<span>Állatok</span><small style="font-weight:600;color:var(--subtext-color);font-size:11px;">Válassz egy simet állatként</small>';
    section.appendChild(header);

    const search = document.createElement('input');
    search.type = 'search';
    search.placeholder = 'Keresés név vagy ID...';
    search.className = 'parent-search-input';
    section.appendChild(search);

    const grid = document.createElement('div');
    grid.className = 'parents-cards-grid animals-cards-grid';
    section.appendChild(grid);

    const hint = document.createElement('div');
    hint.style.fontSize = '11px';
    hint.style.color = 'var(--subtext-color)';
    hint.style.marginTop = '6px';
    hint.textContent = 'A kiválasztott állat a szerkesztett Sim-hez lesz rendelve.';
    section.appendChild(hint);

    container.appendChild(section);

    // render
    function render(filter = ''){
      const sims = collectSims();
      grid.innerHTML = '';

      // 'Nincs' opció
      const noneCard = document.createElement('div');
      noneCard.className = 'sim-select-card none-card';
      noneCard.style.width = '100px';
      noneCard.style.height = '80px';
      noneCard.style.display = 'flex';
      noneCard.style.alignItems = 'center';
      noneCard.style.justifyContent = 'center';
      noneCard.innerHTML = '<div style="font-weight:800;color:var(--subtext-color);">Nincs</div>';
      noneCard.addEventListener('click', () => selectAnimal(null, noneCard));
      grid.appendChild(noneCard);

      sims.filter(s => {
        if (!filter) return true;
        const q = filter.toLowerCase();
        return (s.name && s.name.toLowerCase().includes(q)) || (s.id && s.id.toLowerCase().includes(q));
      }).forEach(s => {
        const card = document.createElement('div');
        card.className = 'sim-select-card';
        card.dataset.simId = s.id;
        card.style.width = '100px';
        card.style.padding = '8px';
        card.style.display = 'flex';
        card.style.flexDirection = 'column';
        card.style.alignItems = 'center';
        card.style.gap = '6px';
        // avatar
        const av = document.createElement('div');
        av.className = 'sim-select-avatar';
        av.style.width = '42px';
        av.style.height = '42px';
        av.style.borderRadius = '50%';
        av.style.backgroundSize = 'cover';
        av.style.backgroundPosition = 'center';
        if (s.avatar) av.style.backgroundImage = `url('${s.avatar}')`;
        else av.textContent = (s.name || 'A').slice(0,1).toUpperCase();
        card.appendChild(av);
        // name
        const nm = document.createElement('div');
        nm.className = 'sim-select-name';
        nm.style.fontSize = '10px';
        nm.style.fontWeight = '800';
        nm.textContent = s.name || s.id || 'Ismeretlen';
        card.appendChild(nm);

        card.addEventListener('click', () => selectAnimal(s.id, card));
        grid.appendChild(card);
      });
    }

    let selectedCard = null;
    function clearSelectionUI(){
      grid.querySelectorAll('.sim-select-card').forEach(c => c.classList.remove('selected'));
      selectedCard = null;
    }

    function selectAnimal(simId, cardEl){
      clearSelectionUI();
      if (cardEl) {
        cardEl.classList.add('selected');
        selectedCard = cardEl;
      }
      // Apply the animal: try to call app-specific setter first
      applyAnimalToCurrentSim(simId);
    }

    // search handler
    search.addEventListener('input', (e) => render(e.target.value));

    // initial render
    render();

    // expose for debugging
    section.renderAnimals = render;
    section.selectAnimal = selectAnimal;
  }

  function applyAnimalToCurrentSim(animalSimId){
    // 1) If the host app exposes a function, use it:
    if (typeof window.assignAnimalToSim === 'function' && currentEditingSimId) {
      try {
        window.assignAnimalToSim(currentEditingSimId, animalSimId);
        console.info('[AnimalsModule] assigned animal', animalSimId, 'to', currentEditingSimId);
        return;
      } catch(err){ console.warn('[AnimalsModule] assignAnimalToSim error', err); }
    }

    // 2) If the app stores current editing sim in window.currentEditSimId or similar, try to set attribute on that sim's card (best-effort)
    const targetEl = (currentEditingSimId && document.querySelector(`.sim-select-card[data-sim-id="${currentEditingSimId}"]`)) || document.querySelector('.sim-editing-card');
    if (targetEl) {
      if (animalSimId === null) targetEl.removeAttribute('data-animal-id');
      else targetEl.setAttribute('data-animal-id', animalSimId);
      console.info('[AnimalsModule] set data-animal-id on element', targetEl, animalSimId);
      // if needed, trigger a custom event so host app can react:
      const ev = new CustomEvent('animals:assigned', { detail: { editingSimId: currentEditingSimId, animalId: animalSimId }});
      window.dispatchEvent(ev);
      return;
    }

    // 3) fallback: store temporary mapping in window (debug)
    window.__animals_assigned = window.__animals_assigned || {};
    window.__animals_assigned[currentEditingSimId || 'unknown'] = animalSimId;
    console.info('[AnimalsModule] fallback store', window.__animals_assigned);
  }

  // Observe for parents-select container insertion and inject our UI
  function watchAndInject(){
    const tryInject = () => {
      const parentContainer = document.querySelector('.parents-select-container') || document.querySelector('.parents-section-container') || document.querySelector('.sim-edit-parents');
      if (parentContainer && !document.getElementById(MODULE_ID)) {
        createAnimalsSection(parentContainer);
      }
    };

    // first try immediately
    tryInject();

    // then observe DOM (in case the modal is created later)
    const mo = new MutationObserver((mutations) => {
      tryInject();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // also listen to custom events from host app to set current editing sim id
    window.addEventListener('animals:setEditingSim', (e) => {
      currentEditingSimId = e?.detail?.simId || null;
    });

    // utility: if the host app exposes an event when opening sim edit modal, hook to set currentEditingSimId
    window.addEventListener('sim:edit:open', (e) => {
      currentEditingSimId = e?.detail?.simId || null;
    });
  }

  // init on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', watchAndInject);
  } else {
    watchAndInject();
  }

  // expose minimal API
  window.AnimalsModule = {
    collectSims,
    applyAnimalToCurrentSim,
    setEditingSimId(id){ currentEditingSimId = id; },
    injected: () => injected
  };
})();
