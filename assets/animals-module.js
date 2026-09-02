(function () {
  function createSimCardFromData(sim) {
    const card = document.createElement('div');
    card.className = 'sim-select-card';
    if (sim.id) card.dataset.simId = sim.id;
    const avatar = document.createElement('div');
    avatar.className = 'sim-select-avatar';
    if (sim.avatar) avatar.style.backgroundImage = `url(${sim.avatar})`;
    avatar.textContent = sim.initials || (sim.name ? sim.name.charAt(0).toUpperCase() : '');
    const name = document.createElement('div');
    name.className = 'sim-select-name';
    name.textContent = sim.name || 'Sim';
    const age = document.createElement('div');
    age.className = 'sim-select-age';
    age.textContent = sim.age || '';
    card.appendChild(avatar);
    card.appendChild(name);
    card.appendChild(age);
    return card;
  }

  function updateAnimalsInput(section) {
    const sel = Array.from(section.querySelectorAll('.sim-select-card.selected'))
      .map(c => c.dataset.simId || c.querySelector('.sim-select-name')?.textContent?.trim() || '')
      .filter(Boolean);
    const input = section.querySelector('.animals-input');
    if (input) input.value = sel.join(',');
  }

  function initAnimalsModule() {
    document.querySelectorAll('.parents-select-container').forEach(container => {
      if (container.querySelector('.animals-section-box')) return;

      const wrapper = document.createElement('div');
      wrapper.className = 'parents-section-box animals-section-box';
      wrapper.innerHTML = `
        <div class="parents-section-title" style="margin-bottom:8px;">
          <span>Állatok</span>
        </div>
        <input class="parent-search-input animals-search" placeholder="Keresés..." />
        <div class="parents-cards-grid animals-cards-grid" style="margin-top:8px;"></div>
        <input type="hidden" name="animals" class="animals-input" value="" />
      `;
      container.appendChild(wrapper);

      const grid = wrapper.querySelector('.animals-cards-grid');

      const sourceCards = container.querySelectorAll('.sim-select-card');
      if (sourceCards.length) {
        sourceCards.forEach(card => {
          const clone = card.cloneNode(true);
          clone.classList.remove('selected', 'none-card');
          grid.appendChild(clone);
        });
      } else {
        const simsData = window.sims || window.allSims || [];
        if (Array.isArray(simsData) && simsData.length) {
          simsData.forEach(sim => grid.appendChild(createSimCardFromData(sim)));
        } else {
          const note = document.createElement('div');
          note.style.color = 'var(--subtext-color)';
          note.style.fontSize = '12px';
          note.textContent = 'Nincsenek elérhető simek a kiválasztáshoz.';
          grid.appendChild(note);
        }
      }

      grid.addEventListener('click', (e) => {
        const card = e.target.closest('.sim-select-card');
        if (!card) return;
        card.classList.toggle('selected');
        updateAnimalsInput(wrapper);
      });

      const search = wrapper.querySelector('.animals-search');
      if (search) {
        search.addEventListener('input', () => {
          const q = search.value.trim().toLowerCase();
          wrapper.querySelectorAll('.sim-select-card').forEach(c => {
            const name = (c.querySelector('.sim-select-name')?.textContent || '').toLowerCase();
            c.style.display = name.includes(q) ? '' : 'none';
          });
        });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initAnimalsModule();
      const obs = new MutationObserver(() => {
        if (document.querySelector('.parents-select-container')) {
          initAnimalsModule();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    });
  } else {
    initAnimalsModule();
    const obs = new MutationObserver(() => {
      if (document.querySelector('.parents-select-container')) {
        initAnimalsModule();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  window.getSelectedAnimals = function (modalRoot) {
    const root = modalRoot || document;
    const input = root.querySelector('.animals-input');
    return input ? input.value.split(',').filter(Boolean) : [];
  };
})();
