document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const budgetSlider = document.getElementById('budgetSlider');
    const slicesTableBody = document.getElementById('slicesTableBody');
    const addSliceButton = document.getElementById('addSliceButton');
    const addSliceTableButton = document.getElementById('addSliceTableButton');
    const totalBudgetInput = document.getElementById('totalBudgetInput');
    const unallocatedPercentageDiv = document.getElementById('unallocatedPercentage');

    // Sidebar DOM Elements
    const menuButton = document.getElementById('menuButton');
    const closeMenuButton = document.getElementById('closeMenuButton');
    const sidebar = document.getElementById('sidebar');
    const appContainer = document.getElementById('appContainer'); // Main content area
    const newStateNameInput = document.getElementById('newStateNameInput');
    const saveNewStateButton = document.getElementById('saveNewStateButton');
    const savedStatesListUI = document.getElementById('savedStatesList');


    // Application State
    let slices = []; // Current working slices
    let totalBudget = parseFloat(totalBudgetInput.value) || 1000; // Current working total budget
    let nextSliceId = 0; // For current working slices
    let allSavedStates = []; // Array to hold all named save states {id, name, slices, totalBudget}

    // Drag State Variables
    let currentlyDraggedHandle = null;
    let currentlyDraggedSliceData = null;
    let initialClientX = 0;
    let initialSlicePercentage = 0;
    let adjacentSlicePercentage = 0;
    let totalSliderWidth = 0;

    const MIN_SLICE_PERCENTAGE = 0.5;

    /** Generates a random RGB color string. */
    function generateRandomRGB() {
        const r = Math.floor(Math.random() * 220);
        const g = Math.floor(Math.random() * 220);
        const b = Math.floor(Math.random() * 220);
        return `rgb(${r}, ${g}, ${b})`;
    }

    // --- State Management for CURRENT WORKING SET ---
    /** Saves the current working state (slices and totalBudget) to local storage. */
    function saveCurrentWorkingState() {
        localStorage.setItem('budgetSlices_v2_7', JSON.stringify(slices));
        localStorage.setItem('totalBudget_v2_7', totalBudget.toString());
    }

    /** Loads the current working state from local storage. */
    function loadCurrentWorkingState() {
        const savedTotalBudget = localStorage.getItem('totalBudget_v2_7');
        if (savedTotalBudget) {
            totalBudget = parseFloat(savedTotalBudget);
            totalBudgetInput.value = totalBudget;
        } else {
            totalBudget = 1000; // Default if nothing saved
            totalBudgetInput.value = totalBudget;
        }

        const savedSlices = localStorage.getItem('budgetSlices_v2_7');
        let tempNextId = 0; // To calculate nextSliceId for the current working set
        const seenIds = new Set(); // To handle potential ID clashes if data is manually edited/corrupted

        if (savedSlices) {
            try {
                let parsedSlices = JSON.parse(savedSlices);
                if (Array.isArray(parsedSlices)) {
                    slices = parsedSlices.map(s => {
                        let currentId = (s && typeof s.id === 'number') ? s.id : -1;
                        if (currentId === -1 || seenIds.has(currentId)) {
                            currentId = tempNextId;
                            while(seenIds.has(currentId)) { tempNextId++; currentId = tempNextId; }
                        }
                        seenIds.add(currentId);
                        if (currentId >= tempNextId) { tempNextId = currentId + 1; }
                        return {
                            id: currentId,
                            name: (s && typeof s.name === 'string') ? s.name : `Categoria ${currentId}`,
                            percentage: (s && typeof s.percentage === 'number' && !isNaN(s.percentage)) ? s.percentage : 0,
                            color: (s && typeof s.color === 'string' && s.color.match(/^(rgb\(|#)/)) ? s.color : generateRandomRGB()
                        };
                    });
                } else { slices = []; }
            } catch (e) { console.error("Erro ao carregar fatias de trabalho:", e); slices = []; }
        }
        
        if (slices.length === 0) { // If no working slices loaded or parsing failed
            tempNextId = 0; // Reset for default items
            // Do not call addSlice here, as it modifies 'slices' directly and calls renderApp.
            // Instead, build the default array.
            const defaultSlicesData = [
                { id: tempNextId++, name: 'Mercado', percentage: 25, color: generateRandomRGB() },
                { id: tempNextId++, name: 'Contas Fixas', percentage: 20, color: generateRandomRGB() },
                { id: tempNextId++, name: 'Lazer', percentage: 10, color: generateRandomRGB() }
            ];
            slices = defaultSlicesData; // Assign default slices
        }
        nextSliceId = tempNextId; // Set the nextSliceId for the current working set
        normalizePercentages();
        // renderApp() will be called by the main initialization logic after all states are loaded
    }

    // --- State Management for ALL SAVED STATES (in sidebar) ---
    /** Loads all named save states from local storage. */
    function loadAllNamedStates() {
        const statesJSON = localStorage.getItem('budgetManager_allStates_v2_7');
        if (statesJSON) {
            try {
                allSavedStates = JSON.parse(statesJSON);
                if (!Array.isArray(allSavedStates)) allSavedStates = []; // Ensure it's an array
            } catch (e) {
                console.error("Erro ao carregar lista de orçamentos salvos:", e);
                allSavedStates = [];
            }
        } else {
            allSavedStates = [];
        }
        renderSavedStatesList();
    }

    /** Saves all named save states to local storage. */
    function saveAllNamedStates() {
        localStorage.setItem('budgetManager_allStates_v2_7', JSON.stringify(allSavedStates));
    }

    /** Renders the list of saved states in the sidebar. */
    function renderSavedStatesList() {
        savedStatesListUI.innerHTML = ''; // Clear current list
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

            const loadBtn = document.createElement('button');
            loadBtn.textContent = 'Carregar';
            loadBtn.className = 'load-btn';
            loadBtn.onclick = () => loadSpecificNamedState(state.id);
            actionsDiv.appendChild(loadBtn);

            const renameBtn = document.createElement('button');
            renameBtn.textContent = 'Renomear';
            renameBtn.className = 'rename-btn';
            renameBtn.onclick = () => renameNamedState(state.id);
            actionsDiv.appendChild(renameBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = 'Excluir';
            deleteBtn.className = 'delete-btn';
            deleteBtn.onclick = () => deleteNamedState(state.id);
            actionsDiv.appendChild(deleteBtn);

            li.appendChild(actionsDiv);
            savedStatesListUI.appendChild(li);
        });
    }

    /** Handles saving the current working budget as a new named state. */
    function handleSaveNewState() {
        const name = newStateNameInput.value.trim();
        if (!name) {
            alert("Por favor, insira um nome para o orçamento.");
            newStateNameInput.focus();
            return;
        }
        // Check if name already exists (optional: allow overwrite or ask user)
        if (allSavedStates.some(s => s.name === name)) {
            if (!confirm(`Já existe um orçamento chamado "${name}". Deseja sobrescrevê-lo?`)) {
                return;
            }
            // If overwriting, remove the old one by name first
            allSavedStates = allSavedStates.filter(s => s.name !== name);
        }

        const newState = {
            id: Date.now(), // Simple unique ID
            name: name,
            slices: JSON.parse(JSON.stringify(slices)), // Deep copy
            totalBudget: totalBudget
        };
        allSavedStates.push(newState);
        saveAllNamedStates();
        renderSavedStatesList();
        newStateNameInput.value = ''; // Clear input
        alert(`Orçamento "${name}" salvo!`);
    }

    /** Loads a specific named state into the current working area. */
    function loadSpecificNamedState(stateId) {
        const stateToLoad = allSavedStates.find(s => s.id === stateId);
        if (stateToLoad) {
            slices = JSON.parse(JSON.stringify(stateToLoad.slices)); // Deep copy
            totalBudget = stateToLoad.totalBudget;
            totalBudgetInput.value = totalBudget;

            // Recalculate nextSliceId for the newly loaded set
            let tempNextId = 0;
            if (slices.length > 0) {
                tempNextId = Math.max(...slices.map(s => s.id)) + 1;
            }
            nextSliceId = tempNextId;

            normalizePercentages();
            renderApp(); // This will also call saveCurrentWorkingState
            closeSidebar();
            alert(`Orçamento "${stateToLoad.name}" carregado.`);
        } else {
            alert("Erro: Orçamento salvo não encontrado.");
        }
    }

    /** Renames a specific named state. */
    function renameNamedState(stateId) {
        const stateToRename = allSavedStates.find(s => s.id === stateId);
        if (stateToRename) {
            const newName = prompt(`Digite o novo nome para "${stateToRename.name}":`, stateToRename.name);
            if (newName && newName.trim() !== "") {
                // Check if new name already exists (excluding the current one being renamed)
                if (allSavedStates.some(s => s.name === newName.trim() && s.id !== stateId)) {
                    alert(`Erro: Já existe um orçamento chamado "${newName.trim()}".`);
                    return;
                }
                stateToRename.name = newName.trim();
                saveAllNamedStates();
                renderSavedStatesList();
            }
        }
    }

    /** Deletes a specific named state. */
    function deleteNamedState(stateId) {
        const stateToDelete = allSavedStates.find(s => s.id === stateId);
        if (stateToDelete) {
            if (confirm(`Tem certeza que deseja excluir o orçamento "${stateToDelete.name}"?`)) {
                allSavedStates = allSavedStates.filter(s => s.id !== stateId);
                saveAllNamedStates();
                renderSavedStatesList();
            }
        }
    }


    // --- Sidebar Toggle Logic ---
    function openSidebar() {
        sidebar.classList.add('open');
        document.body.classList.add('sidebar-open'); // To push main content if needed
        // appContainer.style.marginLeft = sidebar.style.width; // Example of pushing content
    }
    function closeSidebar() {
        sidebar.classList.remove('open');
        document.body.classList.remove('sidebar-open');
        // appContainer.style.marginLeft = "0";
    }
    menuButton.addEventListener('click', openSidebar);
    closeMenuButton.addEventListener('click', closeSidebar);
    // Close sidebar if user clicks outside of it (optional)
    // document.addEventListener('click', (event) => {
    //     if (sidebar.classList.contains('open') && !sidebar.contains(event.target) && event.target !== menuButton) {
    //         closeSidebar();
    //     }
    // });


    /** Adds a new slice to the current working set. */
    function addSlice(name = 'Nova Categoria', percentage = 5, color = generateRandomRGB(), doRender = true) {
        percentage = Math.max(0, percentage);
        const newSlice = { id: nextSliceId++, name: `${name}`, percentage: percentage, color: color };
        slices.push(newSlice);
        if (doRender) { normalizePercentages(); renderApp(); }
    }

    /** Removes a slice from the current working set. */
    function removeSlice(sliceId) {
        slices = slices.filter(slice => slice.id !== sliceId);
        normalizePercentages(); renderApp();
    }

    /** Updates slice name in the current working set. */
    function updateSliceName(sliceId, newName) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) { slice.name = newName; renderApp(); }
    }

    /** Updates slice color in the current working set. */
    function updateSliceColor(sliceId, newColor) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) { slice.color = newColor; renderApp(); }
    }

    /** Updates slice percentage by amount in the current working set. */
    function updateSliceByAmount(sliceId, newAmount) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) {
            if (totalBudget > 0) {
                let newPercentage = (newAmount / totalBudget) * 100;
                slice.percentage = parseFloat(Math.max(0, newPercentage).toFixed(2));
            } else {
                slice.percentage = (newAmount > 0 && totalBudget <= 0) ? 0 : 0;
                if (newAmount > 0 && totalBudget <= 0) console.warn("Orçamento total é 0.");
            }
            normalizePercentages(); renderApp();
        }
    }

    /** Updates total budget for the current working set. */
    function updateTotalBudget() {
        const newTotal = parseFloat(totalBudgetInput.value);
        totalBudget = (!isNaN(newTotal) && newTotal >= 0) ? newTotal : totalBudget;
        if (isNaN(newTotal) || newTotal < 0) totalBudgetInput.value = totalBudget;
        normalizePercentages(); renderApp();
    }

    /** Normalizes percentages for the current working set. */
    function normalizePercentages() {
        if (slices.length === 0) return;
        slices.forEach(slice => {
            slice.percentage = (typeof slice.percentage === 'number' && !isNaN(slice.percentage) && slice.percentage >= 0) ? slice.percentage : 0;
        });
        let currentTotalPercentage = slices.reduce((sum, s) => sum + s.percentage, 0);
        if (currentTotalPercentage > 100) {
            const factor = 100 / currentTotalPercentage;
            slices.forEach(slice => { slice.percentage = parseFloat((slice.percentage * factor).toFixed(2)); });
            currentTotalPercentage = slices.reduce((sum, s) => sum + s.percentage, 0);
        }
        if (currentTotalPercentage > 99.99 && Math.abs(100 - currentTotalPercentage) > 0.001) {
            let diffTo100 = 100 - currentTotalPercentage;
            if (slices.length > 0) {
                slices.sort((a, b) => b.percentage - a.percentage);
                const newLargestPercentage = slices[0].percentage + diffTo100;
                if (newLargestPercentage >= 0) {
                    slices[0].percentage = parseFloat(newLargestPercentage.toFixed(2));
                }
            }
        }
        slices.forEach(s => { if (s.percentage < 0) s.percentage = 0; });
    }

    /** Renders the slider for the current working set. */
    function renderSlider() {
        budgetSlider.innerHTML = '';
        totalSliderWidth = budgetSlider.offsetWidth;
        let totalAllocatedPercentage = 0;
        slices.forEach((slice, index) => {
            const percentageValue = (typeof slice.percentage === 'number' && !isNaN(slice.percentage)) ? slice.percentage : 0;
            totalAllocatedPercentage += percentageValue;
            const sliceDiv = document.createElement('div');
            sliceDiv.className = 'slice';
            sliceDiv.style.backgroundColor = slice.color;
            sliceDiv.style.flexBasis = `${Math.max(0, percentageValue)}%`;
            sliceDiv.dataset.id = slice.id;
            const captionDiv = document.createElement('div');
            captionDiv.className = 'slice-caption';
            const amount = (percentageValue / 100) * totalBudget;
            captionDiv.textContent = `${slice.name} (${percentageValue.toFixed(1)}%)`;
            sliceDiv.appendChild(captionDiv);
            const tooltipDiv = document.createElement('div');
            tooltipDiv.className = 'slice-tooltip';
            tooltipDiv.textContent = `${slice.name}: ${percentageValue.toFixed(2)}% (R$${amount.toFixed(2)})`;
            sliceDiv.appendChild(tooltipDiv);
            const addResizeListeners = (handleElement) => {
                handleElement.addEventListener('mousedown', onPointerDownResize);
                handleElement.addEventListener('touchstart', onPointerDownResize, { passive: false });
            };
            if (index < slices.length - 1) {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle intermediate-resize-handle';
                resizeHandle.dataset.sliceIndex = index;
                sliceDiv.appendChild(resizeHandle);
                addResizeListeners(resizeHandle);
            }
            if (index === slices.length - 1 && slices.length > 0) {
                const lastResizeHandle = document.createElement('div');
                lastResizeHandle.className = 'resize-handle last-slice-resize-handle';
                lastResizeHandle.dataset.sliceIndex = index;
                sliceDiv.appendChild(lastResizeHandle);
                addResizeListeners(lastResizeHandle);
            }
            budgetSlider.appendChild(sliceDiv);
        });
        const unallocatedPercentage = 100 - totalAllocatedPercentage;
        if (unallocatedPercentage > 0.009) {
            const unallocatedSliceDiv = document.createElement('div');
            unallocatedSliceDiv.className = 'unallocated-slice';
            unallocatedSliceDiv.style.flexBasis = `${unallocatedPercentage.toFixed(2)}%`;
            const captionDiv = document.createElement('div');
            captionDiv.className = 'slice-caption';
            captionDiv.textContent = `Não Alocado: ${unallocatedPercentage.toFixed(1)}%`;
            unallocatedSliceDiv.appendChild(captionDiv);
            budgetSlider.appendChild(unallocatedSliceDiv);
        }
        const allVisualSlices = budgetSlider.children;
        if (allVisualSlices.length > 0) {
            for(let i=0; i < allVisualSlices.length -1; i++){
                if(allVisualSlices[i].classList.contains('slice')){
                     allVisualSlices[i].style.borderRight = '1px solid rgba(255, 255, 255, 0.8)';
                }
            }
            allVisualSlices[allVisualSlices.length-1].style.borderRight = 'none';
            if(allVisualSlices[allVisualSlices.length-1].classList.contains('unallocated-slice') && allVisualSlices.length > 1){
                 allVisualSlices[allVisualSlices.length-2].style.borderRight = '1px solid rgba(255, 255, 255, 0.8)';
            }
        }
    }

    /** Renders the table for the current working set. */
    function renderTable() {
        slicesTableBody.innerHTML = '';
        slices.forEach(slice => {
            const row = slicesTableBody.insertRow(); row.dataset.id = slice.id;
            const percentageValue = (typeof slice.percentage === 'number' && !isNaN(slice.percentage)) ? slice.percentage : 0;
            const colorCell = row.insertCell(); colorCell.className = 'color-col';
            const colorInput = document.createElement('input'); colorInput.type = 'color';
            colorInput.className = 'color-input-swatch'; colorInput.value = slice.color.startsWith('rgb') ? rgbToHex(slice.color) : slice.color;
            colorInput.addEventListener('input', (e) => updateSliceColor(slice.id, e.target.value));
            colorCell.appendChild(colorInput);
            const nameCell = row.insertCell();
            const nameInput = document.createElement('input'); nameInput.type = 'text';
            nameInput.className = 'slice-name-input'; nameInput.value = slice.name;
            nameInput.addEventListener('change', (e) => updateSliceName(slice.id, e.target.value));
            nameCell.appendChild(nameInput);
            const percentageCell = row.insertCell(); percentageCell.className = 'percentage-col';
            percentageCell.textContent = `${percentageValue.toFixed(2)}%`;
            const amountCell = row.insertCell(); amountCell.className = 'amount-col';
            const amountInput = document.createElement('input'); amountInput.type = 'number';
            amountInput.className = 'slice-amount-input'; amountInput.value = ((percentageValue / 100) * totalBudget).toFixed(2);
            amountInput.min = "0"; amountInput.step = "0.01";
            amountInput.addEventListener('change', (e) => updateSliceByAmount(slice.id, parseFloat(e.target.value)));
            amountCell.appendChild(amountInput);
            const actionsCell = row.insertCell(); actionsCell.className = 'actions-col';
            const deleteBtn = document.createElement('button'); deleteBtn.className = 'delete-slice-btn';
            deleteBtn.textContent = 'Excluir'; deleteBtn.addEventListener('click', () => removeSlice(slice.id));
            actionsCell.appendChild(deleteBtn);
        });
        const currentTotalAllocatedPercentage = slices.reduce((sum, s) => sum + ((typeof s.percentage === 'number' && !isNaN(s.percentage)) ? s.percentage : 0), 0);
        const unallocatedPercentageValue = 100 - currentTotalAllocatedPercentage;
        const unallocatedAmount = (unallocatedPercentageValue / 100) * totalBudget;
        if (Math.abs(unallocatedPercentageValue) < 0.01 && currentTotalAllocatedPercentage >= 99.99) {
            unallocatedPercentageDiv.textContent = 'Orçamento totalmente alocado.';
            unallocatedPercentageDiv.style.color = '#27ae60';
            unallocatedPercentageDiv.style.backgroundColor = '#e9f7ef';
            unallocatedPercentageDiv.style.borderColor = '#a7d7c5';
        } else if (currentTotalAllocatedPercentage > 100.009) {
            unallocatedPercentageDiv.textContent = `Superalocado: ${(currentTotalAllocatedPercentage - 100).toFixed(2)}% (R$${((currentTotalAllocatedPercentage - 100)/100 * totalBudget).toFixed(2)})`;
            unallocatedPercentageDiv.style.color = '#e74c3c';
            unallocatedPercentageDiv.style.backgroundColor = '#fdedec';
            unallocatedPercentageDiv.style.borderColor = '#f5b7b1';
        } else {
            unallocatedPercentageDiv.textContent = `Não alocado: ${unallocatedPercentageValue.toFixed(2)}% (R$${unallocatedAmount.toFixed(2)})`;
            unallocatedPercentageDiv.style.color = '#c09853';
            unallocatedPercentageDiv.style.backgroundColor = '#fdf7e3';
            unallocatedPercentageDiv.style.borderColor = '#f5e0a0';
        }
    }

    /** Converts RGB to HEX. */
    function rgbToHex(rgb) {
        if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
        let sep = rgb.indexOf(",") > -1 ? "," : " "; rgb = rgb.substr(4).split(")")[0].split(sep);
        let r = (+rgb[0]).toString(16), g = (+rgb[1]).toString(16), b = (+rgb[2]).toString(16);
        if (r.length == 1) r = "0" + r; if (g.length == 1) g = "0" + g; if (b.length == 1) b = "0" + b;
        return "#" + r + g + b;
    }

    // --- Unified Pointer Down for Resize Handles ---
    function onPointerDownResize(e) {
        if (e.type === 'touchstart') e.preventDefault();
        currentlyDraggedHandle = e.target;
        const sliceIndex = parseInt(currentlyDraggedHandle.dataset.sliceIndex);
        const currentSlice = slices[sliceIndex]; if (!currentSlice) return;
        currentSlice.percentage = (typeof currentSlice.percentage === 'number' && !isNaN(currentSlice.percentage)) ? currentSlice.percentage : 0;
        initialClientX = (e.type === 'touchstart') ? e.touches[0].clientX : e.clientX;
        totalSliderWidth = budgetSlider.offsetWidth;
        initialSlicePercentage = currentSlice.percentage;
        if (currentlyDraggedHandle.classList.contains('intermediate-resize-handle')) {
            const nextSlice = slices[sliceIndex + 1]; if (!nextSlice) return;
            nextSlice.percentage = (typeof nextSlice.percentage === 'number' && !isNaN(nextSlice.percentage)) ? nextSlice.percentage : 0;
            currentlyDraggedSliceData = { current: currentSlice, next: nextSlice };
            adjacentSlicePercentage = nextSlice.percentage;
            document.addEventListener('mousemove', onPointerMoveResizeIntermediate);
            document.addEventListener('touchmove', onPointerMoveResizeIntermediate, { passive: false });
        } else if (currentlyDraggedHandle.classList.contains('last-slice-resize-handle')) {
            currentlyDraggedSliceData = { current: currentSlice };
            document.addEventListener('mousemove', onPointerMoveResizeLast);
            document.addEventListener('touchmove', onPointerMoveResizeLast, { passive: false });
        }
        document.addEventListener('mouseup', onPointerUpResize);
        document.addEventListener('touchend', onPointerUpResize);
    }

    // --- Pointer Move for Intermediate Slice Resize ---
    function onPointerMoveResizeIntermediate(e) {
        if (!currentlyDraggedHandle || !currentlyDraggedSliceData || !currentlyDraggedSliceData.next) return;
        if (e.type === 'touchmove') e.preventDefault();
        const currentClientX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        const dx = currentClientX - initialClientX; const percentageChange = (dx / totalSliderWidth) * 100;
        let newCurrentSlicePercentage = initialSlicePercentage + percentageChange;
        let newAdjacentSlicePercentage = adjacentSlicePercentage - percentageChange;
        const combinedInitialPercentage = initialSlicePercentage + adjacentSlicePercentage;
        if (newCurrentSlicePercentage < MIN_SLICE_PERCENTAGE) {
            newCurrentSlicePercentage = MIN_SLICE_PERCENTAGE;
            newAdjacentSlicePercentage = combinedInitialPercentage - MIN_SLICE_PERCENTAGE;
        }
        if (newAdjacentSlicePercentage < MIN_SLICE_PERCENTAGE) {
            newAdjacentSlicePercentage = MIN_SLICE_PERCENTAGE;
            newCurrentSlicePercentage = combinedInitialPercentage - newAdjacentSlicePercentage;
        }
        newCurrentSlicePercentage = Math.max(0, newCurrentSlicePercentage);
        newAdjacentSlicePercentage = Math.max(0, newAdjacentSlicePercentage);
        currentlyDraggedSliceData.current.percentage = parseFloat(newCurrentSlicePercentage.toFixed(2));
        currentlyDraggedSliceData.next.percentage = parseFloat(newAdjacentSlicePercentage.toFixed(2));
        renderSlider(); renderTable();
    }

    // --- Pointer Move for Last Slice Resize ---
    function onPointerMoveResizeLast(e) {
        if (!currentlyDraggedHandle || !currentlyDraggedSliceData || currentlyDraggedSliceData.next) return;
        if (e.type === 'touchmove') e.preventDefault();
        const currentClientX = (e.type === 'touchmove') ? e.touches[0].clientX : e.clientX;
        const dx = currentClientX - initialClientX; const percentageChange = (dx / totalSliderWidth) * 100;
        let newCurrentSlicePercentage = initialSlicePercentage + percentageChange;
        newCurrentSlicePercentage = Math.max(MIN_SLICE_PERCENTAGE, newCurrentSlicePercentage);
        currentlyDraggedSliceData.current.percentage = parseFloat(newCurrentSlicePercentage.toFixed(2));
        renderSlider(); renderTable();
    }

    // --- Unified Pointer Up for All Resize Operations ---
    function onPointerUpResize() {
        if (!currentlyDraggedHandle) return;
        if (currentlyDraggedHandle.classList.contains('intermediate-resize-handle')) {
            document.removeEventListener('mousemove', onPointerMoveResizeIntermediate);
            document.removeEventListener('touchmove', onPointerMoveResizeIntermediate);
        } else if (currentlyDraggedHandle.classList.contains('last-slice-resize-handle')) {
            document.removeEventListener('mousemove', onPointerMoveResizeLast);
            document.removeEventListener('touchmove', onPointerMoveResizeLast);
        }
        document.removeEventListener('mouseup', onPointerUpResize);
        document.removeEventListener('touchend', onPointerUpResize);
        normalizePercentages(); renderApp(); // renderApp now calls saveCurrentWorkingState
        currentlyDraggedHandle = null; currentlyDraggedSliceData = null;
        initialClientX = 0; initialSlicePercentage = 0; adjacentSlicePercentage = 0;
    }

    /** Central function to re-render UI and save the current working state. */
    function renderApp() {
        renderSlider();
        renderTable();
        saveCurrentWorkingState(); // Save the active working set after any render
    }

    // Event Listeners Setup
    const commonAddSliceAction = () => {
        let initialNewPercentage = 5;
        const totalCurrentPercentage = slices.reduce((sum, s) => sum + ((typeof s.percentage === 'number' && !isNaN(s.percentage)) ? s.percentage : 0), 0);
        if (slices.length === 0) initialNewPercentage = 25;
        else if (totalCurrentPercentage + initialNewPercentage > 100 && totalCurrentPercentage <= 100) {
            initialNewPercentage = Math.max(0, 100 - totalCurrentPercentage);
        } else if (totalCurrentPercentage >= 100) initialNewPercentage = 0;
        addSlice('Nova Categoria', initialNewPercentage); // addSlice calls renderApp, which saves current working state
    };
    addSliceButton.addEventListener('click', commonAddSliceAction);
    addSliceTableButton.addEventListener('click', commonAddSliceAction);
    saveNewStateButton.addEventListener('click', handleSaveNewState);


    totalBudgetInput.addEventListener('change', updateTotalBudget);
    totalBudgetInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || totalBudgetInput.value === '') updateTotalBudget();
    });

    // Initial Load
    loadAllNamedStates(); // Load the list of named states for the sidebar
    loadCurrentWorkingState(); // Load the last active working set (or defaults)
    renderApp(); // Initial render of the loaded/default working set

    setTimeout(() => {
        totalSliderWidth = budgetSlider.offsetWidth;
        if (totalSliderWidth === 0) console.warn("Largura do slider não determinada.");
        if (slices.length > 0 && budgetSlider.innerHTML.trim() === '') renderApp();
    }, 100);
    window.addEventListener('resize', () => { totalSliderWidth = budgetSlider.offsetWidth; renderSlider(); });
});