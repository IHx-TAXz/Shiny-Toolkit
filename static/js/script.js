document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');
    const historyTabs = document.querySelectorAll('.history-tab');
    const historyContents = document.querySelectorAll('.history-content');
    const sendRequestBtn = document.getElementById('send-request');
    const methodSelect = document.getElementById('method');
    const dataGroup = document.getElementById('data-group');
    const loading = document.getElementById('loading');
    const saveRequestBtn = document.getElementById('save-request');
    const saveModal = document.getElementById('save-modal');
    const confirmSaveBtn = document.getElementById('confirm-save');
    const cancelSaveBtn = document.getElementById('cancel-save');
    const loadSavedBtn = document.getElementById('load-saved');
    const loadModal = document.getElementById('load-modal');
    const cancelLoadBtn = document.getElementById('cancel-load');
    const encodeButtons = document.querySelectorAll('[data-action]');
    const encodeText = document.getElementById('encode-text');
    const encodeResult = document.getElementById('encode-result');
    const generateDataBtn = document.getElementById('generate-data');
    const generatorType = document.getElementById('generator-type');
    const generatorLength = document.getElementById('generator-length');
    const generatorResult = document.getElementById('generator-result');
    const lengthGroup = document.getElementById('length-group');
    const generateQrBtn = document.getElementById('generate-qr');
    const qrData = document.getElementById('qr-data');
    const qrImage = document.getElementById('qr-image');
    const analyzeJsonBtn = document.getElementById('analyze-json');
    const jsonInput = document.getElementById('json-input');
    const jsonAnalysisSection = document.getElementById('json-analysis');
    
    // --- UTILITY FUNCTIONS ---
    
    function showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : 'exclamation-triangle'}"></i>
            ${message}
        `;
        notification.className = `notification ${type} show`;
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 4000);
    }
    
    function formatBytes(bytes) {
        if (bytes === 0 || isNaN(bytes)) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // --- TAB NAVIGATION ---
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            navLinks.forEach(l => l.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            this.classList.add('active');
            
            const targetTab = this.getAttribute('href');
            document.querySelector(targetTab).classList.add('active');
            
            // Load data for specific tabs
            if (targetTab === '#history-tab') {
                loadRequestHistory();
                loadSavedRequests(document.getElementById('saved-requests-list'));
            }
        });
    });
    
    historyTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            historyTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            historyContents.forEach(c => c.classList.remove('active'));
            document.getElementById(`${targetTab}-requests`).classList.add('active');
        });
    });
    
    // --- HTTP CLIENT FUNCTIONALITY ---
    
    // Show/hide data field based on method
    methodSelect.addEventListener('change', function() {
        if (this.value === 'GET' || this.value === 'DELETE') {
            dataGroup.style.display = 'none';
        } else {
            dataGroup.style.display = 'block';
        }
    });
    
    // Initial state
    if (methodSelect.value === 'GET') {
        dataGroup.style.display = 'none';
    }
    
    // Send request
    sendRequestBtn.addEventListener('click', function() {
        const url = document.getElementById('url').value;
        const method = document.getElementById('method').value;
        const headers = document.getElementById('headers').value;
        const data = document.getElementById('data').value;
        
        if (!url) {
            showNotification('Please enter a URL', 'error');
            return;
        }
        
        try {
            new URL(url);
        } catch (e) {
            showNotification('Please enter a valid URL', 'error');
            return;
        }
        
        loading.classList.remove('hidden');
        
        const formData = new FormData();
        formData.append('url', url);
        formData.append('method', method);
        formData.append('headers', headers);
        formData.append('data', data);
        
        fetch('/send_request', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            loading.classList.add('hidden');
            
            if (data.error) {
                updateResponseDisplay({
                    status_code: 'Error', 
                    url: url, 
                    size: 0, 
                    time: 0, 
                    headers: {}, 
                    content: data.error
                });
                showNotification('Request Error: ' + data.error, 'error');
                return;
            }
            
            updateResponseDisplay(data);
            showNotification('Request completed successfully!', 'success');
        })
        .catch(error => {
            loading.classList.add('hidden');
            showNotification('Request failed: ' + error.message, 'error');
        });
    });
    
    function updateResponseDisplay(data) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = data.status_code;
        
        if (data.status_code >= 200 && data.status_code < 300) {
            statusElement.className = 'status-success';
        } else if (data.status_code >= 400 || data.status_code === 'Error') {
            statusElement.className = 'status-error';
        } else if (data.status_code >= 300 && data.status_code < 400) {
             statusElement.className = 'status-warning';
        } else {
            statusElement.className = 'status-default';
        }
        
        document.getElementById('response-url').textContent = data.url || '-';
        document.getElementById('response-size').textContent = formatBytes(data.size);
        document.getElementById('response-time').textContent = (data.time || 0) + 's';
        document.getElementById('response-headers').textContent = JSON.stringify(data.headers, null, 2);
        
        // Pretty-print JSON response content if possible
        try {
            const jsonContent = JSON.parse(data.content);
            document.getElementById('response-content').textContent = JSON.stringify(jsonContent, null, 2);
        } catch (e) {
            document.getElementById('response-content').textContent = data.content;
        }
    }
    
    // --- SAVE/LOAD REQUESTS ---
    
    saveRequestBtn.addEventListener('click', function() {
        saveModal.classList.remove('hidden');
        document.getElementById('request-name').value = '';
    });
    
    confirmSaveBtn.addEventListener('click', function() {
        const name = document.getElementById('request-name').value;
        if (!name) {
            showNotification('Please enter a request name', 'error');
            return;
        }
        
        const requestData = {
            name: name,
            method: document.getElementById('method').value,
            url: document.getElementById('url').value,
            headers: document.getElementById('headers').value,
            data: document.getElementById('data').value
        };
        
        fetch('/save_request', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                showNotification('Error saving request: ' + data.error, 'error');
            } else {
                showNotification('Request saved successfully!', 'success');
                saveModal.classList.add('hidden');
            }
        })
        .catch(error => {
            showNotification('Error saving request: ' + error.message, 'error');
        });
    });
    
    cancelSaveBtn.addEventListener('click', () => saveModal.classList.add('hidden'));
    
    loadSavedBtn.addEventListener('click', function() {
        loadSavedRequests(document.getElementById('saved-requests-modal'), true);
        loadModal.classList.remove('hidden');
    });
    
    cancelLoadBtn.addEventListener('click', () => loadModal.classList.add('hidden'));
    
    function loadSavedRequests(container, isModal = false) {
        fetch('/get_saved_requests')
            .then(response => response.json())
            .then(requests => {
                container.innerHTML = '';
                
                if (requests.length === 0) {
                    container.innerHTML = '<p>No saved requests found.</p>';
                    return;
                }
                
                requests.forEach(req => {
                    const item = document.createElement('div');
                    item.className = isModal ? 'saved-request-item' : 'request-item';
                    
                    const loadButton = isModal ? 
                        `<button class="btn-secondary" onclick="loadRequest('${req.id}')" style="padding: 5px 10px; font-size: 12px; margin-left: 10px;">
                            <i class="fas fa-upload"></i> Load
                        </button>` :
                        `<div style="margin-top: 10px;">
                            <button class="btn-secondary" onclick="loadRequest('${req.id}')" style="padding: 5px 10px; font-size: 12px;">
                                <i class="fas fa-upload"></i> Load
                            </button>
                        </div>`;

                    item.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${req.name}</strong>
                                <div>
                                    <span class="request-method method-${req.method.toLowerCase()}">${req.method}</span>
                                    <span class="request-url">${req.url}</span>
                                </div>
                                <div class="request-time">
                                    Saved: ${new Date(req.created_at).toLocaleString()}
                                </div>
                            </div>
                            ${loadButton}
                        </div>
                    `;
                    container.appendChild(item);
                });
            })
            .catch(error => {
                container.innerHTML = '<p class="status-error">Error loading saved requests.</p>';
                console.error('Error loading saved requests:', error);
            });
    }
    
    // Global function to load a request into the form
    window.loadRequest = function(requestId) {
        fetch('/get_saved_requests')
            .then(response => response.json())
            .then(requests => {
                const request = requests.find(req => req.id === requestId);
                if (request) {
                    document.getElementById('method').value = request.method;
                    document.getElementById('url').value = request.url;
                    document.getElementById('headers').value = request.headers;
                    document.getElementById('data').value = request.data || '';
                    
                    // Update data group visibility
                    methodSelect.dispatchEvent(new Event('change'));
                    
                    loadModal.classList.add('hidden');
                    showNotification('Request loaded successfully!', 'success');
                    
                    // Switch to request tab (if not already there)
                    document.querySelector('[href="#request-tab"]').click();
                }
            })
            .catch(error => {
                showNotification('Error loading request: ' + error.message, 'error');
            });
    };
    
    function loadRequestHistory() {
        fetch('/get_request_history')
            .then(response => response.json())
            .then(history => {
                const container = document.getElementById('recent-requests-list');
                container.innerHTML = '';
                
                if (history.length === 0) {
                    container.innerHTML = '<p>No recent requests found.</p>';
                    return;
                }
                
                history.forEach(item => {
                    const requestItem = document.createElement('div');
                    requestItem.className = 'request-item';
                    requestItem.innerHTML = `
                        <div>
                            <span class="request-method method-${item.method.toLowerCase()}">${item.method}</span>
                            <span class="request-url">${item.url}</span>
                            <div class="request-time">
                                ${new Date(item.timestamp).toLocaleString()} • 
                                Status: <span class="status-${item.status_code >= 200 && item.status_code < 300 ? 'success' : item.status_code >= 400 ? 'error' : 'warning'}">${item.status_code}</span>
                            </div>
                        </div>
                    `;
                    container.appendChild(requestItem);
                });
            })
            .catch(error => {
                document.getElementById('recent-requests-list').innerHTML = '<p class="status-error">Error loading request history.</p>';
                console.error('Error loading request history:', error);
            });
    }
    
    // --- ENCODE/DECODE FUNCTIONALITY ---
    
    encodeButtons.forEach(button => {
        button.addEventListener('click', function() {
            const text = encodeText.value;
            const action = this.getAttribute('data-action');
            
            if (!text) {
                showNotification('Please enter some text', 'error');
                return;
            }
            
            loading.classList.remove('hidden');
            
            const formData = new FormData();
            formData.append('text', text);
            formData.append('action', action);
            
            fetch('/encode_decode', { method: 'POST', body: formData })
            .then(response => response.json())
            .then(data => {
                loading.classList.add('hidden');
                
                if (data.error) {
                    encodeResult.value = '';
                    showNotification('Error: ' + data.error, 'error');
                    return;
                }
                
                encodeResult.value = data.result;
                showNotification('Operation completed successfully!', 'success');
            })
            .catch(error => {
                loading.classList.add('hidden');
                showNotification('Operation failed: ' + error.message, 'error');
            });
        });
    });
    
    // --- DATA GENERATOR FUNCTIONALITY ---
    
    // Show/hide length field based on type
    generatorType.addEventListener('change', function() {
        if (this.value === 'password' || this.value === 'lorem_ipsum') {
            lengthGroup.style.display = 'block';
        } else {
            lengthGroup.style.display = 'none';
        }
    });
    generatorType.dispatchEvent(new Event('change')); // Initial check

    generateDataBtn.addEventListener('click', function() {
        const type = generatorType.value;
        const length = generatorLength.value;
        
        loading.classList.remove('hidden');
        
        fetch('/generate_data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: type, length: parseInt(length) })
        })
        .then(response => response.json())
        .then(data => {
            loading.classList.add('hidden');
            
            if (data.error) {
                generatorResult.value = '';
                showNotification('Error: ' + data.error, 'error');
                return;
            }
            
            generatorResult.value = data.result;
            showNotification('Data generated successfully!', 'success');
        })
        .catch(error => {
            loading.classList.add('hidden');
            showNotification('Generation failed: ' + error.message, 'error');
        });
    });
    
    // --- QR CODE GENERATOR ---
    
    generateQrBtn.addEventListener('click', function() {
        const data = qrData.value;
        
        if (!data) {
            showNotification('Please enter data for QR code', 'error');
            qrImage.style.display = 'none';
            return;
        }
        
        loading.classList.remove('hidden');
        
        const formData = new FormData();
        formData.append('data', data);
        
        fetch('/generate_qr', { method: 'POST', body: formData })
        .then(response => {
            if (!response.ok) {
                return response.json().then(error => { throw new Error(error.error); });
            }
            return response.blob();
        })
        .then(blob => {
            loading.classList.add('hidden');
            const url = URL.createObjectURL(blob);
            qrImage.src = url;
            qrImage.style.display = 'block';
            showNotification('QR code generated successfully!', 'success');
        })
        .catch(error => {
            loading.classList.add('hidden');
            showNotification('QR generation failed: ' + error.message, 'error');
        });
    });
    
    // --- JSON ANALYZER ---
    
    analyzeJsonBtn.addEventListener('click', function() {
        const jsonText = jsonInput.value;
        
        if (!jsonText) {
            showNotification('Please enter JSON to analyze', 'error');
            jsonAnalysisSection.classList.add('hidden');
            return;
        }
        
        loading.classList.remove('hidden');
        
        const formData = new FormData();
        formData.append('json_text', jsonText);
        
        fetch('/analyze_json', { method: 'POST', body: formData })
        .then(response => response.json())
        .then(data => {
            loading.classList.add('hidden');
            
            if (data.error) {
                displayJsonAnalysis({ error: data.error });
                showNotification('JSON Analysis Error: ' + data.error, 'error');
                return;
            }
            
            displayJsonAnalysis(data);
            showNotification('JSON analyzed successfully!', 'success');
        })
        .catch(error => {
            loading.classList.add('hidden');
            showNotification('Analysis failed: ' + error.message, 'error');
        });
    });
    
    function displayJsonAnalysis(data) {
        const statsElement = document.getElementById('analysis-stats');
        const detailsElement = document.getElementById('analysis-details');
        
        if (data.error) {
            jsonAnalysisSection.classList.remove('hidden');
            statsElement.innerHTML = `
                <div style="text-align: center; padding: 15px; background: var(--error-color); border-radius: 8px; grid-column: 1 / -1;">
                    <div style="font-size: 1.2em; font-weight: bold; color: white;">Invalid JSON</div>
                    <div style="font-size: 0.9em;">${data.error}</div>
                </div>
            `;
            detailsElement.innerHTML = '<p>Could not parse JSON structure due to errors.</p>';
            return;
        }

        jsonAnalysisSection.classList.remove('hidden');
        
        // Display stats
        statsElement.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
                <div style="text-align: center; padding: 15px; background: var(--accent-color); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--highlight-color);">${data.analysis.length}</div>
                    <div>Total Properties</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--accent-color); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--highlight-color);">${formatBytes(data.size)}</div>
                    <div>Size</div>
                </div>
                <div style="text-align: center; padding: 15px; background: var(--accent-color); border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--success-color);">Valid</div>
                    <div>JSON</div>
                </div>
            </div>
        `;
        
        // Display details
        detailsElement.innerHTML = '';
        data.analysis.forEach(item => {
            const structureItem = document.createElement('div');
            structureItem.className = 'structure-item';
            structureItem.innerHTML = `
                <span class="structure-path">${item.path}</span>
                <span class="structure-type">(${item.type})</span>
                <span>${item.value}</span>
            `;
            detailsElement.appendChild(structureItem);
        });
    }
    
    // --- INITIALIZATION & UTILITIES ---

    // Auto-resize textareas
    const textareas = document.querySelectorAll('textarea');
    textareas.forEach(textarea => {
        const resize = function() {
            this.style.height = 'auto';
            // Set minimum height to match CSS min-height for clean look
            const minHeight = parseInt(window.getComputedStyle(this).getPropertyValue('min-height').replace('px', '')) || 120;
            this.style.height = (this.scrollHeight > minHeight ? this.scrollHeight : minHeight) + 'px';
        };

        textarea.addEventListener('input', resize);
        
        // Initial resize for pre-filled content
        resize.call(textarea);
    });
    
    // Default form data for demonstration
    document.getElementById('headers').value = JSON.stringify({
        "User-Agent": "Shiny-Portal/1.0",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }, null, 2);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === saveModal) { saveModal.classList.add('hidden'); }
        if (e.target === loadModal) { loadModal.classList.add('hidden'); }
    });
    
    // Initialize the app (load history/saved requests for the first view)
    loadRequestHistory();
    loadSavedRequests(document.getElementById('saved-requests-list'));
});
