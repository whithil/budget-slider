document.addEventListener('DOMContentLoaded', () => {
    // 1. Touch Capability Detection
    const updateTouchDeviceClass = () => {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
        document.body.classList.toggle('is-touch-device', isTouch);
        document.body.classList.toggle('is-no-touch', !isTouch);
    };
    updateTouchDeviceClass();

    // DOM Elements
    const chartContainer = document.getElementById('chart');
    const mainContent = document.getElementById('mainContent');
    const emptyState = document.getElementById('emptyState');
    const slicesTableBody = document.getElementById('slicesTableBody');
    // addSliceButton (removed - moved to header and empty state)
    const addSliceTableButton = document.getElementById('addSliceTableButton');
    const totalBudgetInput = document.getElementById('totalBudgetInput');
    const unallocatedPercentageDiv = document.getElementById('unallocatedPercentage');

    // V4 Time Nav Elements
    const topTimeNav = document.getElementById('topTimeNav');
    const timeSegments = document.querySelectorAll('.time-segment');
    const zoomOutBtn = document.getElementById('zoomOutBtn');
    const pagePrevBtn = document.getElementById('pagePrevBtn');
    const pageNextBtn = document.getElementById('pageNextBtn');
    const calendarView = document.getElementById('calendarView');
    const zoomInBtn = document.getElementById('zoomInBtn');

    // Application State
    let slices = [];
    let defaultTotalBudget = 1000;
    let periodBudgets = {}; // V4 Phase 5: map of "YYYY-MM" to budget values
    let nextSliceId = 0;
    let allSavedStates = [];

    // V4 Temporal State
    let globalViewMode = 'month'; // 'week', 'month', 'year'
    let currentDate = new Date();

    function getCurrentPeriodKey() {
        if (globalViewMode === 'week') {
            const start = new Date(currentDate);
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            return `week-${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`;
        } else if (globalViewMode === 'month') {
            return `month-${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
        } else if (globalViewMode === 'year') {
            return `year-${currentDate.getFullYear()}`;
        }
        return 'default';
    }

    function getCurrentPeriodBudget() {
        const key = getCurrentPeriodKey();
        return periodBudgets[key] !== undefined ? periodBudgets[key] : defaultTotalBudget;
    }

    function setCurrentPeriodBudget(amount) {
        const key = getCurrentPeriodKey();
        periodBudgets[key] = amount;
    }

    // Periodicity State
    let currentPeriodicityItem = null; // { sliceId, itemIndex }
    const PERIOD_OPTIONS = [
        { value: 'days', label: 'Dias' },
        { value: 'weeks', label: 'Semanas' },
        { value: 'fortnights', label: 'Quinzenas' },
        { value: 'months', label: 'Meses' },
        { value: 'bimonthly', label: 'Bimestres' },
        { value: 'quarters', label: 'Trimestres' },
        { value: 'semesters', label: 'Semestres' },
        { value: 'years', label: 'Anos' }
    ];

    const CURRENT_STATE_LS_KEY_SLICES = 'budgetSlices_v3_sunburst';
    const CURRENT_STATE_LS_KEY_BUDGET = 'totalBudget_v3_sunburst';
    const ALL_STATES_LS_KEY = 'budgetManager_allStates_v3_sunburst';

    const samplesModal = document.getElementById('samplesModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const openSamplesBtn = document.getElementById('openSamplesBtn');
    const addFirstCategoryBtn = document.getElementById('addFirstCategoryBtn');
    const samplesGrid = document.getElementById('samplesGrid');

    // Periodicity Modal Elements
    const periodicityModal = document.getElementById('periodicityModal');
    const closePeriodicityBtn = document.getElementById('closePeriodicityBtn');
    const savePeriodicityBtn = document.getElementById('savePeriodicityBtn');
    const countPickerColumn = document.getElementById('countPickerColumn');
    const periodPickerColumn = document.getElementById('periodPickerColumn');

    const fabContainer = document.getElementById('fabContainer');
    const fabMain = document.getElementById('fabMain');
    const fabLoad = document.getElementById('fabLoad');
    const fabSave = document.getElementById('fabSave');
    const fabShareCurrent = document.getElementById('fabShareCurrent');
    const fabClearCurrent = document.getElementById('fabClearCurrent');
    const installFabContainer = document.getElementById('installFabContainer');
    const fabInstall = document.getElementById('fabInstall');

    const sidebar = document.getElementById('sidebar');
    const sidebarLoadSection = document.getElementById('sidebarLoadSection');
    const sidebarSaveSection = document.getElementById('sidebarSaveSection');
    const newStateNameInput = document.getElementById('newStateNameInput');
    const saveNewStateButton = document.getElementById('saveNewStateButton');
    const savedStatesListUI = document.getElementById('savedStatesList');


    const BUDGET_SAMPLES = [
        {
            name: "Jovem Mesada (R$ 300)",
            description: "Foco em lazer social e vida digital básica.",
            total: 300,
            data: [
                { name: "Social e Lanches", color: "#ff9f43", children: [{ name: "Rolês e Cinema", value: 150 }, { name: "Lanches na Rua", value: 80 }] },
                { name: "Digital e Celular", color: "#54a0ff", children: [{ name: "Assinaturas e Apps", value: 40 }, { name: "Créditos Celular", value: 30 }] }
            ]
        },
        {
            name: "Jovem Mesada (R$ 500)",
            description: "Para quem investe em estilo e entretenimento gamer.",
            total: 500,
            data: [
                { name: "Estilo e Lazer", color: "#ee5253", children: [{ name: "Compras e Roupas", value: 150 }, { name: "Rolês do Mês", value: 200 }] },
                { name: "Setup e Estudos", color: "#0abde3", children: [{ name: "Games e Cursos", value: 100 }, { name: "Internet e Serviços", value: 50 }] }
            ]
        },
        {
            name: "Jovem Mesada (R$ 900)",
            description: "Maior autonomia com transporte e reserva.",
            total: 900,
            data: [
                { name: "Liberdade e Transporte", color: "#10ac84", children: [{ name: "Uber e Passagens", value: 250 }, { name: "Rolês e Jantares", value: 350 }] },
                { name: "Compras e Reserva", color: "#feca57", children: [{ name: "Compras Pessoais", value: 200 }, { name: "Minha Reserva", value: 100 }] }
            ]
        },
        {
            name: "Adulto Mesada (R$ 500)",
            description: "Custos compartilhados e fundo de imprevistos.",
            total: 500,
            data: [
                { name: "Custos Compartilhados", color: "#5f27cd", children: [{ name: "Contribuição Doméstica", value: 300 }, { name: "Higiene e Saúde", value: 120 }] },
                { name: "Imprevistos", color: "#ff9f43", children: [{ name: "Fundo Reserva", value: 80 }] }
            ]
        },
        {
            name: "Adulto Mesada (R$ 1000)",
            description: "Divisão equilibrada entre consumo e manutenção.",
            total: 1000,
            data: [
                { name: "Despesas Fixas", color: "#222f3e", children: [{ name: "Contas de Consumo", value: 450 }, { name: "Complemento Mercado", value: 350 }] },
                { name: "Manutenção", color: "#00d2d3", children: [{ name: "Saúde e Farmácia", value: 100 }, { name: "Reserva Emergência", value: 100 }] }
            ]
        },
        {
            name: "Salário Mínimo (R$ 1500)",
            description: "Gestão austera focada no essencial e habitação.",
            total: 1500,
            data: [
                { name: "Habitação e Energia", color: "#ff6b6b", children: [{ name: "Aluguel Compartilhado", value: 850 }, { name: "Contas Básicas", value: 200 }] },
                { name: "Essenciais", color: "#48dbfb", children: [{ name: "Mercado", value: 350 }, { name: "Transporte Público", value: 100 }] }
            ]
        },
        {
            name: "Salário Júnior (R$ 2000)",
            description: "Primeiros passos com aluguel individual.",
            total: 2000,
            data: [
                { name: "Moradia e Utilidades", color: "#1dd1a1", children: [{ name: "Aluguel", value: 900 }, { name: "Energia, Água, Internet", value: 230 }] },
                { name: "Custos Diários", color: "#ff9ff3", children: [{ name: "Mercado", value: 550 }, { name: "Transporte e Saúde", value: 220 }] },
                { name: "Financeiro", color: "#feca57", children: [{ name: "Poupança", value: 100 }] }
            ]
        },
        {
            name: "Salário R$ 2500",
            description: "Equilíbrio entre custo fixo e aporte mensal.",
            total: 2500,
            data: [
                { name: "Custos Fixos", color: "#54a0ff", children: [{ name: "Aluguel e Taxas", value: 1100 }, { name: "Contas Domésticas", value: 300 }] },
                { name: "Estilo Vida e Saúde", color: "#5f27cd", children: [{ name: "Mercado", value: 600 }, { name: "Lazer e Farmácia", value: 300 }] },
                { name: "Investimento", color: "#1dd1a1", children: [{ name: "Aporte Mensal", value: 200 }] }
            ]
        },
        {
            name: "Salário R$ 3000",
            description: "Maior foco em patrimônio e lazer planejado.",
            total: 3000,
            data: [
                { name: "Habitação", color: "#ff6b6b", children: [{ name: "Aluguel", value: 1300 }, { name: "Manutenção e Contas", value: 450 }] },
                { name: "Consumo e Bem-estar", color: "#48dbfb", children: [{ name: "Mercado", value: 650 }, { name: "Lazer e Saídas", value: 300 }] },
                { name: "Patrimônio", color: "#1dd1a1", children: [{ name: "Reserva Investimento", value: 300 }] }
            ]
        },
        {
            name: "Salário R$ 5000",
            description: "Gestão completa: segurança, mobilidade e lazer.",
            total: 5000,
            data: [
                { name: "Habitação e Mobilidade", color: "#341f97", children: [{ name: "Moradia e Condomínio", value: 1950 }, { name: "Transporte ou Veículo", value: 650 }] },
                { name: "Saúde e Alimentação", color: "#ee5253", children: [{ name: "Saúde e Farmácia", value: 450 }, { name: "Mercado", value: 950 }] },
                { name: "Segurança Financeira", color: "#10ac84", children: [{ name: "Lazer e Educação", value: 500 }, { name: "Investimentos", value: 500 }] }
            ]
        }
    ];

    // PWA Install Prompt
    let deferredPrompt;

    const installBanner = document.getElementById('installBanner');
    // Removed old installButton/dismissInstall as we use the FAB now

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (installFabContainer) installFabContainer.style.display = 'flex';
    });

    if (fabInstall) {
        fabInstall.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('User accepted the install prompt');
                        if (installFabContainer) installFabContainer.style.display = 'none';
                    }
                    deferredPrompt = null;
                });
            }
        });
    }

    function closeFabMenu() {
        if (fabContainer) fabContainer.classList.remove('expanded');
    }

    // Clear Budget Button Logic (Moved to FAB)
    if (fabClearCurrent) {
        fabClearCurrent.addEventListener('click', () => {
            if (confirm("Tem certeza que deseja limpar todo o orçamento atual? Isso não afetará seus orçamentos salvos.")) {
                clearBudget();
                closeFabMenu();
            }
        });
    }

    function clearBudget() {
        slices = [];
        totalBudget = 1000;
        totalBudgetInput.value = 1000;
        saveCurrentWorkingState();
        renderApp();
        // Close sidebar if on mobile
        if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    }

    // New FAB Listeners
    if (fabMain) {
        fabMain.addEventListener('click', () => {
            const isSidebarOpen = sidebar.classList.contains('open');
            if (isSidebarOpen) {
                // If sidebar is open, clicking FAB hamburger closes both sidebar and menu
                sidebar.classList.remove('open');
                document.body.classList.remove('sidebar-open');
                fabContainer.classList.remove('expanded');
            } else {
                // Normal toggle behavior if sidebar is closed
                fabContainer.classList.toggle('expanded');
            }
        });
    }

    if (fabLoad) fabLoad.addEventListener('click', () => {
        toggleSidebar('load');
        closeFabMenu();
    });

    if (fabSave) fabSave.addEventListener('click', () => {
        toggleSidebar('save');
        closeFabMenu();
    });

    if (fabShareCurrent) fabShareCurrent.addEventListener('click', () => {
        generateShareCurrentLink();
        closeFabMenu();
    });

    function generateShareCurrentLink() {
        const dataToShare = { slices: slices, totalBudget: totalBudget };
        try {
            const jsonString = JSON.stringify(dataToShare);
            const base64String = btoa(unescape(encodeURIComponent(jsonString)));
            const shareUrl = `${window.location.origin}${window.location.pathname}?state=${base64String}`;

            // Try to use Clipboard API
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert("Link de compartilhamento copiado para a área de transferência!");
                }).catch(err => {
                    console.error("Erro ao copiar:", err);
                    prompt("Copie este link para compartilhar:", shareUrl);
                });
            } else {
                prompt("Copie este link para compartilhar:", shareUrl);
            }
        } catch (e) {
            console.error("Erro ao gerar link:", e);
            alert("Não foi possível gerar o link.");
        }
    }




    /** Generates a random RGB color string. */
    function generateRandomRGB() {
        const r = Math.floor(Math.random() * 220);
        const g = Math.floor(Math.random() * 220);
        const b = Math.floor(Math.random() * 220);
        return `rgb(${r}, ${g}, ${b})`;
    }

    // --- State Management for CURRENT WORKING SET ---
    function saveCurrentWorkingState() {
        localStorage.setItem(CURRENT_STATE_LS_KEY_SLICES, JSON.stringify(slices));
        localStorage.setItem(CURRENT_STATE_LS_KEY_BUDGET, defaultTotalBudget.toString());
        localStorage.setItem('budgetManager_periodBudgets_v4', JSON.stringify(periodBudgets));
    }

    function loadSampleData() {
        nextSliceId = 0;
        slices = [
            {
                id: nextSliceId++,
                name: 'Essenciais',
                percentage: 50,
                color: '#e74c3c',
                children: [
                    { name: "Aluguel", value: 30 },
                    { name: "Mercado", value: 15 },
                    { name: "Luz/Água", value: 5 }
                ]
            },
            {
                id: nextSliceId++,
                name: 'Lazer',
                percentage: 30,
                color: '#3498db',
                children: [
                    { name: "Cinema", value: 10 },
                    { name: "Viagens", value: 20 }
                ]
            },
            {
                id: nextSliceId++,
                name: 'Investimentos',
                percentage: 20,
                color: '#2ecc71',
                children: [
                    { name: "Poupança", value: 10 },
                    { name: "Ações", value: 10 }
                ]
            }
        ];

        // Ensure total budget is valid
        if (defaultTotalBudget <= 0) {
            defaultTotalBudget = 1000;
        }
        periodBudgets = {};
        totalBudgetInput.value = getCurrentPeriodBudget();

        normalizePercentages();
        saveCurrentWorkingState();
        renderApp();
    }

    function loadCurrentWorkingState() {
        const savedTotalBudget = localStorage.getItem(CURRENT_STATE_LS_KEY_BUDGET);
        defaultTotalBudget = savedTotalBudget ? parseFloat(savedTotalBudget) : 1000;
        const savedPeriodBudgets = localStorage.getItem('budgetManager_periodBudgets_v4');
        try { periodBudgets = savedPeriodBudgets ? JSON.parse(savedPeriodBudgets) : {}; } catch (e) { periodBudgets = {}; }

        totalBudgetInput.value = getCurrentPeriodBudget();

        const savedSlices = localStorage.getItem(CURRENT_STATE_LS_KEY_SLICES);
        let tempNextId = 0;
        const seenIds = new Set();

        if (savedSlices) {
            try {
                let parsedSlices = JSON.parse(savedSlices);
                if (Array.isArray(parsedSlices)) {
                    slices = parsedSlices.map(s => {
                        let currentId = (s && typeof s.id === 'number') ? s.id : -1;
                        if (currentId === -1 || seenIds.has(currentId)) {
                            currentId = tempNextId;
                            while (seenIds.has(currentId)) { tempNextId++; currentId = tempNextId; }
                        }
                        seenIds.add(currentId);
                        if (currentId >= tempNextId) { tempNextId = currentId + 1; }

                        // Ensure children array exists
                        const children = Array.isArray(s.children) ? s.children : [];

                        return {
                            id: currentId,
                            name: (s && typeof s.name === 'string') ? s.name : `Categoria ${currentId}`,
                            percentage: (s && typeof s.percentage === 'number' && !isNaN(s.percentage)) ? s.percentage : 0,
                            color: (s && typeof s.color === 'string' && s.color.match(/^(rgb\(|#)/)) ? s.color : generateRandomRGB(),
                            children: children
                        };
                    });
                    nextSliceId = tempNextId;
                } else { slices = []; }
            } catch (e) {
                console.error("Erro ao carregar fatias de trabalho:", e);
                slices = [];
            }
        }

        if (!savedSlices || JSON.parse(savedSlices).length === 0) {
            slices = [];
            updateEmptyStateVisibility();
        } else {
            try {
                let parsedSlices = JSON.parse(savedSlices);
                // ... (rest of the mapping remains same but I will include it to avoid breaks) ...
                if (Array.isArray(parsedSlices)) {
                    slices = parsedSlices.map(s => {
                        let currentId = (s && typeof s.id === 'number') ? s.id : -1;
                        if (currentId === -1 || seenIds.has(currentId)) {
                            currentId = tempNextId;
                            while (seenIds.has(currentId)) { tempNextId++; currentId = tempNextId; }
                        }
                        seenIds.add(currentId);
                        if (currentId >= tempNextId) { tempNextId = currentId + 1; }
                        const children = Array.isArray(s.children) ? s.children : [];
                        return {
                            id: currentId,
                            name: (s && typeof s.name === 'string') ? s.name : `Categoria ${currentId}`,
                            percentage: (s && typeof s.percentage === 'number' && !isNaN(s.percentage)) ? s.percentage : 0,
                            color: (s && typeof s.color === 'string' && s.color.match(/^(rgb\(|#)/)) ? s.color : generateRandomRGB(),
                            children: children
                        };
                    });
                    nextSliceId = tempNextId;
                } else { slices = []; }
            } catch (e) {
                console.error("Erro ao carregar fatias de trabalho:", e);
                slices = [];
            }
            normalizePercentages();
            updateEmptyStateVisibility();
        }
    }

    // --- State Management for ALL SAVED STATES (in sidebar) ---
    function loadAllNamedStates() {
        const statesJSON = localStorage.getItem(ALL_STATES_LS_KEY);
        if (statesJSON) {
            try {
                allSavedStates = JSON.parse(statesJSON);
                if (!Array.isArray(allSavedStates)) allSavedStates = [];
            } catch (e) { console.error("Erro ao carregar lista de orçamentos salvos:", e); allSavedStates = []; }
        } else { allSavedStates = []; }
        renderSavedStatesList();
    }

    function saveAllNamedStates() {
        localStorage.setItem(ALL_STATES_LS_KEY, JSON.stringify(allSavedStates));
    }

    function renderSavedStatesList() {
        savedStatesListUI.innerHTML = '';
        if (allSavedStates.length === 0) {
            savedStatesListUI.innerHTML = '<li class="no-states">Nenhum orçamento salvo.</li>';
            return;
        }
        allSavedStates.forEach(state => {
            const li = document.createElement('li');
            li.dataset.stateId = state.id;
            const nameSpan = document.createElement('span');
            nameSpan.className = 'state-name';
            nameSpan.textContent = state.name;
            li.appendChild(nameSpan);
            const actionsDiv = document.createElement('div');
            actionsDiv.className = 'state-actions';

            const shareBtn = document.createElement('button');
            shareBtn.innerHTML = '🔗';
            shareBtn.title = "Compartilhar este orçamento";
            shareBtn.className = 'share-btn';
            shareBtn.onclick = (e) => { e.stopPropagation(); generateShareLink(state.id); };
            actionsDiv.appendChild(shareBtn);

            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Carregar'; loadBtn.className = 'load-btn';
            loadBtn.onclick = (e) => { e.stopPropagation(); loadSpecificNamedState(state.id); };
            actionsDiv.appendChild(loadBtn);
            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Renomear'; renameBtn.className = 'rename-btn';
            renameBtn.onclick = (e) => { e.stopPropagation(); renameNamedState(state.id); };
            actionsDiv.appendChild(renameBtn);
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir'; deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = (e) => { e.stopPropagation(); deleteNamedState(state.id); };
            actionsDiv.appendChild(deleteBtn);
            li.appendChild(actionsDiv);
            savedStatesListUI.appendChild(li);
        });
    }

    function handleSaveNewState() {
        const name = newStateNameInput.value.trim();
        if (!name) { alert("Por favor, insira um nome para o orçamento."); newStateNameInput.focus(); return; }
        if (allSavedStates.some(s => s.name === name)) {
            if (!confirm(`Já existe um orçamento chamado "${name}". Deseja sobrescrevê-lo?`)) return;
            allSavedStates = allSavedStates.filter(s => s.name !== name);
        }
        const newState = {
            id: Date.now(), name: name,
            slices: JSON.parse(JSON.stringify(slices)),
            defaultTotalBudget: defaultTotalBudget,
            periodBudgets: JSON.parse(JSON.stringify(periodBudgets))
        };
        allSavedStates.push(newState);
        saveAllNamedStates(); renderSavedStatesList();
        newStateNameInput.value = '';
        alert(`Orçamento "${name}" salvo!`);
    }

    function loadSpecificNamedState(stateId) {
        const stateToLoad = allSavedStates.find(s => s.id === stateId);
        if (stateToLoad) {
            slices = JSON.parse(JSON.stringify(stateToLoad.slices));
            defaultTotalBudget = stateToLoad.defaultTotalBudget || stateToLoad.totalBudget || 1000;
            periodBudgets = stateToLoad.periodBudgets ? JSON.parse(JSON.stringify(stateToLoad.periodBudgets)) : {};
            totalBudgetInput.value = getCurrentPeriodBudget();
            let tempNextId = 0;
            if (slices.length > 0) {
                const maxId = Math.max(...slices.map(s => typeof s.id === 'number' ? s.id : -1));
                tempNextId = maxId >= 0 ? maxId + 1 : 0;
            }
            nextSliceId = tempNextId;
            normalizePercentages(); renderApp();
            toggleSidebar();
            alert(`Orçamento "${stateToLoad.name}" carregado.`);
        } else { alert("Erro: Orçamento salvo não encontrado."); }
    }

    function renameNamedState(stateId) {
        const stateToRename = allSavedStates.find(s => s.id === stateId);
        if (stateToRename) {
            const newName = prompt(`Digite o novo nome para "${stateToRename.name}":`, stateToRename.name);
            if (newName && newName.trim() !== "") {
                if (allSavedStates.some(s => s.name === newName.trim() && s.id !== stateId)) {
                    alert(`Erro: Já existe um orçamento chamado "${newName.trim()}".`); return;
                }
                stateToRename.name = newName.trim();
                saveAllNamedStates(); renderSavedStatesList();
            }
        }
    }

    function deleteNamedState(stateId) {
        // Ensure stateId is compared correctly (it might come as string from dataset but Date.now() is number)
        const idToMatch = Number(stateId);
        const stateToDelete = allSavedStates.find(s => Number(s.id) === idToMatch);
        if (stateToDelete) {
            if (confirm(`Tem certeza que deseja excluir o orçamento "${stateToDelete.name}"?`)) {
                allSavedStates = allSavedStates.filter(s => Number(s.id) !== idToMatch);
                saveAllNamedStates(); renderSavedStatesList();
            }
        }
    }

    function generateShareLink(stateId) {
        const idToMatch = Number(stateId);
        const stateToShare = allSavedStates.find(s => Number(s.id) === idToMatch);
        if (!stateToShare) { alert("Erro: Orçamento não encontrado para compartilhar."); return; }
        const dataToShare = {
            slices: stateToShare.slices,
            defaultTotalBudget: stateToShare.defaultTotalBudget || stateToShare.totalBudget || 1000,
            periodBudgets: stateToShare.periodBudgets || {}
        };
        try {
            const jsonString = JSON.stringify(dataToShare);
            const base64String = btoa(unescape(encodeURIComponent(jsonString)));
            const shareUrl = `${window.location.origin}${window.location.pathname}?state=${base64String}`;

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(shareUrl).then(() => {
                    alert(`Link para "${stateToShare.name}" copiado para a área de transferência!`);
                }).catch(err => {
                    prompt(`Copie este link para compartilhar o orçamento "${stateToShare.name}":`, shareUrl);
                });
            } else {
                prompt(`Copie este link para compartilhar o orçamento "${stateToShare.name}":`, shareUrl);
            }
        } catch (e) { console.error("Erro ao gerar link:", e); alert("Não foi possível gerar o link."); }
    }

    function loadStateFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const stateDataParam = urlParams.get('state');
        if (stateDataParam) {
            try {
                // UTF-8 safe base64 decoding
                const jsonString = decodeURIComponent(escape(atob(stateDataParam)));
                const sharedState = JSON.parse(jsonString);
                if (sharedState && Array.isArray(sharedState.slices)) {
                    slices = JSON.parse(JSON.stringify(sharedState.slices));
                    defaultTotalBudget = sharedState.defaultTotalBudget || sharedState.totalBudget || 1000;
                    periodBudgets = sharedState.periodBudgets ? JSON.parse(JSON.stringify(sharedState.periodBudgets)) : {};
                    totalBudgetInput.value = getCurrentPeriodBudget();
                    let tempNextId = 0;
                    if (slices.length > 0) {
                        const seenIds = new Set();
                        slices.forEach(s => {
                            if (typeof s.id !== 'number' || seenIds.has(s.id)) s.id = tempNextId;
                            while (seenIds.has(s.id)) { tempNextId++; s.id = tempNextId; }
                            seenIds.add(s.id);
                            if (s.id >= tempNextId) tempNextId = s.id + 1;
                        });
                    }
                    nextSliceId = tempNextId;
                    normalizePercentages(); renderApp();
                    if (confirm(`Orçamento carregado da URL. Deseja salvá-lo localmente?`)) {
                        const nameForShared = prompt("Digite um nome:", "Orçamento Compartilhado");
                        if (nameForShared && nameForShared.trim() !== "") {
                            newStateNameInput.value = nameForShared.trim();
                            handleSaveNewState();
                        }
                    }
                } else { console.warn("Dados de estado da URL inválidos."); }
            } catch (e) { console.error("Erro ao carregar estado da URL:", e); alert("Link de compartilhamento inválido."); }
        }
    }

    function toggleSidebar(mode = 'load') {
        const isOpen = sidebar.classList.contains('open');

        // If sidebar is already open and in the same mode, close it
        if (isOpen && (
            (mode === 'load' && sidebarLoadSection.style.display !== 'none') ||
            (mode === 'save' && sidebarSaveSection.style.display !== 'none')
        )) {
            sidebar.classList.remove('open');
            document.body.classList.remove('sidebar-open');
            if (fabLoad) fabLoad.setAttribute('aria-expanded', 'false');
            return;
        }

        // Show/hide sections based on mode
        if (mode === 'load') {
            sidebarLoadSection.style.display = 'block';
            sidebarSaveSection.style.display = 'none';
        } else if (mode === 'save') {
            sidebarLoadSection.style.display = 'none';
            sidebarSaveSection.style.display = 'block';
        }

        if (!isOpen) {
            sidebar.classList.add('open');
            document.body.classList.add('sidebar-open');
        }

        if (mode === 'save') {
            setTimeout(() => newStateNameInput.focus(), 300); // Focus after transition
        }

        if (fabLoad) fabLoad.setAttribute('aria-expanded', 'true');
    }

    // --- Empty State & Samples Modal Logic ---
    function updateEmptyStateVisibility() {
        if (!emptyState || !mainContent) return;
        if (slices.length === 0) {
            emptyState.style.display = 'flex';
            mainContent.style.display = 'none';
            // Hide the entire item (button + label) when in empty state
            [fabShareCurrent, fabClearCurrent].forEach(btn => {
                const item = btn?.closest('.fab-item');
                if (item) {
                    item.style.visibility = 'hidden';
                    item.style.opacity = '0';
                    item.style.height = '0';
                    item.style.marginTop = '-12px';
                    item.style.pointerEvents = 'none';
                }
            });
        } else {
            emptyState.style.display = 'none';
            mainContent.style.display = 'block';
            [fabShareCurrent, fabClearCurrent].forEach(btn => {
                const item = btn?.closest('.fab-item');
                if (item) {
                    item.style.visibility = 'visible';
                    item.style.opacity = '1';
                    item.style.height = '48px';
                    item.style.marginTop = '0';
                    item.style.pointerEvents = 'auto';
                }
            });
        }
    }

    function renderSampleCards() {
        samplesGrid.innerHTML = '';
        BUDGET_SAMPLES.forEach((sample) => {
            const card = document.createElement('div');
            card.className = 'sample-card';
            // Strip redundancy like "(R$ 300)" from the title
            const cleanName = sample.name.replace(/\s*\(R\$\s*\d+\)\s*/i, '');
            card.innerHTML = `
                <div class="postit-pin"></div>
                <h3>${cleanName}</h3>
                <div class="sample-price">
                    <span>R$ ${sample.total.toFixed(0)}</span>
                </div>
            `;
            card.onclick = () => {
                applySampleBudget(sample);
                closeModal();
            };
            samplesGrid.appendChild(card);
        });
    }

    function applySampleBudget(sample) {
        totalBudget = sample.total;
        totalBudgetInput.value = totalBudget;

        // Convert sample data (absolute values) to percentages
        slices = sample.data.map((cat, catIdx) => {
            const catTotalAbs = cat.children.reduce((sum, item) => sum + item.value, 0);
            return {
                id: catIdx,
                name: cat.name,
                color: cat.color,
                percentage: (catTotalAbs / sample.total) * 100,
                children: cat.children.map(item => ({
                    name: item.name,
                    value: (item.value / sample.total) * 100
                }))
            };
        });

        nextSliceId = slices.length;
        renderApp();
    }

    function openModal() {
        samplesModal.style.display = 'flex';
        renderSampleCards();
    }

    function closeModal() {
        samplesModal.style.display = 'none';
    }

    if (openSamplesBtn) openSamplesBtn.addEventListener('click', openModal);
    if (addFirstCategoryBtn) addFirstCategoryBtn.addEventListener('click', () => {
        addSlice('Nova Categoria', 10);
        updateEmptyStateVisibility();
    });
    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (samplesModal) {
        samplesModal.addEventListener('click', (e) => {
            if (e.target === samplesModal) closeModal();
        });
    }

    function addSlice(name = 'Nova Categoria', percentage = 10, color = generateRandomRGB(), doRender = true) {
        const newSlice = {
            id: nextSliceId++,
            name: name,
            percentage: percentage,
            color: color,
            children: []
        };
        slices.push(newSlice);
        if (doRender) { renderApp(); }
    }

    function removeSlice(sliceId) {
        slices = slices.filter(slice => slice.id !== sliceId);
        renderApp();
    }

    function updateSliceName(sliceId, newName) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) { slice.name = newName; renderApp(); }
    }

    function updateSliceColor(sliceId, newColor) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) { slice.color = newColor; renderApp(); }
    }

    // --- Item Management ---
    function addItem(sliceId) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) {
            slice.children.push({ name: 'Novo Item', value: 5 });
            updateCategoryTotalFromChildren(slice);
            renderApp();
        }
    }

    function removeItem(sliceId, itemIndex) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice && slice.children[itemIndex]) {
            slice.children.splice(itemIndex, 1);
            updateCategoryTotalFromChildren(slice);
            renderApp();
        }
    }

    function updateItem(sliceId, itemIndex, newName, newValue) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice && slice.children[itemIndex]) {
            if (newName !== null) slice.children[itemIndex].name = newName;
            if (newValue !== null) slice.children[itemIndex].value = parseFloat(newValue) || 0;
            updateCategoryTotalFromChildren(slice);
            renderApp();
        }
    }

    function updateCategoryTotalFromChildren(slice) {
        if (slice.children.length > 0) {
            slice.percentage = slice.children.reduce((sum, child) => sum + child.value, 0);
        }
    }

    function updateSliceByAmount(sliceId, newAmount) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice && slice.children.length === 0) {
            const currentTotal = getCurrentPeriodBudget();
            if (currentTotal > 0) {
                slice.percentage = parseFloat(((newAmount / currentTotal) * 100).toFixed(2));
            }
            renderApp();
        }
    }

    function updateTotalBudget() {
        const newTotal = parseFloat(totalBudgetInput.value);
        if (!isNaN(newTotal) && newTotal >= 0) {
            setCurrentPeriodBudget(newTotal);
        } else {
            totalBudgetInput.value = getCurrentPeriodBudget();
        }
        renderApp();
    }

    // --- Periodicity Modal Logic ---
    window.openPeriodicityModal = function (sliceId, idx) {
        currentPeriodicityItem = { sliceId, itemIndex: idx };
        const slice = slices.find(s => s.id === sliceId);
        const item = slice.children[idx];

        // Default or existing periodicity
        let currentCount = 1;
        let currentPeriod = 'months';

        if (item.periodicity) {
            currentCount = item.periodicity.count || 1;
            currentPeriod = item.periodicity.period || 'months';
        }

        populatePicker(countPickerColumn, Array.from({ length: 360 }, (_, i) => i + 1), currentCount);
        populatePicker(periodPickerColumn, PERIOD_OPTIONS, currentPeriod);

        periodicityModal.style.display = 'flex';
        // Small delay to allow CSS transitions if needed, scroll to center
        setTimeout(() => {
            centerScroll(countPickerColumn);
            centerScroll(periodPickerColumn);
        }, 10);
    };

    function closePeriodicityModal() {
        periodicityModal.style.display = 'none';
        currentPeriodicityItem = null;
    }

    if (closePeriodicityBtn) {
        closePeriodicityBtn.addEventListener('click', closePeriodicityModal);
    }

    if (periodicityModal) {
        periodicityModal.addEventListener('click', (e) => {
            if (e.target === periodicityModal) closePeriodicityModal();
        });
    }

    function populatePicker(columnEl, items, selectedValue) {
        columnEl.innerHTML = '';

        // Add padding spaces
        const padCount = 2; // For visual center
        for (let i = 0; i < padCount; i++) {
            const pad = document.createElement('div');
            pad.className = 'picker-item empty';
            columnEl.appendChild(pad);
        }

        items.forEach(item => {
            const val = typeof item === 'object' ? item.value : item;
            const label = typeof item === 'object' ? item.label : item;
            const div = document.createElement('div');
            div.className = 'picker-item';
            div.dataset.value = val;
            div.textContent = label;
            if (val == selectedValue) {
                div.classList.add('selected');
                // The scroll centering happens later
            }
            // Click to select directly
            div.addEventListener('click', () => {
                selectPickerItem(columnEl, div);
            });
            columnEl.appendChild(div);
        });

        for (let i = 0; i < padCount; i++) {
            const pad = document.createElement('div');
            pad.className = 'picker-item empty';
            columnEl.appendChild(pad);
        }

        // Add scroll snapped styling logic
        columnEl.addEventListener('scroll', () => {
            updateSelectedPickerItem(columnEl);
        });
    }

    function selectPickerItem(columnEl, itemEl) {
        const itemHeight = itemEl.offsetHeight || 40; // Default fallback height
        // Center the item
        const containerCenter = columnEl.offsetHeight / 2;
        const itemTop = itemEl.offsetTop;
        columnEl.scrollTo({
            top: itemTop - containerCenter + (itemHeight / 2),
            behavior: 'smooth'
        });
    }

    function updateSelectedPickerItem(columnEl) {
        let items = Array.from(columnEl.querySelectorAll('.picker-item:not(.empty)'));
        if (!items.length) return;

        const containerCenter = columnEl.scrollTop + (columnEl.offsetHeight / 2);

        let closest = items[0];
        let minDiff = Infinity;

        items.forEach(item => {
            const itemCenter = item.offsetTop + (item.offsetHeight / 2);
            const diff = Math.abs(containerCenter - itemCenter);
            if (diff < minDiff) {
                minDiff = diff;
                closest = item;
            }
        });

        items.forEach(item => item.classList.remove('selected'));
        closest.classList.add('selected');
    }

    function centerScroll(columnEl) {
        let selected = columnEl.querySelector('.picker-item.selected');
        if (selected) {
            selectPickerItem(columnEl, selected);
        }
    }

    function getSelectedPickerValue(columnEl) {
        const selected = columnEl.querySelector('.picker-item.selected');
        return selected ? selected.dataset.value : null;
    }

    if (savePeriodicityBtn) {
        savePeriodicityBtn.addEventListener('click', () => {
            if (!currentPeriodicityItem) return;

            const slice = slices.find(s => s.id === currentPeriodicityItem.sliceId);
            if (slice && slice.children[currentPeriodicityItem.itemIndex]) {
                const item = slice.children[currentPeriodicityItem.itemIndex];

                const countVal = parseInt(getSelectedPickerValue(countPickerColumn), 10);
                const periodVal = getSelectedPickerValue(periodPickerColumn);

                // Initialize or update periodicity object
                item.periodicity = {
                    startDate: new Date().toISOString().split('T')[0], // Starts today by default when created
                    count: countVal,
                    interval: 1, // Fixed to 1 for now (e.g. Every 1 month)
                    period: periodVal
                };

                console.log(`Saved Periodicity for ${item.name}: ${countVal} ${periodVal}`);
                saveCurrentWorkingState();
                renderApp();
            }
            closePeriodicityModal();
        });
    }

    function normalizePercentages() {
        if (slices.length === 0) return;
        slices.forEach(slice => {
            slice.percentage = (typeof slice.percentage === 'number' && !isNaN(slice.percentage) && slice.percentage >= 0) ? slice.percentage : 0;
        });
    }

    // --- Color Helpers ---
    function getContrastForm(hexColor) {
        // Returns 'white' or 'black' based on background brightness
        const rgb = hexToRgb(hexColor.startsWith('rgb') ? rgbToHex(hexColor) : hexColor);
        if (!rgb) return 'black';
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        return brightness > 125 ? 'black' : 'white';
    }

    function hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    function lightenColor(color, percent) {
        const hex = color.startsWith('rgb') ? rgbToHex(color) : color;
        const rgb = hexToRgb(hex);
        if (!rgb) return color;
        const r = Math.min(255, Math.floor(rgb.r + (255 - rgb.r) * (percent / 100)));
        const g = Math.min(255, Math.floor(rgb.g + (255 - rgb.g) * (percent / 100)));
        const b = Math.min(255, Math.floor(rgb.b + (255 - rgb.b) * (percent / 100)));
        return `rgb(${r}, ${g}, ${b})`;
    }

    // --- ECharts Sunburst Rendering ---
    let myChart = null;

    function renderSunburst(dataSlices = slices) {
        if (!myChart) {
            myChart = echarts.init(chartContainer);
        }

        // Transform slices data to ECharts format
        const transformData = (dSlices) => {
            return dSlices.map(s => {
                const itemColor = s.color;
                const item = {
                    name: s.name,
                    itemStyle: { color: itemColor },
                    children: s.children && s.children.length > 0
                        ? s.children.map(c => ({
                            name: c.name,
                            value: c.value,
                            itemStyle: { color: lightenColor(itemColor, 30) } // Inherit and lighten parent color
                        }))
                        : [{ name: s.name, value: s.percentage, itemStyle: { opacity: 0 } }] // Spacer for leaf categories
                };
                if (!s.children || s.children.length === 0) {
                    item.value = s.percentage;
                    delete item.children;
                }
                return item;
            });
        };

        const chartData = transformData(dataSlices);

        const option = {
            backgroundColor: 'transparent',
            tooltip: {
                trigger: 'item',
                formatter: params => {
                    const val = params.value || 0;
                    const perc = ((val / getCurrentPeriodBudget()) * 100).toFixed(2);
                    return `${params.name}<br/>Valor: R$ ${val.toFixed(2)} (${perc}%)`;
                }
            },
            series: {
                type: 'sunburst',
                data: chartData,
                radius: [0, '95%'],
                sort: null,
                emphasis: {
                    focus: 'ancestor'
                },
                levels: [
                    {},
                    {
                        r0: '0%',
                        r: '65%',
                        itemStyle: { borderWidth: 2 },
                        label: { rotate: 'radial', minAngle: 10, fontWeight: 'bold' }
                    },
                    {
                        r0: '65%',
                        r: '70%',
                        label: {
                            position: 'outside',
                            padding: 3,
                            silent: false,
                            fontWeight: 'bold',
                            color: 'inherit'
                        },
                        itemStyle: {
                            borderWidth: 3
                        }
                    }
                ],
                label: {
                    show: true,
                    formatter: '{b}',
                    fontSize: 16,
                    fontWeight: 'bold',
                    rotate: 'radial'
                }
            }
        };

        myChart.setOption(option, true);

        // Ensure the chart fits its container, especially after being unhidden
        setTimeout(() => {
            if (myChart) myChart.resize();
        }, 0);
    }

    function renderApp() {
        // Update visibility BEFORE rendering chart to ensure container has dimensions
        updateEmptyStateVisibility();

        // --- V4 Engine: Filter items based on current time view ---
        const activeSlices = filterSlicesForCurrentTime();

        renderSunburst(activeSlices);
        renderTable(activeSlices);
        renderCalendar(activeSlices); // Synchronize Calendar View
        saveCurrentWorkingState();
    }

    // --- V4 Calendar Engine ---
    function renderCalendar(activeSlices = filterSlicesForCurrentTime()) {
        if (!calendarView) return;

        const calendarGrid = document.getElementById('calendarGrid');
        const calendarTitle = document.getElementById('calendarTitle');
        const calendarBudgetLimit = document.getElementById('calendarBudgetLimit');
        if (!calendarGrid || !calendarTitle || !calendarBudgetLimit) return;

        calendarGrid.innerHTML = ''; // clear

        // Header Title Update
        if (globalViewMode === 'week') {
            const start = new Date(currentDate);
            const day = start.getDay();
            const diff = start.getDate() - day + (day === 0 ? -6 : 1);
            start.setDate(diff);
            const end = new Date(start);
            end.setDate(start.getDate() + 6);
            calendarTitle.textContent = `${start.toLocaleDateString('pt-BR')} - ${end.toLocaleDateString('pt-BR')}`;
        } else if (globalViewMode === 'month') {
            const monthName = currentDate.toLocaleString('pt-BR', { month: 'long' });
            calendarTitle.textContent = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${currentDate.getFullYear()}`;
        } else if (globalViewMode === 'year') {
            calendarTitle.textContent = `Ano de ${currentDate.getFullYear()}`;
        }

        // Period budget limit
        calendarBudgetLimit.textContent = `Limite: R$ ${getCurrentPeriodBudget().toFixed(2)}`;

        // Generate Grid 
        if (globalViewMode === 'month' || globalViewMode === 'week') {
            calendarGrid.style.gridTemplateColumns = 'repeat(7, 1fr)';
            const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
            daysOfWeek.forEach(d => {
                const head = document.createElement('div');
                head.className = 'calendar-day-header';
                head.textContent = d;
                calendarGrid.appendChild(head);
            });

            // Organize events by day (we approximate to startDate day for visual simulation)
            const eventsByDayMonth = {}; // Use "MM-DD" key for broader mapping
            activeSlices.forEach(slice => {
                slice.children.forEach(item => {
                    if (item.periodicity && item.periodicity.startDate) {
                        const sDate = new Date(item.periodicity.startDate);
                        const key = `${sDate.getMonth()}-${sDate.getDate()}`;
                        if (!eventsByDayMonth[key]) eventsByDayMonth[key] = [];
                        eventsByDayMonth[key].push({ name: item.name, color: slice.color, value: item.value });
                    } else {
                        // Monthly fallback = day 1
                        const key = `${currentDate.getMonth()}-1`;
                        if (!eventsByDayMonth[key]) eventsByDayMonth[key] = [];
                        eventsByDayMonth[key].push({ name: item.name, color: slice.color, value: item.value });
                    }
                });
            });

            if (globalViewMode === 'month') {
                const year = currentDate.getFullYear();
                const month = currentDate.getMonth();
                const firstDayOfMonth = new Date(year, month, 1).getDay();
                const daysInMonth = new Date(year, month + 1, 0).getDate();

                for (let i = 0; i < firstDayOfMonth; i++) {
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'calendar-cell empty';
                    calendarGrid.appendChild(emptyCell);
                }

                for (let i = 1; i <= daysInMonth; i++) {
                    const cell = document.createElement('div');
                    cell.className = 'calendar-cell has-date';
                    const dayLabel = document.createElement('div');
                    dayLabel.className = 'calendar-date-number';
                    dayLabel.textContent = i;
                    cell.appendChild(dayLabel);

                    const key = `${month}-${i}`;
                    if (eventsByDayMonth[key]) {
                        eventsByDayMonth[key].forEach(evt => {
                            const eventDiv = document.createElement('div');
                            eventDiv.className = 'calendar-event';
                            eventDiv.style.backgroundColor = evt.color;
                            eventDiv.textContent = evt.name;
                            eventDiv.title = `${evt.name}: R$ ${((evt.value / 100) * getCurrentPeriodBudget()).toFixed(2)}`;
                            cell.appendChild(eventDiv);
                        });
                    }
                    calendarGrid.appendChild(cell);
                }

                const totalCellsSoFar = firstDayOfMonth + daysInMonth;
                const remainingCells = (7 - (totalCellsSoFar % 7)) % 7;
                for (let i = 0; i < remainingCells; i++) {
                    const emptyCell = document.createElement('div');
                    emptyCell.className = 'calendar-cell empty';
                    calendarGrid.appendChild(emptyCell);
                }

            } else if (globalViewMode === 'week') {
                // Determine the 7 days of the current week (Sun-Sat)
                const startOfWeek = new Date(currentDate);
                startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // go back to Sunday

                for (let i = 0; i < 7; i++) {
                    const printDate = new Date(startOfWeek);
                    printDate.setDate(startOfWeek.getDate() + i);

                    const cell = document.createElement('div');
                    cell.className = 'calendar-cell has-date';
                    const dayLabel = document.createElement('div');
                    dayLabel.className = 'calendar-date-number';
                    // Show Month/Day for week view clarity
                    dayLabel.textContent = `${printDate.getDate()}/${printDate.getMonth() + 1}`;
                    cell.appendChild(dayLabel);

                    const key = `${printDate.getMonth()}-${printDate.getDate()}`;
                    if (eventsByDayMonth[key]) {
                        eventsByDayMonth[key].forEach(evt => {
                            const eventDiv = document.createElement('div');
                            eventDiv.className = 'calendar-event';
                            eventDiv.style.backgroundColor = evt.color;
                            eventDiv.textContent = evt.name;
                            eventDiv.title = `${evt.name}: R$ ${((evt.value / 100) * getCurrentPeriodBudget()).toFixed(2)}`;
                            cell.appendChild(eventDiv);
                        });
                    }
                    calendarGrid.appendChild(cell);
                }
            }

        } else if (globalViewMode === 'year') {
            calendarGrid.style.gridTemplateColumns = 'repeat(4, 1fr)';

            const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

            for (let i = 0; i < 12; i++) {
                const cell = document.createElement('div');
                cell.className = 'calendar-cell';
                cell.style.minHeight = '120px';
                cell.style.alignItems = 'center';
                cell.style.justifyContent = 'center';
                cell.innerHTML = `<h3 style="color: var(--text-base); margin:0;">${monthNames[i]}</h3>
                                  <span style="color: var(--text-light); font-size: 0.8em; margin-top: 5px;">Detalhamento Oculto no Zoom Anual</span>`;
                calendarGrid.appendChild(cell);
            }
        }
    }

    // --- V4 Time Filtering Engine ---
    function filterSlicesForCurrentTime() {
        // Deep copy to avoid mutating the core state directly during rendering
        const filteredSlices = JSON.parse(JSON.stringify(slices));

        const viewStart = new Date(currentDate);
        let viewEnd = new Date(currentDate);

        // Define the bounds of the current view
        if (globalViewMode === 'week') {
            const day = viewStart.getDay();
            const diff = viewStart.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
            viewStart.setDate(diff);
            viewEnd = new Date(viewStart);
            viewEnd.setDate(viewStart.getDate() + 6);
        } else if (globalViewMode === 'month') {
            viewStart.setDate(1);
            viewEnd.setMonth(viewEnd.getMonth() + 1);
            viewEnd.setDate(0); // Last day of current month
        } else if (globalViewMode === 'year') {
            viewStart.setMonth(0, 1);
            viewEnd.setMonth(11, 31);
        }

        // Set hours to boundaries for inclusive comparison
        viewStart.setHours(0, 0, 0, 0);
        viewEnd.setHours(23, 59, 59, 999);

        // Filter items
        filteredSlices.forEach(slice => {
            const activeChildren = [];
            slice.children.forEach(item => {
                if (!item.periodicity) {
                    // Items without periodicity are considered "always active" / monthly fixed by default in legacy
                    activeChildren.push(item);
                    return;
                }

                const itemStart = new Date(item.periodicity.startDate);
                itemStart.setHours(0, 0, 0, 0);

                let isActive = false;
                const count = item.periodicity.count || 1;
                const period = item.periodicity.period || 'months';

                // Check all installments to see if any fall within the current view
                for (let i = 0; i < count; i++) {
                    const installmentDate = new Date(itemStart);

                    // Add intervals
                    if (period === 'days') installmentDate.setDate(installmentDate.getDate() + i);
                    if (period === 'weeks') installmentDate.setDate(installmentDate.getDate() + (i * 7));
                    if (period === 'fortnights') installmentDate.setDate(installmentDate.getDate() + (i * 14));
                    if (period === 'months') installmentDate.setMonth(installmentDate.getMonth() + i);
                    if (period === 'bimonthly') installmentDate.setMonth(installmentDate.getMonth() + (i * 2));
                    if (period === 'quarters') installmentDate.setMonth(installmentDate.getMonth() + (i * 3));
                    if (period === 'semesters') installmentDate.setMonth(installmentDate.getMonth() + (i * 6));
                    if (period === 'years') installmentDate.setFullYear(installmentDate.getFullYear() + i);

                    if (installmentDate >= viewStart && installmentDate <= viewEnd) {
                        isActive = true;
                        // In future sub-phases: calculate proportional amount if partial month/week
                        break;
                    }
                }

                if (isActive) {
                    activeChildren.push(item);
                }
            });

            slice.children = activeChildren;
            // Recalculate slice percentage based ONLY on active children
            if (slice.children.length > 0) {
                slice.percentage = slice.children.reduce((sum, child) => sum + child.value, 0);
            } else {
                // If a category has no items this month, should it have 0%?
                // For now, if no items, it contributes 0.
                slice.percentage = 0;
            }
        });

        // Filter out categories that have NO active items AND percentage is 0 
        // (to clean up the view, but let's keep them for now to allow adding items contextually).

        return filteredSlices;
    }

    function renderTable(dataSlices = slices) {
        slicesTableBody.innerHTML = '';
        dataSlices.forEach(slice => {
            // Category Row
            const catRow = slicesTableBody.insertRow();
            catRow.className = 'category-row';
            catRow.dataset.id = slice.id;

            // Base colors for row context
            const catPercentage = slice.percentage || 0;
            const rowBaseColor = lightenColor(slice.color, 85);
            catRow.style.backgroundColor = rowBaseColor;

            const textColor = getContrastForm(rowBaseColor);
            catRow.style.color = textColor;

            const percentageValue = slice.percentage || 0;

            // Color Swatch
            const colorCell = catRow.insertCell();
            colorCell.className = 'color-col';
            const colorInput = document.createElement('input');
            colorInput.type = 'color';
            colorInput.className = 'color-input-swatch';
            colorInput.value = slice.color.startsWith('rgb') ? rgbToHex(slice.color) : slice.color;
            colorInput.addEventListener('input', (e) => updateSliceColor(slice.id, e.target.value));
            colorCell.appendChild(colorInput);

            // Name with Inline Actions
            const nameCell = catRow.insertCell();
            nameCell.className = 'name-col-contextual';

            const nameWrapper = document.createElement('div');
            nameWrapper.className = 'name-input-wrapper';

            const nameInput = document.createElement('input');
            nameInput.type = 'text';
            nameInput.className = 'slice-name-input category-name';
            nameInput.style.color = textColor;
            nameInput.value = slice.name;
            nameInput.addEventListener('change', (e) => updateSliceName(slice.id, e.target.value));

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'icon-action-btn inline-delete-btn';
            deleteBtn.innerHTML = '<span class="material-icons">delete_outline</span>';
            deleteBtn.title = "Excluir Categoria";
            deleteBtn.addEventListener('click', () => removeSlice(slice.id));

            const addItemBtn = document.createElement('button');
            addItemBtn.className = 'icon-action-btn contextual-add-btn';
            addItemBtn.innerHTML = '<span class="material-icons">add</span>';
            addItemBtn.title = "Adicionar Item";
            addItemBtn.onclick = () => addItem(slice.id);

            const mobilePctFill = document.createElement('div');
            mobilePctFill.className = 'mobile-progress-fill';
            const catBarColorMobile = lightenColor(slice.color, 75);
            mobilePctFill.style.background = `linear-gradient(90deg, ${catBarColorMobile} ${catPercentage}%, transparent ${catPercentage}%)`;

            nameWrapper.appendChild(nameInput);
            nameWrapper.appendChild(deleteBtn);
            nameCell.appendChild(mobilePctFill);
            nameCell.appendChild(nameWrapper);

            const mobilePctText = document.createElement('span');
            mobilePctText.className = 'mobile-percentage-text';
            mobilePctText.textContent = `${catPercentage.toFixed(2)}%`;
            nameCell.appendChild(mobilePctText);

            nameCell.appendChild(addItemBtn);

            // Percentage (Derived) with Progress Bar
            const percentageCell = catRow.insertCell();
            percentageCell.className = 'percentage-col category-total percentage-col-fill';
            const catBarColor = lightenColor(slice.color, 70);
            percentageCell.style.background = `linear-gradient(90deg, ${catBarColor} ${catPercentage}%, transparent ${catPercentage}%)`;
            percentageCell.innerHTML = `<span class="perc-text">${catPercentage.toFixed(2)}%</span>`;

            // Amount (Derived)
            const amountCell = catRow.insertCell();
            amountCell.className = 'amount-col category-total';
            const amount = (percentageValue / 100) * getCurrentPeriodBudget();
            amountCell.textContent = `R$ ${amount.toFixed(2)}`;



            // Item Rows
            slice.children.forEach((item, idx) => {
                const itemRow = slicesTableBody.insertRow();
                itemRow.className = 'item-row';

                const catPerc = slice.percentage || 0;
                const itemPerc = item.value || 0;
                const childGlobalPerc = (itemPerc / 100) * catPerc;

                const itemRowBaseColor = lightenColor(slice.color, 95);
                itemRow.style.backgroundColor = itemRowBaseColor;

                const itemTextColor = getContrastForm(itemRowBaseColor);
                itemRow.style.color = itemTextColor;

                const itemColorCell = itemRow.insertCell(); // Empty color col
                itemColorCell.className = 'color-col';

                // Item Name with Inline Delete
                const itemNameCell = itemRow.insertCell();
                itemNameCell.className = 'name-col-contextual';

                const itemNameWrapper = document.createElement('div');
                itemNameWrapper.className = 'name-input-wrapper';

                const itemNameInput = document.createElement('input');
                itemNameInput.type = 'text';
                itemNameInput.className = 'slice-name-input item-name';
                itemNameInput.style.color = itemTextColor;
                itemNameInput.value = item.name;
                itemNameInput.addEventListener('change', (e) => updateItem(slice.id, idx, e.target.value, null));

                const deleteItemBtn = document.createElement('button');
                deleteItemBtn.className = 'icon-action-btn inline-delete-item-btn';
                deleteItemBtn.innerHTML = '<span class="material-icons">close</span>';
                deleteItemBtn.title = "Remover Item";
                deleteItemBtn.onclick = () => removeItem(slice.id, idx);

                const periodicityBtn = document.createElement('button');
                periodicityBtn.className = 'icon-action-btn clock-item-btn';
                periodicityBtn.innerHTML = '<span class="material-icons">more_time</span>';
                periodicityBtn.title = "Configurar Repetição";
                periodicityBtn.onclick = () => openPeriodicityModal(slice.id, idx);

                const itemMobilePctFill = document.createElement('div');
                itemMobilePctFill.className = 'mobile-progress-fill item-progress';
                const itemBarColorMobile = lightenColor(slice.color, 85);
                itemMobilePctFill.style.background = `linear-gradient(90deg, ${itemBarColorMobile} ${itemPerc}%, transparent ${itemPerc}%)`;

                itemNameWrapper.appendChild(itemNameInput);
                itemNameWrapper.appendChild(periodicityBtn);
                itemNameWrapper.appendChild(deleteItemBtn);
                itemNameCell.appendChild(itemMobilePctFill);
                itemNameCell.appendChild(itemNameWrapper);

                const itemMobilePctText = document.createElement('span');
                itemMobilePctText.className = 'mobile-percentage-text';
                itemMobilePctText.textContent = `${itemPerc.toFixed(2)}%`;
                itemNameCell.appendChild(itemMobilePctText);

                // Item Percentage with Nested Progress Bar
                const itemPercentageCell = itemRow.insertCell();
                itemPercentageCell.className = 'percentage-col item-value percentage-col-fill';

                const childBarColor = lightenColor(slice.color, 80); // Contribution shade
                const parentShadeColor = lightenColor(slice.color, 90); // Parent context shade

                itemPercentageCell.style.background = `linear-gradient(90deg, 
                    ${childBarColor} ${childGlobalPerc.toFixed(2)}%, 
                    ${parentShadeColor} ${childGlobalPerc.toFixed(2)}% ${catPerc.toFixed(2)}%, 
                    transparent ${catPerc.toFixed(2)}%)`;

                itemPercentageCell.style.color = itemTextColor;
                itemPercentageCell.innerHTML = `<span class="perc-text">${itemPerc.toFixed(2)}%</span>`;

                // Item Amount (Input and adjustment buttons)
                const itemAmountCell = itemRow.insertCell();
                itemAmountCell.className = 'amount-col item-value';

                const amountGroup = document.createElement('div');
                amountGroup.className = 'amount-control-group';

                const adjustValue = (delta) => {
                    const currentVal = parseFloat(itemAmountInput.value) || 0;
                    const newVal = Math.max(0, currentVal + delta);
                    itemAmountInput.value = newVal.toFixed(2);
                    const newPerc = (newVal / getCurrentPeriodBudget()) * 100;
                    updateItem(slice.id, idx, null, newPerc);
                };

                const createBtn = (icon, delta, title) => {
                    const btn = document.createElement('button');
                    btn.className = 'adjust-btn';
                    btn.innerHTML = `<span class="material-icons">${icon}</span>`;
                    btn.title = title;
                    btn.onclick = (e) => {
                        e.preventDefault();
                        adjustValue(delta);
                    };
                    return btn;
                };

                const dec100 = createBtn('keyboard_double_arrow_left', -100, '-100');
                const dec10 = createBtn('chevron_left', -10, '-10');
                const inc10 = createBtn('chevron_right', 10, '+10');
                const inc100 = createBtn('keyboard_double_arrow_right', 100, '+100');

                const itemAmountInput = document.createElement('input');
                itemAmountInput.type = 'number';
                itemAmountInput.className = 'slice-amount-input';
                itemAmountInput.style.color = itemTextColor;
                itemAmountInput.value = ((item.value / 100) * getCurrentPeriodBudget()).toFixed(2);
                itemAmountInput.step = "0.01";
                itemAmountInput.addEventListener('change', (e) => {
                    const newVal = parseFloat(e.target.value) || 0;
                    const newPerc = (newVal / getCurrentPeriodBudget()) * 100;
                    updateItem(slice.id, idx, null, newPerc);
                });

                amountGroup.appendChild(dec100);
                amountGroup.appendChild(dec10);
                amountGroup.appendChild(itemAmountInput);
                amountGroup.appendChild(inc10);
                amountGroup.appendChild(inc100);

                itemAmountCell.appendChild(amountGroup);

            });
        });

        // Update Unallocated text
        const currentTotalAllocatedPercentage = dataSlices.reduce((sum, s) => sum + s.percentage, 0);
        const unallocatedPercentageValue = 100 - currentTotalAllocatedPercentage;

        if (Math.abs(unallocatedPercentageValue) < 0.01) {
            unallocatedPercentageDiv.textContent = '✓ Orçamento totalmente alocado.';
            unallocatedPercentageDiv.style.color = '#27ae60';
            unallocatedPercentageDiv.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
            unallocatedPercentageDiv.style.fontWeight = 'normal';
        } else if (unallocatedPercentageValue < 0) {
            // Budget exceeded
            const exceededAmount = Math.abs(unallocatedPercentageValue / 100) * getCurrentPeriodBudget();
            const exceededPerc = Math.abs(unallocatedPercentageValue).toFixed(2);
            unallocatedPercentageDiv.textContent = `⚠ Orçamento estourado! Excedido em R$ ${exceededAmount.toFixed(2)} (${exceededPerc}% acima do limite)`;
            unallocatedPercentageDiv.style.color = '#c0392b';
            unallocatedPercentageDiv.style.backgroundColor = 'rgba(231, 76, 60, 0.12)';
            unallocatedPercentageDiv.style.fontWeight = 'bold';
        } else {
            // Under budget
            const unallocatedAmount = (unallocatedPercentageValue / 100) * getCurrentPeriodBudget();
            unallocatedPercentageDiv.textContent = `Restante: R$ ${unallocatedAmount.toFixed(2)} (${unallocatedPercentageValue.toFixed(2)}% disponível)`;
            unallocatedPercentageDiv.style.color = '#856404';
            unallocatedPercentageDiv.style.backgroundColor = 'rgba(192, 152, 83, 0.1)';
            unallocatedPercentageDiv.style.fontWeight = 'normal';
        }
    }

    function rgbToHex(rgb) {
        if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
        let sep = rgb.indexOf(",") > -1 ? "," : " "; rgb = rgb.substr(4).split(")")[0].split(sep);
        let r = (+rgb[0]).toString(16), g = (+rgb[1]).toString(16), b = (+rgb[2]).toString(16);
        if (r.length == 1) r = "0" + r; if (g.length == 1) g = "0" + g; if (b.length == 1) b = "0" + b;
        return "#" + r + g + b;
    }

    const commonAddSliceAction = () => {
        addSlice('Nova Categoria', 10);
    };
    // addSliceButton.addEventListener('click', commonAddSliceAction); (removed)
    addSliceTableButton.addEventListener('click', commonAddSliceAction);
    saveNewStateButton.addEventListener('click', handleSaveNewState);

    totalBudgetInput.addEventListener('change', updateTotalBudget);
    totalBudgetInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || totalBudgetInput.value === '') updateTotalBudget();
    });

    loadAllNamedStates();
    loadStateFromURL();
    if (!new URLSearchParams(window.location.search).has('state')) {
        loadCurrentWorkingState();
    }

    // --- V4 Time Navigation Logic ---
    timeSegments.forEach(segment => {
        segment.addEventListener('click', (e) => {
            timeSegments.forEach(s => s.classList.remove('active'));
            e.target.classList.add('active');
            globalViewMode = e.target.dataset.mode;
            console.log(`View Mode changed to: ${globalViewMode}`);
            updateDateLabel();
            totalBudgetInput.value = getCurrentPeriodBudget();
            renderApp(); // Will eventually filter by date
        });
    });

    if (pagePrevBtn) {
        pagePrevBtn.addEventListener('click', () => {
            shiftDate(-1);
        });
    }

    if (pageNextBtn) {
        pageNextBtn.addEventListener('click', () => {
            shiftDate(1);
        });
    }

    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
            console.log("Zoom out triggered!");
            mainContent.classList.remove('active-panel');
            calendarView.style.display = 'block';
            // small delay to allow display:block to apply before opacity transition
            setTimeout(() => {
                calendarView.classList.add('active-panel');
                mainContent.style.display = 'none';
            }, 10);

            if (typeof renderCalendar === 'function') {
                renderCalendar();
            }
        });
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
            console.log("Zoom in triggered!");
            calendarView.classList.remove('active-panel');
            mainContent.style.display = 'block';
            setTimeout(() => {
                mainContent.classList.add('active-panel');
                calendarView.style.display = 'none';
            }, 10);
        });
    }

    function shiftDate(direction) {
        const newDate = new Date(currentDate);
        if (globalViewMode === 'week') {
            newDate.setDate(newDate.getDate() + (7 * direction));
        } else if (globalViewMode === 'month') {
            newDate.setMonth(newDate.getMonth() + (1 * direction));
        } else if (globalViewMode === 'year') {
            newDate.setFullYear(newDate.getFullYear() + (1 * direction));
        }
        currentDate = newDate;
        console.log(`Date shifted by ${direction} ${globalViewMode}. New date: ${currentDate.toISOString()}`);
        updateDateLabel();
        totalBudgetInput.value = getCurrentPeriodBudget();
        renderApp();
    }

    // Temporary date label update logic until UI is finalized
    function updateDateLabel() {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        console.log(`Current Period: ${currentDate.toLocaleDateString('pt-BR', options)} (${globalViewMode})`);
    }

    renderApp();
    updateEmptyStateVisibility();

    window.addEventListener('resize', () => {
        if (myChart) {
            myChart.resize();
        } else {
            renderSunburst();
        }
    });

    // Tab switching logic
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetTab = item.getAttribute('data-tab');

            // Update active states
            navItems.forEach(ni => ni.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));

            item.classList.add('active');
            const targetEl = document.getElementById(targetTab);
            if (targetEl) {
                targetEl.classList.add('active');

                // Refresh chart if switching to chart view
                if (targetTab === 'chartView' && myChart) {
                    myChart.resize();
                }
            }
        });
    });
});