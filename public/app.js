let currentRequestId = null;
let availableProviders = [];
let providerModels = {};

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('researchForm');
    const loadingDiv = document.getElementById('loading');
    const resultsDiv = document.getElementById('results');
    
    form.addEventListener('submit', handleSubmit);
    setupNavigation();
    setupTabs();
    setupScoreSliders();
    setupEvaluation();
    setupApiTesting();
    setupAutoAnalysis();
    loadHistory();
    fetchAvailableProviders();
    updateApiStatus();
});

async function handleSubmit(e) {
    e.preventDefault();
    
    const prompt = document.getElementById('prompt').value;
    const evaluationInstructions = document.getElementById('evaluationInstructions').value;
    const files = document.getElementById('files').files;
    
    const formData = new FormData();
    formData.append('prompt', prompt);
    
    // Add evaluation instructions if provided
    if (evaluationInstructions && evaluationInstructions.trim()) {
        formData.append('evaluationInstructions', evaluationInstructions.trim());
    }
    
    // Collect selected providers and their models
    const selectedProviders = [];
    const modelSelections = {};
    
    availableProviders.forEach(provider => {
        const checkbox = document.getElementById(`provider-checkbox-${provider}`);
        const modelSelect = document.getElementById(`research-model-${provider}`);
        
        if (checkbox && checkbox.checked) {
            selectedProviders.push(provider);
            if (modelSelect && modelSelect.value) {
                modelSelections[provider] = modelSelect.value;
            }
        }
    });
    
    if (selectedProviders.length === 0) {
        showError('Please select at least one provider');
        return;
    }
    
    formData.append('providers', JSON.stringify(selectedProviders));
    
    if (Object.keys(modelSelections).length > 0) {
        formData.append('models', JSON.stringify(modelSelections));
    }
    
    // Add files to FormData
    for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
    }
    
    // Log file info for debugging
    if (files.length > 0) {
        console.log(`Uploading ${files.length} file(s):`);
        for (let i = 0; i < files.length; i++) {
            console.log(`- ${files[i].name} (${files[i].type || 'unknown type'})`);
        }
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/research', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to submit research');
        }
        
        const { requestId } = await response.json();
        currentRequestId = requestId;
        
        await pollForResults(requestId);
        
    } catch (error) {
        showError(error.message);
    }
}

async function pollForResults(requestId) {
    const maxAttempts = 60;
    let attempts = 0;
    
    const poll = async () => {
        try {
            const response = await fetch(`/api/research/${requestId}`);
            if (!response.ok) throw new Error('Failed to fetch results');
            
            const comparison = await response.json();
            
            updateProgress(comparison);
            
            const expectedResponses = comparison.responses.length;
            const allResponsesReceived = comparison.responses.filter(r => r.content || r.error).length === expectedResponses;
            
            if (allResponsesReceived || attempts >= maxAttempts) {
                hideLoading();
                displayResults(comparison);
                loadHistory();
            } else {
                attempts++;
                setTimeout(poll, 2000);
            }
        } catch (error) {
            hideLoading();
            showError(error.message);
        }
    };
    
    poll();
}

function renderResponseContent(response) {
    if (response.error) {
        return `<div class="error-content">${response.error}</div>`;
    } else if (response.content) {
        try {
            const markdownHtml = marked.parse(response.content);
            return DOMPurify.sanitize(markdownHtml);
        } catch (error) {
            console.error('Error parsing markdown:', error);
            return `<pre>${response.content}</pre>`;
        }
    } else {
        return '<div class="no-content">No response received</div>';
    }
}

function displayResults(comparison) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.style.display = 'block';
    
    // Display evaluation instructions if they exist
    if (comparison.evaluationInstructions) {
        const instructionsDiv = document.createElement('div');
        instructionsDiv.className = 'evaluation-instructions-display';
        instructionsDiv.innerHTML = `
            <h3>Evaluation Criteria Used:</h3>
            <p>${comparison.evaluationInstructions}</p>
        `;
        
        // Insert at the beginning of results section
        const firstChild = resultsDiv.firstElementChild;
        if (firstChild && !resultsDiv.querySelector('.evaluation-instructions-display')) {
            resultsDiv.insertBefore(instructionsDiv, firstChild.nextSibling);
        }
    }
    
    displaySideBySide(comparison);
    setupIndividualView(comparison);
    displayEvaluations(comparison);
}

