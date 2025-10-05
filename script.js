let currentStep = 0;
let steps = [];
let sig1 = [], sig2 = [], start1 = 0, start2 = 0;
let globalFixedRange = null;

function parseSignal(str) {
    return str.split(',').map(v => parseFloat(v.trim())).filter(v => !isNaN(v));
}

function startConvolution() {
    sig1 = parseSignal(document.getElementById('signal1').value);
    sig2 = parseSignal(document.getElementById('signal2').value);
    start1 = parseInt(document.getElementById('start1').value) || 0;
    start2 = parseInt(document.getElementById('start2').value) || 0;

    if (sig1.length === 0 || sig2.length === 0) {
        alert('Please enter valid signals!');
        return;
    }

    generateSteps();
    document.getElementById('setupSection').classList.add('hidden');
    document.getElementById('demoSection').classList.remove('hidden');
    
    const info = document.getElementById('signalInfo');
    const outputLength = sig1.length + sig2.length - 1;
    const end1 = start1 + sig1.length - 1;
    const end2 = start2 + sig2.length - 1;
    const outputStart = start1 + start2;
    const outputEnd = end1 + end2;
    
    info.innerHTML = `
        <strong>x[n]:</strong> {${sig1.join(', ')}} from n=${start1} to n=${end1}<br>
        <strong>h[n]:</strong> {${sig2.join(', ')}} from n=${start2} to n=${end2}<br>
        <strong>Output:</strong> ${outputLength} samples from n=${outputStart} to n=${outputEnd}
    `;
    
    renderStep(0);
}

function generateSteps() {
    steps = [];
    const N1 = sig1.length;
    const N2 = sig2.length;
    const end1 = start1 + N1 - 1;
    const end2 = start2 + N2 - 1;
    const outputStart = start1 + start2;
    const outputEnd = end1 + end2;
    const outputLength = N1 + N2 - 1;

    const allIndices = [];
    for (let i = 0; i < N1; i++) allIndices.push(start1 + i);
    for (let i = 0; i < N2; i++) allIndices.push(start2 + i);
    
    const flippedStart = -end2;
    const flippedEnd = -start2;
    for (let i = flippedStart; i <= flippedEnd; i++) allIndices.push(i);
    
    for (let n = outputStart; n <= outputEnd; n++) {
        for (let i = 0; i < N2; i++) {
            allIndices.push(n - start2 - i);
        }
    }
    
    const minIdx = Math.min(...allIndices);
    const maxIdx = Math.max(...allIndices);
    const range = Math.max(Math.abs(minIdx), Math.abs(maxIdx)) + 3;
    
    const allConvolutionResults = [];
    for (let n = outputStart; n <= outputEnd; n++) {
        let sum = 0;
        for (let k = start1; k <= end1; k++) {
            const h_idx = n - k;
            if (h_idx >= start2 && h_idx <= end2) {
                const x_val = sig1[k - start1];
                const h_val = sig2[h_idx - start2];
                sum += x_val * h_val;
            }
        }
        allConvolutionResults.push(Math.abs(sum));
    }
    
    const maxConvolutionVal = Math.max(...allConvolutionResults);
    const maxSignalVal = Math.max(...sig1.map(v => Math.abs(v)), ...sig2.map(v => Math.abs(v)));
    const globalMaxVal = Math.max(maxConvolutionVal, maxSignalVal);
    
    globalFixedRange = { min: -range, max: range, maxVal: globalMaxVal };

    steps.push({
        title: "Step 0: Original Signals",
        description: `x[n] from n=${start1} to n=${end1}, h[n] from n=${start2} to n=${end2}`,
        graphs: [
            {
                title: "h[n] (red)",
                bars: sig2.map((v, i) => ({n: start2 + i, val: v})),
                type: 'flipped'
            },
            {
                title: "x[n] (blue)",
                bars: sig1.map((v, i) => ({n: start1 + i, val: v})),
                type: 'original'
            }
        ]
    });

    const flippedSig2 = [...sig2].reverse();
    steps.push({
        title: "Step 1: Flip h[k] → h[-k]",
        description: `Flipping reverses the signal around the n=0 axis.`,
        graphs: [
            {
                title: "h[-k] (red - flipped)",
                bars: flippedSig2.map((v, i) => ({n: -start2 - i, val: v})),
                type: 'flipped'
            },
            {
                title: "h[k] (red - original)",
                bars: sig2.map((v, i) => ({n: start2 + i, val: v})),
                type: 'flipped'
            }
        ],
        calculation: `Original h[n] spans: n=${start2} to n=${end2}<br>` +
                   `After flipping h[-k], it spans: k=${flippedStart} to k=${flippedEnd}`
    });

    const result = [];
    const partialResults = [];
    
    const initialShiftedH = flippedSig2.map((v, i) => ({
        n: outputStart - start2 - i,
        val: v
    }));
    
    steps.push({
        title: `Step 2: Position h[-k] for First Output`,
        description: `The flipped signal h[-k] shifts to position n=${outputStart} to compute y[${outputStart}].<br>` +
                   `Initial shift position = n₁ + n₂ = ${start1} + ${start2} = ${outputStart}`,
        graphs: [
            {
                title: "h[-k] (red - before shifting)",
                bars: flippedSig2.map((v, i) => ({n: -start2 - i, val: v})),
                type: 'flipped'
            },
            {
                title: `h[${outputStart}-k] (red - after shifting to n=${outputStart})`,
                bars: initialShiftedH,
                type: 'flipped'
            }
        ],
        calculation: `Starting position for convolution:<br>` +
                   `Output begins at n = n₁ + n₂ = ${start1} + ${start2} = ${outputStart}`
    });
    
    for (let n = outputStart; n <= outputEnd; n++) {
        let sum = 0;
        let calcText = [];

        for (let k = start1; k <= end1; k++) {
            const h_idx = n - k;
            
            if (h_idx >= start2 && h_idx <= end2) {
                const x_val = sig1[k - start1];
                const h_val = sig2[h_idx - start2];
                sum += x_val * h_val;
                calcText.push(`x[${k}]·h[${h_idx}]=${x_val}·${h_val}`);
            }
        }

        result.push(sum);
        partialResults.push({n: n, val: sum});

        const shiftedH = flippedSig2.map((v, i) => ({
            n: n - start2 - i,
            val: v
        }));

        steps.push({
            title: `Step ${n - outputStart + 3}: n=${n}`,
            description: `Shift h[-k] to h[${n}-k], computing y[${n}]`,
            graphs: [
                {
                    title: "x[k] (blue)",
                    bars: sig1.map((v, i) => ({n: start1 + i, val: v})),
                    type: 'original'
                },
                {
                    title: `h[${n}-k] (red)`,
                    bars: shiftedH,
                    type: 'flipped'
                }
            ],
            overlayResults: [...partialResults],
            sequence: `y[n] so far: {${partialResults.map(p => p.val).join(', ')}}`,
            calculation: calcText.length > 0 ? 
                `y[${n}] = ${calcText.join(' + ')} = <span class='highlight'>${sum}</span>` :
                `y[${n}] = <span class='highlight'>0</span> (no overlap)`,
            result: `y[${n}] = ${sum}`
        });
    }

    steps.push({
        title: "Final Result",
        description: `Complete convolution y[n] = x[n] * h[n]`,
        graphs: [{
            title: `y[n] (green)`,
            bars: result.map((v, i) => ({n: outputStart + i, val: v})),
            type: 'result'
        }],
        result: `y[n] = {${result.join(', ')}} from n=${outputStart} to n=${outputEnd}`
    });
}

