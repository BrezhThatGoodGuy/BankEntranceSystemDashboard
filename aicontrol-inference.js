/**
 * AI Control - Inference Display
 * - No continuous streaming; the img element is only updated when
 *   a detection fires with confidence > 70 %.
 * - Inference is polled every 3 s (only while AI system + a detector are on).
 * - Placeholder text reflects the current system state.
 */

class InferenceDisplay {
    constructor() {
        this.feedImg        = document.getElementById('esp32Feed');
        this.canvas         = document.getElementById('inferenceCanvas');
        this.ctx            = this.canvas ? this.canvas.getContext('2d') : null;
        this.feedContainer  = document.getElementById('feedContainer');
        this.feedStatus     = document.getElementById('feedStatus');

        // Inference polling interval — 3 s to avoid hogging the ESP32
        this.INFERENCE_INTERVAL_MS = 3000;
        this._inferenceTimer = null;

        this.init();
    }

    // ─── Init ────────────────────────────────────────────────────────────────

    init() {
        // Canvas sizing whenever the img actually loads a real frame
        this.feedImg.onload = () => {
            this._resizeCanvas();
            this.updateFeedStatus('Connected', true);
        };
        this.feedImg.onerror = () => {
            this.updateFeedStatus('Connection Error', false);
        };

        // Show the correct initial placeholder immediately
        this._refreshPlaceholder();

        // Watch aiConfig changes so we start/stop polling dynamically
        this._watchConfig();
    }

    // ─── Config watcher ──────────────────────────────────────────────────────

    _watchConfig() {
        // Re-evaluate every 500 ms — cheap compared to network calls
        setInterval(() => this._applyConfigState(), 500);
    }

    _isDetectionActive() {
        const cfg = window.aiConfig;
        return cfg &&
               cfg.aiSystem &&
               cfg.aiSystem.enabled &&
               (cfg.aiSystem.maskedFaceDetection || cfg.aiSystem.weaponDetection);
    }

    _applyConfigState() {
        if (this._isDetectionActive()) {
            this._startPolling();
        } else {
            this._stopPolling();
            this._refreshPlaceholder();
        }
    }

    // ─── Polling ─────────────────────────────────────────────────────────────

    _startPolling() {
        if (this._inferenceTimer) return;          // already running
        this._inferenceTimer = setInterval(() => this._pollInference(), this.INFERENCE_INTERVAL_MS);
        // Kick off the first call immediately
        this._pollInference();
    }

    _stopPolling() {
        if (!this._inferenceTimer) return;
        clearInterval(this._inferenceTimer);
        this._inferenceTimer = null;
        // Hide the live image; clear canvas
        this._hideFrame();
    }

    _pollInference() {
        if (!this._isDetectionActive()) {
            this._stopPolling();
            return;
        }

        const endpoints = window.API_ENDPOINTS || {};
        const url = endpoints.INFERENCE || '/api/inference';

        fetch(url)
            .then(r => r.json())
            .then(data => this._handleInferenceData(data))
            .catch(err => console.error('[Inference] Poll error:', err));
    }

    // ─── Data handling ───────────────────────────────────────────────────────

    _handleInferenceData(data) {
        // Always update the timing readout
        this._updateTiming(data);

        const hasBBoxes = data.bounding_boxes && data.bounding_boxes.length > 0;

        if (!hasBBoxes) {
            // No threat detected
            this._hideFrame();
            this._showPlaceholderText('No Threatful Situations Detected');
            this._displayClassification(data);
            return;
        }

        // Find the highest-confidence detection
        const topBox = data.bounding_boxes.reduce((best, b) =>
            b.confidence > best.confidence ? b : best, data.bounding_boxes[0]);

        const confidencePct = topBox.confidence * 100;

        // Update the detection list panel regardless of threshold
        this._displayObjectDetection(data);

        if (confidencePct > 70) {
            // High-confidence threat — pull the stored ESP32 frame and draw boxes.
            this._fetchAndDisplayFrame(data);
        } else {
            // Below threshold — keep placeholder, still show detection info
            this._hideFrame();
            this._showPlaceholderText('No Threatful Situations Detected');
        }
    }

    // ─── Frame capture ───────────────────────────────────────────────────────

    _fetchAndDisplayFrame(inferenceData) {
        const timestamp = Date.now();
        const newImg = new Image();

        newImg.onload = () => {
            // Swap src on the visible img element
            this.feedImg.src = newImg.src;
            this.feedImg.style.display = 'block';
            this._hidePlaceholder();

            // Wait for the feedImg to register the new src dimensions
            requestAnimationFrame(() => {
                this._resizeCanvas();
                this.canvas.style.display = 'block';
                this._drawBoundingBoxes(inferenceData);
            });

            this.updateFeedStatus('Threat Detected', true);
        };

        newImg.onerror = () => {
            this._showPlaceholderText('No Threatful Situations Detected');
        };

        const endpoints = window.API_ENDPOINTS || {};
        const captureUrl = endpoints.CAPTURE || '/capture';
        newImg.src = `${captureUrl}?t=${timestamp}`;
    }

    // ─── UI helpers ──────────────────────────────────────────────────────────

    _hideFrame() {
        this.feedImg.style.display = 'none';
        if (this.canvas) this.canvas.style.display = 'none';
    }

    _hidePlaceholder() {
        const ph = document.getElementById('aiPlaceholder');
        if (ph) ph.style.display = 'none';
    }