function displaySideBySide(comparison) {
    const grid = document.querySelector('.responses-grid');
    grid.innerHTML = '';
    
    comparison.responses.forEach(response => {
        const card = document.createElement('div');
        card.className = 'response-card';
        
        const statusIcon = response.error ? 'L' : '';
        
        card.innerHTML = `
            <h3>${response.provider} ${statusIcon}</h3>
            ${response.model ? `<div class="response-model">Model: ${response.model}</div>` : ''}
            <div class="response-content">
                ${renderResponseContent(response)}
            </div>
        `;
        
        grid.appendChild(card);
    });
}

function setupIndividualView(comparison) {
    const select = document.getElementById('providerSelect');
    const contentDiv = document.querySelector('.individual-response');
    
    select.innerHTML = '<option value="">Select a provider</option>';
    
    comparison.responses.forEach(response => {
        const option = document.createElement('option');
        option.value = response.provider;
        option.textContent = response.provider;
        select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
        const provider = e.target.value;
        const response = comparison.responses.find(r => r.provider === provider);
        
        if (response) {
            contentDiv.innerHTML = `
                <h3>${response.provider}</h3>
                ${response.model ? `<div class="response-model">Model: ${response.model}</div>` : ''}
                <div class="response-content">
                    ${renderResponseContent(response)}
                </div>
            `;
        } else {
            contentDiv.innerHTML = '';
        }
    });
}

function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;
            
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId).classList.add('active');
        });
    });
}

function setupScoreSliders() {
    const sliders = document.querySelectorAll('input[type="range"]');
    
    sliders.forEach(slider => {
        const valueSpan = slider.nextElementSibling;
        
        slider.addEventListener('input', () => {
            valueSpan.textContent = slider.value;
        });
    });
}

function setupEvaluation() {
    // Legacy function - keeping for compatibility
}

function setupAutoAnalysis() {
    const analyzeBtn = document.getElementById('analyzeResponses');
    
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            if (!currentRequestId) {
                showError('No research to analyze');
                return;
            }
            
            await performAutoAnalysis(currentRequestId);
        });
    }
}