function renderGraph(graph, container, globalRange, isSingleGraph = false, overlayResults = null) {
    const wrapper = document.createElement('div');
    wrapper.className = 'graph-wrapper';
    
    if (graph.title) {
        const title = document.createElement('div');
        title.className = 'graph-title';
        title.textContent = graph.title;
        wrapper.appendChild(title);
    }

    const graphDiv = document.createElement('div');
    graphDiv.className = 'graph';

    const minN = globalRange.min;
    const maxN = globalRange.max;
    const range = maxN - minN + 1;
    
    const availableWidth = window.innerWidth - 60;
    const minSpacing = 20;
    const maxSpacing = 50;
    let spacing = Math.max(minSpacing, Math.min(maxSpacing, availableWidth / (range + 1)));

    const axisX = document.createElement('div');
    axisX.className = 'axis axis-x';
    graphDiv.appendChild(axisX);

    const axisY = document.createElement('div');
    axisY.className = 'axis axis-y';
    axisY.style.left = ((0 - minN) * spacing + spacing/2) + 'px';
    const yLabel = document.createElement('div');
    yLabel.className = 'axis-y-label';
    yLabel.textContent = 'n=0';
    axisY.appendChild(yLabel);
    graphDiv.appendChild(axisY);

    for (let i = minN; i <= maxN; i++) {
        const tick = document.createElement('div');
        tick.className = 'tick';
        tick.style.left = ((i - minN) * spacing + spacing/2) + 'px';
        graphDiv.appendChild(tick);

        const tickLabel = document.createElement('div');
        tickLabel.className = 'tick-label';
        tickLabel.textContent = i;
        tickLabel.style.left = ((i - minN) * spacing + spacing/2) + 'px';
        graphDiv.appendChild(tickLabel);
    }

    const maxVal = globalRange.maxVal;

    graph.bars.forEach(bar => {
        const x = (bar.n - minN) * spacing + spacing/2;
        const height = Math.abs(bar.val) * (50 / maxVal);
        
        const stem = document.createElement('div');
        stem.className = 'stem ' + graph.type;
        stem.style.left = (x - 1) + 'px';
        stem.style.height = height + 'px';
        if (bar.val >= 0) {
            stem.style.bottom = '70px';
        } else {
            stem.style.bottom = (70 - height) + 'px';
        }
        graphDiv.appendChild(stem);

        const impulse = document.createElement('div');
        impulse.className = 'impulse ' + graph.type;
        impulse.style.left = x + 'px';
        if (bar.val >= 0) {
            impulse.style.bottom = (70 + height) + 'px';
        } else {
            impulse.style.bottom = (70 - height) + 'px';
        }
        graphDiv.appendChild(impulse);

        const value = document.createElement('div');
        value.className = 'impulse-value';
        value.textContent = bar.val;
        value.style.left = x + 'px';
        if (bar.val >= 0) {
            value.style.bottom = (70 + height + 10) + 'px';
        } else {
            value.style.bottom = (70 - height - 15) + 'px';
        }
        graphDiv.appendChild(value);
    });

    if (overlayResults && overlayResults.length > 0) {
        const overlayDiv = document.createElement('div');
        overlayDiv.className = 'overlay-results';
        
        overlayResults.forEach(result => {
            const x = (result.n - minN) * spacing + spacing/2;
            const height = Math.abs(result.val) * (50 / maxVal);
            
            const stem = document.createElement('div');
            stem.className = 'overlay-stem';
            stem.style.left = (x - 1.5) + 'px';
            stem.style.height = height + 'px';
            if (result.val >= 0) {
                stem.style.bottom = '70px';
            } else {
                stem.style.bottom = (70 - height) + 'px';
            }
            overlayDiv.appendChild(stem);
            
            const impulse = document.createElement('div');
            impulse.className = 'overlay-impulse';
            impulse.style.left = x + 'px';
            if (result.val >= 0) {
                impulse.style.bottom = (70 + height) + 'px';
            } else {
                impulse.style.bottom = (70 - height) + 'px';
            }
            overlayDiv.appendChild(impulse);
        });
        
        graphDiv.appendChild(overlayDiv);
    }

    wrapper.appendChild(graphDiv);
    container.appendChild(wrapper);
}