    _showPlaceholderText(text) {
        let ph = document.getElementById('aiPlaceholder');
        if (!ph && this.feedContainer) {
            ph = document.createElement('div');
            ph.id = 'aiPlaceholder';
            ph.style.cssText = [
                'position:absolute', 'top:0', 'left:0', 'width:100%', 'height:100%',
                'display:flex', 'align-items:center', 'justify-content:center',
                'background-color:#05070a', 'color:#64748b',
                'font-size:clamp(16px,2.5vw,28px)', 'font-weight:700',
                'text-align:center', 'padding:40px',
                'z-index:5', 'border:2px dashed #1e293b',
                'border-radius:12px', 'box-sizing:border-box'
            ].join(';');
            this.feedContainer.appendChild(ph);
            this.feedContainer.style.position = 'relative';
        }
        if (ph) {
            ph.textContent = text;
            ph.style.display = 'flex';
        }
    }

    _refreshPlaceholder() {
        if (this._isDetectionActive()) {
            // Don't overwrite a live detection view; let polling handle it
            return;
        }
        this._hideFrame();
        this._showPlaceholderText('AI Threat Detectors are Disabled.');
    }

    _resizeCanvas() {
        if (!this.canvas || !this.feedImg) return;
        const rect = this.feedImg.getBoundingClientRect();
        this.canvas.width  = rect.width  || this.feedImg.naturalWidth;
        this.canvas.height = rect.height || this.feedImg.naturalHeight;
    }

    // ─── Inference result panels ─────────────────────────────────────────────

    _updateTiming(data) {
        const dsp   = (data.dsp_time            || 0).toFixed(0);
        const cls   = (data.classification_time || 0).toFixed(0);
        const total = (parseFloat(dsp) + parseFloat(cls)).toFixed(0);
        this._setText('dspTime',    dsp);
        this._setText('classTime',  cls);
        this._setText('totalTime',  total);
        this._setText('inferenceTime', total + 'ms');
    }

    _displayClassification(data) {
        const clsDiv = document.getElementById('classificationResults');
        const detDiv = document.getElementById('detectionResults');
        if (clsDiv) clsDiv.style.display = 'block';
        if (detDiv) detDiv.style.display = 'none';
        if (this.canvas) this.canvas.style.display = 'none';

        const conf = ((data.confidence || 0) * 100).toFixed(1);
        this._setText('labelName',       data.top_label || 'Unknown');
        this._setText('labelConfidence', conf + '%');

        const labelDiv = document.getElementById('topLabel');
        if (labelDiv) {
            if (conf > 75) {
                labelDiv.style.backgroundColor = '#e8f5e9';
                labelDiv.style.borderLeft = '3px solid #2e7d32';
            } else if (conf > 50) {
                labelDiv.style.backgroundColor = '#fff3e0';
                labelDiv.style.borderLeft = '3px solid #f57c00';
            } else {
                labelDiv.style.backgroundColor = '#ffebee';
                labelDiv.style.borderLeft = '3px solid #c62828';
            }
        }
    }

    _displayObjectDetection(data) {
        const clsDiv = document.getElementById('classificationResults');
        const detDiv = document.getElementById('detectionResults');
        if (clsDiv) clsDiv.style.display = 'none';
        if (detDiv) detDiv.style.display = 'block';

        const list = document.getElementById('detectionList');
        if (!list) return;
        list.innerHTML = '';

        data.bounding_boxes.forEach(bbox => {
            const conf = (bbox.confidence * 100).toFixed(1);
            const item = document.createElement('div');
            item.style.cssText = 'padding:6px;background-color:#e3f2fd;margin-bottom:4px;border-radius:3px;border-left:3px solid #1976d2;';
            item.innerHTML = `
                <div style="font-weight:bold;color:#1565c0">${bbox.label}</div>
                <div style="font-size:11px;color:#666">
                    Confidence: ${conf}%<br>
                    Position: (${bbox.x}, ${bbox.y}) &nbsp;Size: ${bbox.width}×${bbox.height}
                </div>`;
            list.appendChild(item);
        });
    }

    // ─── Bounding boxes ──────────────────────────────────────────────────────

    _drawBoundingBoxes(data) {
        if (!this.canvas || !this.ctx) return;
        if (!data.bounding_boxes || data.bounding_boxes.length === 0) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        const scaleX = this.canvas.width  / (this.feedImg.naturalWidth  || this.canvas.width);
        const scaleY = this.canvas.height / (this.feedImg.naturalHeight || this.canvas.height);

        const colors = ['#FF5733','#33FF57','#3357FF','#FF33F5','#F5FF33','#FF8C33','#33FFF5'];

        data.bounding_boxes.forEach((bbox, i) => {
            const color = colors[i % colors.length];
            const x = bbox.x * scaleX, y = bbox.y * scaleY;
            const w = bbox.width * scaleX, h = bbox.height * scaleY;
            const conf = (bbox.confidence * 100).toFixed(1);

            this.ctx.strokeStyle = color;
            this.ctx.lineWidth = 3;
            this.ctx.strokeRect(x, y, w, h);

            const label = `${bbox.label} ${conf}%`;
            this.ctx.font = 'bold 14px Arial';
            const lw = this.ctx.measureText(label).width + 10;
            const lh = 20;

            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y - lh, lw, lh);

            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.textBaseline = 'top';
            this.ctx.fillText(label, x + 5, y - lh + 2);
        });
    }

    // ─── Status & misc ───────────────────────────────────────────────────────

    updateFeedStatus(text, connected) {
        if (!this.feedStatus) return;
        this.feedStatus.textContent = text;
        this.feedStatus.style.color = connected ? '#2ecc71' : '#c62828';
    }

    _setText(id, val) {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    }
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    window.inferenceDisplay = new InferenceDisplay();
});

// Kept for any external HTML onclick handlers
function triggerAIInference() {
    if (window.inferenceDisplay) window.inferenceDisplay._pollInference();
}