async function performAutoAnalysis(requestId) {
    const analyzeBtn = document.getElementById('analyzeResponses');
    const loadingDiv = document.getElementById('analysisLoading');
    const resultsDiv = document.getElementById('analysisResults');
    const contentDiv = document.getElementById('analysisContent');
    const metricsDiv = document.getElementById('comparisonMetrics');
    const recommendationDiv = document.getElementById('recommendationContent');
    
    // Show loading state
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';
    resultsDiv.style.display = 'block';
    loadingDiv.style.display = 'flex';
    contentDiv.innerHTML = '';
    
    try {
        const response = await fetch(`/api/research/${requestId}/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) throw new Error('Failed to analyze responses');
        
        const analysis = await response.json();
        
        // Hide loading
        loadingDiv.style.display = 'none';
        
        // Display results
        displayAnalysisResults(analysis, contentDiv, metricsDiv, recommendationDiv);
        
    } catch (error) {
        loadingDiv.style.display = 'none';
        showError(error.message);
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Analyze Differences';
    }
}

function displayAnalysisResults(analysis, contentDiv, metricsDiv, recommendationDiv) {
    // Display detailed analysis
    if (analysis.analysis) {
        try {
            const analysisHtml = marked.parse(analysis.analysis);
            contentDiv.innerHTML = DOMPurify.sanitize(analysisHtml);
        } catch (error) {
            contentDiv.innerHTML = `<pre>${analysis.analysis}</pre>`;
        }
    } else if (analysis.error) {
        contentDiv.innerHTML = `<div class="error-content">Analysis failed: ${analysis.error}</div>`;
    }
    
    // Display metrics
    if (analysis.metrics) {
        displayMetrics(analysis.metrics, metricsDiv);
    }
    
    // Display recommendation
    if (analysis.recommendation) {
        try {
            const recommendationHtml = marked.parse(analysis.recommendation);
            recommendationDiv.innerHTML = DOMPurify.sanitize(recommendationHtml);
        } catch (error) {
            recommendationDiv.innerHTML = `<pre>${analysis.recommendation}</pre>`;
        }
    }
}

function displayMetrics(metrics, metricsDiv) {
    metricsDiv.innerHTML = '';
    
    if (metrics.lengthComparison && metrics.lengthComparison.length > 0) {
        // Word count comparison
        const longestResponse = metrics.lengthComparison[0];
        const wordCountCard = document.createElement('div');
        wordCountCard.className = 'metric-card';
        wordCountCard.innerHTML = `
            <div class="metric-label">Most Comprehensive</div>
            <div class="metric-value">${longestResponse.wordCount}</div>
            <div class="metric-provider">${longestResponse.provider} (${longestResponse.wordCount} words)</div>
        `;
        metricsDiv.appendChild(wordCountCard);
        
        // Structure analysis
        const structuredResponses = metrics.structureAnalysis?.filter(r => r.hasHeaders || r.hasList) || [];
        if (structuredResponses.length > 0) {
            const bestStructured = structuredResponses.reduce((best, current) => {
                const bestScore = (best.hasHeaders ? 1 : 0) + (best.hasList ? 1 : 0) + (best.hasCodeBlocks ? 1 : 0) + (best.hasLinks ? 1 : 0);
                const currentScore = (current.hasHeaders ? 1 : 0) + (current.hasList ? 1 : 0) + (current.hasCodeBlocks ? 1 : 0) + (current.hasLinks ? 1 : 0);
                return currentScore > bestScore ? current : best;
            });
            
            const structureCard = document.createElement('div');
            structureCard.className = 'metric-card';
            structureCard.innerHTML = `
                <div class="metric-label">Best Structured</div>
                <div class="metric-value">✓</div>
                <div class="metric-provider">${bestStructured.provider}</div>
            `;
            metricsDiv.appendChild(structureCard);
        }
        
        // Response count
        const countCard = document.createElement('div');
        countCard.className = 'metric-card';
        countCard.innerHTML = `
            <div class="metric-label">Responses Analyzed</div>
            <div class="metric-value">${metrics.lengthComparison.length}</div>
            <div class="metric-provider">Total successful responses</div>
        `;
        metricsDiv.appendChild(countCard);
    }
}

function displayEvaluations(comparison) {
    // Auto-analysis replaces manual evaluations
    // This function is kept for compatibility but does nothing
}

async function loadHistory() {
    try {
        const response = await fetch('/api/research');
        if (!response.ok) throw new Error('Failed to load history');
        
        const comparisons = await response.json();
        const historyList = document.getElementById('history-list');
        
        historyList.innerHTML = '';
        
        comparisons.forEach(comp => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.innerHTML = `
                <strong>Request ID:</strong> ${comp.requestId}<br>
                <strong>Responses:</strong> ${comp.responses.length}<br>
                ${comp.preferredResponse ? `<strong>Preferred:</strong> ${comp.preferredResponse}` : ''}
            `;
            
            item.addEventListener('click', () => {
                currentRequestId = comp.requestId;
                displayResults(comp);
                resultsDiv.scrollIntoView({ behavior: 'smooth' });
            });
            
            historyList.appendChild(item);
        });
        
    } catch (error) {
        console.error('Failed to load history:', error);
    }
}

function showLoading() {
    document.getElementById('loading').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    resetProgress();
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    
    document.querySelector('.container').insertBefore(errorDiv, document.querySelector('.input-section'));
    
    setTimeout(() => errorDiv.remove(), 5000);
}

function resetProgress() {
    // Get selected providers for this research
    const selectedProviders = [];
    const allProviders = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];
    
    allProviders.forEach(provider => {
        const checkbox = document.getElementById(`provider-checkbox-${provider}`);
        if (checkbox && checkbox.checked && !checkbox.disabled) {
            selectedProviders.push(provider);
        }
    });
    
    allProviders.forEach(provider => {
        const statusDiv = document.getElementById(`status-${provider}`);
        if (statusDiv) {
            if (selectedProviders.includes(provider)) {
                statusDiv.style.display = 'flex';
                statusDiv.className = 'provider-status';
                statusDiv.querySelector('.status-icon').textContent = '⏳';
                statusDiv.querySelector('.status-text').textContent = 'Waiting...';
            } else {
                statusDiv.style.display = 'none';
            }
        }
    });
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.textContent = `0/${selectedProviders.length} completed`;
}

function updateProgress(comparison) {
    let completed = 0;
    const total = comparison.responses.length;
    const activeProviders = comparison.responses.map(r => r.provider);
    
    // Hide all status divs first
    const allProviders = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];
    allProviders.forEach(provider => {
        const statusDiv = document.getElementById(`status-${provider}`);
        if (statusDiv) {
            if (activeProviders.includes(provider)) {
                statusDiv.style.display = 'flex';
            } else {
                statusDiv.style.display = 'none';
            }
        }
    });
    
    comparison.responses.forEach(response => {
        const statusDiv = document.getElementById(`status-${response.provider}`);
        if (statusDiv) {
            if (response.content || response.error) {
                completed++;
                if (response.error) {
                    statusDiv.className = 'provider-status error';
                    statusDiv.querySelector('.status-icon').textContent = '❌';
                    statusDiv.querySelector('.status-text').textContent = 'Error';
                } else {
                    statusDiv.className = 'provider-status success';
                    statusDiv.querySelector('.status-icon').textContent = '✅';
                    statusDiv.querySelector('.status-text').textContent = 'Complete';
                }
            } else {
                statusDiv.className = 'provider-status pending';
                statusDiv.querySelector('.status-icon').textContent = '⏳';
                statusDiv.querySelector('.status-text').textContent = 'Processing...';
            }
        }
    });
    
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    if (progressFill) progressFill.style.width = `${(completed / total) * 100}%`;
    if (progressText) progressText.textContent = `${completed}/${total} completed`;
}

async function fetchAvailableProviders() {
    try {
        const response = await fetch('/api/providers');
        if (response.ok) {
            const data = await response.json();
            availableProviders = data.providers;
            providerModels = data.models;
            updateActiveProvidersInfo();
            populateModelSelects();
        }
    } catch (error) {
        console.error('Failed to fetch providers:', error);
        availableProviders = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];
    }
}

function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.section');
    
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const sectionId = btn.dataset.section;
            
            navBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(`${sectionId}-section`).classList.add('active');
        });
    });
}

function setupApiTesting() {
    const testBtns = document.querySelectorAll('.test-btn');
    
    testBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const provider = btn.dataset.provider;
            await testApiConnection(provider);
        });
    });
}

async function testApiConnection(provider) {
    const btn = document.querySelector(`[data-provider="${provider}"].test-btn`);
    const resultDiv = document.getElementById(`test-result-${provider}`);
    const statusIndicator = document.getElementById(`api-status-${provider}`);
    const statusText = document.getElementById(`api-text-${provider}`);
    const apiCard = document.querySelector(`[data-provider="${provider}"].api-card`);
    const modelSelect = document.getElementById(`model-${provider}`);
    
    btn.disabled = true;
    btn.textContent = 'Testing...';
    resultDiv.className = 'test-result';
    resultDiv.style.display = 'none';
    
    try {
        const requestBody = {};
        if (modelSelect && modelSelect.value) {
            requestBody.model = modelSelect.value;
        }
        
        const response = await fetch(`/api/test/${provider}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });
        
        const result = await response.json();
        
        if (result.success) {
            statusIndicator.textContent = '✅';
            statusText.textContent = 'Available';
            apiCard.className = 'api-card available';
            resultDiv.className = 'test-result success';
            resultDiv.textContent = result.message;
        } else {
            statusIndicator.textContent = '❌';
            statusText.textContent = result.error || 'Error';
            apiCard.className = 'api-card error';
            resultDiv.className = 'test-result error';
            resultDiv.textContent = result.message || 'Connection failed';
        }
        
        resultDiv.style.display = 'block';
        
    } catch (error) {
        statusIndicator.textContent = '❌';
        statusText.textContent = 'Connection Error';
        apiCard.className = 'api-card error';
        resultDiv.className = 'test-result error';
        resultDiv.textContent = `Failed to test connection: ${error.message}`;
        resultDiv.style.display = 'block';
    }
    
    btn.disabled = false;
    btn.textContent = 'Test Connection';
}

