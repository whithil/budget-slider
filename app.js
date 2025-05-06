document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const budgetSlider = document.getElementById('budgetSlider');
    const slicesTableBody = document.getElementById('slicesTableBody');
    const addSliceButton = document.getElementById('addSliceButton');
    const totalBudgetInput = document.getElementById('totalBudgetInput');
    const unallocatedPercentageDiv = document.getElementById('unallocatedPercentage');

    // Application State
    let slices = [];
    let totalBudget = parseFloat(totalBudgetInput.value) || 1000;
    let nextSliceId = 0;

    // Drag State Variables
    let currentlyDraggedHandle = null;
    let currentlyDraggedSliceData = null;
    let initialMouseX = 0;
    let initialSlicePercentage = 0;
    let adjacentSlicePercentage = 0;
    let totalSliderWidth = 0;

    const MIN_SLICE_PERCENTAGE = 0.5; // Minimum percentage a slice can be dragged to

    /**
     * Generates a random RGB color string.
     * @returns {string} CSS RGB color string
     */
    function generateRandomRGB() {
        const r = Math.floor(Math.random() * 220);
        const g = Math.floor(Math.random() * 220);
        const b = Math.floor(Math.random() * 220);
        return `rgb(${r}, ${g}, ${b})`;
    }

    /**
     * Saves the current application state to local storage.
     * Uses keys with '_v2_5' for this version.
     */
    function saveState() {
        localStorage.setItem('budgetSlices_v2_5', JSON.stringify(slices));
        localStorage.setItem('totalBudget_v2_5', totalBudget.toString());
    }

    /**
     * Loads application state from local storage.
     * Includes data sanitization for robustness.
     */
    function loadState() {
        const savedTotalBudget = localStorage.getItem('totalBudget_v2_5');
        if (savedTotalBudget) {
            totalBudget = parseFloat(savedTotalBudget);
            totalBudgetInput.value = totalBudget;
        }

        const savedSlices = localStorage.getItem('budgetSlices_v2_5');
        if (savedSlices) {
            try {
                let parsedSlices = JSON.parse(savedSlices);
                if (Array.isArray(parsedSlices)) {
                    let tempNextId = 0;
                    const seenIds = new Set();
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
                    nextSliceId = tempNextId;
                } else { slices = []; }
            } catch (e) {
                console.error("Erro ao carregar fatias do localStorage (JSON inválido):", e);
                slices = [];
            }
            if (slices.length === 0) { // Fallback if parsing failed or resulted in empty
                nextSliceId = 0;
                addSlice('Mercado', 25, generateRandomRGB(), false);
                addSlice('Contas Fixas', 20, generateRandomRGB(), false);
                addSlice('Lazer', 10, generateRandomRGB(), false);
            }
        } else { // No savedSlices, add default slices
            nextSliceId = 0;
            addSlice('Mercado', 25, generateRandomRGB(), false);
            addSlice('Contas Fixas', 20, generateRandomRGB(), false);
            addSlice('Lazer', 10, generateRandomRGB(), false);
        }
        normalizePercentages();
        renderApp();
    }

    /**
     * Adds a new slice to the budget.
     * @param {string} name - Initial name.
     * @param {number} percentage - Initial percentage.
     * @param {string} [color] - Optional color.
     * @param {boolean} [doRender=true] - Whether to re-render immediately.
     */
    function addSlice(name = 'Nova Categoria', percentage = 5, color = generateRandomRGB(), doRender = true) {
        percentage = Math.max(0, percentage);
        const newSlice = { id: nextSliceId++, name: `${name}`, percentage: percentage, color: color };
        slices.push(newSlice);
        if (doRender) { normalizePercentages(); renderApp(); }
    }

    /** Removes a slice by its ID. */
    function removeSlice(sliceId) {
        slices = slices.filter(slice => slice.id !== sliceId);
        normalizePercentages(); renderApp();
    }

    /** Updates the name of a slice. */
    function updateSliceName(sliceId, newName) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) { slice.name = newName; renderApp(); }
    }

    /** Updates the color of a slice. */
    function updateSliceColor(sliceId, newColor) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) { slice.color = newColor; renderApp(); }
    }

    /** Updates a slice's percentage based on a new amount from the table. */
    function updateSliceByAmount(sliceId, newAmount) {
        const slice = slices.find(s => s.id === sliceId);
        if (slice) {
            if (totalBudget > 0) {
                let newPercentage = (newAmount / totalBudget) * 100;
                slice.percentage = parseFloat(Math.max(0, newPercentage).toFixed(2));
            } else {
                slice.percentage = (newAmount > 0 && totalBudget <= 0) ? 0 : 0;
                if (newAmount > 0 && totalBudget <= 0) console.warn("Orçamento total é 0. Não é possível calcular a porcentagem da fatia com base no valor.");
            }
            normalizePercentages(); renderApp();
        }
    }

    /** Updates the total budget value. */
    function updateTotalBudget() {
        const newTotal = parseFloat(totalBudgetInput.value);
        totalBudget = (!isNaN(newTotal) && newTotal >= 0) ? newTotal : totalBudget;
        if (isNaN(newTotal) || newTotal < 0) totalBudgetInput.value = totalBudget;
        normalizePercentages(); renderApp();
    }

    /** Normalizes slice percentages. Ensures no slice is negative. If total > 100%, scales down. Allows total < 100%. */
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

    /** Renders the budget slider UI, including the unallocated slice. */
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

            if (index < slices.length - 1) {
                const resizeHandle = document.createElement('div');
                resizeHandle.className = 'resize-handle intermediate-resize-handle';
                resizeHandle.dataset.sliceIndex = index;
                sliceDiv.appendChild(resizeHandle);
                resizeHandle.addEventListener('mousedown', onMouseDownOnResizeHandle);
            }
            if (index === slices.length - 1 && slices.length > 0) {
                const lastResizeHandle = document.createElement('div');
                lastResizeHandle.className = 'resize-handle last-slice-resize-handle';
                lastResizeHandle.dataset.sliceIndex = index;
                sliceDiv.appendChild(lastResizeHandle);
                lastResizeHandle.addEventListener('mousedown', onMouseDownOnLastSliceResizeHandle);
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

    /** Renders the budget breakdown table UI. */
    function renderTable() {
        slicesTableBody.innerHTML = '';
        slices.forEach(slice => {
            const row = slicesTableBody.insertRow();
            row.dataset.id = slice.id;
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
            unallocatedPercentageDiv.textContent = `Superalocado em: ${(currentTotalAllocatedPercentage - 100).toFixed(2)}% (R$${((currentTotalAllocatedPercentage - 100)/100 * totalBudget).toFixed(2)})`;
            unallocatedPercentageDiv.style.color = '#e74c3c';
            unallocatedPercentageDiv.style.backgroundColor = '#fdedec';
            unallocatedPercentageDiv.style.borderColor = '#f5b7b1';
        } else { // unallocatedPercentageValue >= 0.01
            unallocatedPercentageDiv.textContent = `Não alocado: ${unallocatedPercentageValue.toFixed(2)}% (R$${unallocatedAmount.toFixed(2)})`;
            unallocatedPercentageDiv.style.color = '#c09853';
            unallocatedPercentageDiv.style.backgroundColor = '#fdf7e3';
            unallocatedPercentageDiv.style.borderColor = '#f5e0a0';
        }
    }

    /** Converts RGB to HEX. @param {string} rgb - RGB string. @returns {string} HEX string. */
    function rgbToHex(rgb) {
        if (!rgb || rgb.startsWith('#')) return rgb || '#000000';
        let sep = rgb.indexOf(",") > -1 ? "," : " "; rgb = rgb.substr(4).split(")")[0].split(sep);
        let r = (+rgb[0]).toString(16), g = (+rgb[1]).toString(16), b = (+rgb[2]).toString(16);
        if (r.length == 1) r = "0" + r; if (g.length == 1) g = "0" + g; if (b.length == 1) b = "0" + b;
        return "#" + r + g + b;
    }

    // --- Intermediate Slice Resize Handle Logic ---
    function onMouseDownOnResizeHandle(e) {
        e.preventDefault(); currentlyDraggedHandle = e.target;
        const sliceIndex = parseInt(currentlyDraggedHandle.dataset.sliceIndex);
        const currentSlice = slices[sliceIndex]; const nextSlice = slices[sliceIndex + 1];
        if (!currentSlice || !nextSlice) return;
        currentSlice.percentage = (typeof currentSlice.percentage === 'number' && !isNaN(currentSlice.percentage)) ? currentSlice.percentage : 0;
        nextSlice.percentage = (typeof nextSlice.percentage === 'number' && !isNaN(nextSlice.percentage)) ? nextSlice.percentage : 0;
        currentlyDraggedSliceData = { current: currentSlice, next: nextSlice };
        initialMouseX = e.clientX; totalSliderWidth = budgetSlider.offsetWidth;
        initialSlicePercentage = currentSlice.percentage; adjacentSlicePercentage = nextSlice.percentage;
        document.addEventListener('mousemove', onMouseMoveResize);
        document.addEventListener('mouseup', onMouseUpResizeCommon);
    }

    function onMouseMoveResize(e) {
        if (!currentlyDraggedHandle || !currentlyDraggedSliceData || !currentlyDraggedSliceData.next) return;
        e.preventDefault();
        const dx = e.clientX - initialMouseX; const percentageChange = (dx / totalSliderWidth) * 100;
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

    // --- Last Slice Resize Handle Logic ---
    function onMouseDownOnLastSliceResizeHandle(e) {
        e.preventDefault(); currentlyDraggedHandle = e.target;
        const sliceIndex = parseInt(currentlyDraggedHandle.dataset.sliceIndex);
        const currentSlice = slices[sliceIndex]; if (!currentSlice) return;
        currentSlice.percentage = (typeof currentSlice.percentage === 'number' && !isNaN(currentSlice.percentage)) ? currentSlice.percentage : 0;
        currentlyDraggedSliceData = { current: currentSlice };
        initialMouseX = e.clientX; totalSliderWidth = budgetSlider.offsetWidth;
        initialSlicePercentage = currentSlice.percentage;
        document.addEventListener('mousemove', onMouseMoveLastSliceResize);
        document.addEventListener('mouseup', onMouseUpResizeCommon);
    }

    function onMouseMoveLastSliceResize(e) {
        if (!currentlyDraggedHandle || !currentlyDraggedSliceData || currentlyDraggedSliceData.next) return;
        e.preventDefault();
        const dx = e.clientX - initialMouseX; const percentageChange = (dx / totalSliderWidth) * 100;
        let newCurrentSlicePercentage = initialSlicePercentage + percentageChange;
        newCurrentSlicePercentage = Math.max(MIN_SLICE_PERCENTAGE, newCurrentSlicePercentage);
        currentlyDraggedSliceData.current.percentage = parseFloat(newCurrentSlicePercentage.toFixed(2));
        renderSlider(); renderTable();
    }

    // --- Common Mouse Up for All Resize Operations ---
    function onMouseUpResizeCommon() {
        if (!currentlyDraggedHandle) return;
        if (currentlyDraggedHandle.classList.contains('last-slice-resize-handle')) {
            document.removeEventListener('mousemove', onMouseMoveLastSliceResize);
        } else {
            document.removeEventListener('mousemove', onMouseMoveResize);
        }
        document.removeEventListener('mouseup', onMouseUpResizeCommon);
        normalizePercentages(); renderApp();
        currentlyDraggedHandle = null; currentlyDraggedSliceData = null;
        initialMouseX = 0; initialSlicePercentage = 0; adjacentSlicePercentage = 0;
    }

    /** Central function to re-render UI and save state. */
    function renderApp() { renderSlider(); renderTable(); saveState(); }

    // Event Listeners Setup
    addSliceButton.addEventListener('click', () => {
        let initialNewPercentage = 5;
        const totalCurrentPercentage = slices.reduce((sum, s) => sum + ((typeof s.percentage === 'number' && !isNaN(s.percentage)) ? s.percentage : 0), 0);
        if (slices.length === 0) initialNewPercentage = 25;
        else if (totalCurrentPercentage + initialNewPercentage > 100 && totalCurrentPercentage <= 100) {
            initialNewPercentage = Math.max(0, 100 - totalCurrentPercentage);
        } else if (totalCurrentPercentage >= 100) initialNewPercentage = 0;
        addSlice('Nova Categoria', initialNewPercentage);
    });
    totalBudgetInput.addEventListener('change', updateTotalBudget);
    totalBudgetInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter' || e.keyCode === 13 || totalBudgetInput.value === '') updateTotalBudget();
    });

    // Initial Load
    loadState();
    setTimeout(() => {
        totalSliderWidth = budgetSlider.offsetWidth;
        if (totalSliderWidth === 0) console.warn("Largura do slider não determinada.");
        if (slices.length > 0 && budgetSlider.innerHTML.trim() === '') renderApp();
    }, 100);
    window.addEventListener('resize', () => { totalSliderWidth = budgetSlider.offsetWidth; renderSlider(); });
});