function renderStep(stepIndex) {
    const step = steps[stepIndex];
    const content = document.getElementById('content');
    content.innerHTML = '';

    const stepDiv = document.createElement('div');
    stepDiv.className = 'step-container';

    const stepHeader = document.createElement('div');
    stepHeader.className = 'step-header';

    const title = document.createElement('div');
    title.className = 'step-title';
    title.textContent = step.title;
    stepHeader.appendChild(title);

    const desc = document.createElement('div');
    desc.className = 'step-desc';
    desc.innerHTML = step.description;
    stepHeader.appendChild(desc);

    if (step.sequence) {
        const seq = document.createElement('div');
        seq.className = 'mini-sequence';
        seq.innerHTML = step.sequence;
        stepHeader.appendChild(seq);
    }

    stepDiv.appendChild(stepHeader);

    const graphsArea = document.createElement('div');
    graphsArea.className = 'graphs-area';

    const isSingleGraph = step.graphs.length === 1;
    const graphsContainer = document.createElement('div');
    graphsContainer.className = isSingleGraph ? 'graphs-container single-graph' : 'graphs-container two-graphs';

    const minN = globalFixedRange.min;
    const maxN = globalFixedRange.max;
    const maxVal = globalFixedRange.maxVal;
    const globalRange = { min: minN, max: maxN, maxVal: maxVal };

    step.graphs.forEach((graph, index) => {
        const overlayData = (index === 1 && step.overlayResults) ? step.overlayResults : null;
        renderGraph(graph, graphsContainer, globalRange, isSingleGraph, overlayData);
    });

    graphsArea.appendChild(graphsContainer);
    stepDiv.appendChild(graphsArea);

    if (step.calculation || step.result) {
        const stepFooter = document.createElement('div');
        stepFooter.className = 'step-footer';

        if (step.calculation) {
            const calc = document.createElement('div');
            calc.className = 'calculation';
            calc.innerHTML = '<strong>Calculation:</strong> ' + step.calculation;
            stepFooter.appendChild(calc);
        }

        if (step.result) {
            const result = document.createElement('div');
            result.className = 'result-box';
            result.innerHTML = '<strong>Result:</strong> ' + step.result;
            stepFooter.appendChild(result);
        }

        stepDiv.appendChild(stepFooter);
    }

    content.appendChild(stepDiv);

    document.getElementById('prevBtn').disabled = stepIndex === 0;
    document.getElementById('nextBtn').disabled = stepIndex === steps.length - 1;
}

function changeStep(delta) {
    currentStep = Math.max(0, Math.min(steps.length - 1, currentStep + delta));
    renderStep(currentStep);
}

function resetDemo() {
    currentStep = 0;
    document.getElementById('setupSection').classList.remove('hidden');
    document.getElementById('demoSection').classList.add('hidden');
}