function updateApiStatus() {
    const allProviders = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];
    
    allProviders.forEach(provider => {
        const statusIndicator = document.getElementById(`api-status-${provider}`);
        const statusText = document.getElementById(`api-text-${provider}`);
        const apiCard = document.querySelector(`[data-provider="${provider}"].api-card`);
        
        if (availableProviders.includes(provider)) {
            statusIndicator.textContent = '🟡';
            statusText.textContent = 'Configured (Not Tested)';
            apiCard.className = 'api-card';
        } else {
            statusIndicator.textContent = '⚪';
            statusText.textContent = 'Not Configured';
            apiCard.className = 'api-card';
        }
    });
}

function updateActiveProvidersInfo() {
    const infoDiv = document.getElementById('activeProvidersInfo');
    
    if (availableProviders.length === 0) {
        infoDiv.className = 'active-providers-info warning';
        infoDiv.innerHTML = '⚠️ <strong>No API keys configured.</strong> Please configure at least one API key to use the research comparison feature.';
    } else if (availableProviders.length === 1) {
        infoDiv.className = 'active-providers-info warning';
        infoDiv.innerHTML = `⚠️ <strong>Only ${availableProviders[0]} is configured.</strong> For meaningful comparisons, configure multiple providers.`;
    } else {
        infoDiv.className = 'active-providers-info';
        infoDiv.innerHTML = `✅ <strong>${availableProviders.length} providers configured:</strong> ${availableProviders.join(', ')}`;
    }
}

function populateModelSelects() {
    const allProviders = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];
    
    // Populate configuration section model selects
    allProviders.forEach(provider => {
        const select = document.getElementById(`model-${provider}`);
        if (select && providerModels[provider]) {
            select.innerHTML = providerModels[provider].map(model => 
                `<option value="${model}">${model}</option>`
            ).join('');
        }
    });
    
    // Populate research section provider selection
    const providerGrid = document.getElementById('providerSelectionGrid');
    providerGrid.innerHTML = '';
    
    allProviders.forEach(provider => {
        const isAvailable = availableProviders.includes(provider);
        const models = providerModels[provider] || [];
        
        const item = document.createElement('div');
        item.className = `provider-selection-item ${isAvailable ? '' : 'disabled'}`;
        item.innerHTML = `
            <div class="provider-checkbox-container">
                <input type="checkbox" 
                       id="provider-checkbox-${provider}" 
                       class="provider-checkbox" 
                       ${isAvailable ? '' : 'disabled'}
                       ${isAvailable ? 'checked' : ''}>
                <label for="provider-checkbox-${provider}" class="provider-label">${provider}</label>
                <span class="provider-status-badge ${isAvailable ? 'available' : 'unavailable'}">
                    ${isAvailable ? 'Available' : 'Not Configured'}
                </span>
            </div>
            <div class="model-selection-container">
                <label for="research-model-${provider}">Model:</label>
                <select id="research-model-${provider}" ${isAvailable ? '' : 'disabled'}>
                    ${models.map(model => 
                        `<option value="${model}">${model}</option>`
                    ).join('')}
                </select>
            </div>
        `;
        
        providerGrid.appendChild(item);
    });
    
    // Add event listeners for checkbox changes
    allProviders.forEach(provider => {
        const checkbox = document.getElementById(`provider-checkbox-${provider}`);
        const item = document.querySelector(`[data-provider="${provider}"]`);
        
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                const parentItem = checkbox.closest('.provider-selection-item');
                if (checkbox.checked) {
                    parentItem.classList.add('selected');
                } else {
                    parentItem.classList.remove('selected');
                }
                updateSelectedProvidersInfo();
            });
            
            // Trigger initial state
            if (checkbox.checked) {
                checkbox.closest('.provider-selection-item').classList.add('selected');
            }
        }
    });
    
    updateSelectedProvidersInfo();
}

function updateSelectedProvidersInfo() {
    const selectedProviders = [];
    const allProviders = ['ChatGPT', 'Claude', 'Perplexity', 'Gemini'];
    
    allProviders.forEach(provider => {
        const checkbox = document.getElementById(`provider-checkbox-${provider}`);
        if (checkbox && checkbox.checked && !checkbox.disabled) {
            selectedProviders.push(provider);
        }
    });
    
    const infoDiv = document.getElementById('activeProvidersInfo');
    
    if (selectedProviders.length === 0) {
        infoDiv.className = 'active-providers-info warning';
        infoDiv.innerHTML = '⚠️ <strong>No providers selected.</strong> Please select at least one provider to submit research requests.';
    } else if (selectedProviders.length === 1) {
        infoDiv.className = 'active-providers-info warning';
        infoDiv.innerHTML = `⚠️ <strong>Only ${selectedProviders[0]} selected.</strong> For meaningful comparisons, consider selecting multiple providers.`;
    } else {
        infoDiv.className = 'active-providers-info';
        infoDiv.innerHTML = `✅ <strong>${selectedProviders.length} providers selected:</strong> ${selectedProviders.join(', ')}`;
    }
}